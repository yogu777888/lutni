/**
 * Слой данных сайта: всё, что страницы берут из SStats, проходит здесь —
 * через кэш (SWR + диск) и лимитер запросов. TTL зависит от статуса матча:
 * live обновляем раз в минуту, завершённые храним сутками.
 */
import { featuredRank, isFeatured } from '@/config/leagues'
import { BANK_DAYS, buildBank, type Bank } from './bank'
import { cache, type CacheOptions } from './cache'
import { addDays, diffDays, todayYmd, tzOffsetHours, ymdInTz, ymdToNoonTs } from './format'
import { buildCandidates, buildConsensus, buildModel, choosePick, type Candidate, type Consensus, type ModelOutput, type Pick } from './model'
import type { BookOdds } from './odds'
import { buildPreview, type Paragraph } from './preview'
import type { Priority } from './rate-limit'
import { singleton } from './runtime'
import { ApiError, apiGet, IS_MOCK } from './sstats/client'
import * as N from './sstats/normalize'
import type {
  RawBookmakerOdds,
  RawGame,
  RawGameFull,
  RawGameGlicko,
  RawInjury,
  RawLeagueWithSeasons,
  RawStandings,
} from './sstats/types'
import { buildForm, buildH2H, type H2H, type TeamForm } from './stats'
import { computeTags, type TagHit } from './tags'
import type { Glicko, Injury, LeagueInfo, Match, MatchFull, Standings, Team } from './types'
import { backfillValuePick, logValuePick, valuePicksFor, type LoggedPick } from './value-log'

export type Opts = { priority?: Priority }

const H = 3600

/** Выполнить промис, а при ошибке вернуть запасное значение. */
export async function settle<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p
  } catch {
    return fallback
  }
}

const byTime = (a: Match, b: Match) => a.ts - b.ts || a.id - b.id

/** Сколько держать данные матча в кэше — по его статусу. */
function matchTtl(m: Match | null | undefined): CacheOptions {
  if (!m) return { ttl: 300, stale: 600 }
  const now = Date.now()
  if (m.status === 'live' || m.status === 'suspended') return { ttl: 45, stale: 90 }
  if (m.status === 'scheduled') {
    const until = m.ts - now
    if (until < 0) return { ttl: 60, stale: 120 } // вот-вот начнётся
    return until < 3 * H * 1000 ? { ttl: 300, stale: 900 } : { ttl: 1800, stale: 2 * H }
  }
  const since = now - m.ts
  return since < 4 * H * 1000 ? { ttl: 600, stale: 1800 } : { ttl: 24 * H, stale: 6 * 24 * H }
}

// ─── Списки матчей ───────────────────────────────────────────────────────────

export async function getMatchesByDate(ymd: string, opts: Opts = {}): Promise<Match[]> {
  const tz = tzOffsetHours(undefined, ymdToNoonTs(ymd))
  const d = diffDays(ymd, todayYmd())
  const ttl: CacheOptions =
    d === 0 ? { ttl: 60, stale: 300 } : d > 0 ? { ttl: 900, stale: 2 * H } : d === -1 ? { ttl: 1800, stale: 2 * H } : { ttl: 12 * H, stale: 24 * H }
  return cache.get(
    `games:date:${ymd}:${tz}`,
    async () => {
      const out: Match[] = []
      for (let offset = 0; offset < 3000; offset += 1000) {
        const page = await apiGet<RawGame[]>(
          '/Games/list',
          { Date: ymd, TimeZone: tz, Limit: 1000, Offset: offset || undefined },
          opts,
        )
        out.push(...(page ?? []).map((g) => N.normalizeGame(g, tz)))
        if (!page || page.length < 1000) break
      }
      return out.sort(byTime)
    },
    ttl,
  )
}

/** Прошедшие матчи двух команд (до даты матча) — для формы. */
export async function getTeamGames(homeId: number, awayId: number, beforeYmd: string, opts: Opts = {}): Promise<Match[]> {
  const tz = tzOffsetHours()
  const past = diffDays(beforeYmd, todayYmd()) < 0
  return cache.get(
    `games:teams:${homeId},${awayId}:${beforeYmd}`,
    async () =>
      (
        (await apiGet<RawGame[]>(
          '/Games/list',
          { Team: `${homeId},${awayId}`, Ended: true, Limit: 40, Order: -1, To: beforeYmd, TimeZone: tz },
          opts,
        )) ?? []
      ).map((g) => N.normalizeGame(g, tz)),
    past ? { ttl: 7 * 24 * H } : { ttl: 6 * H, stale: 24 * H },
  )
}

export async function getH2HGames(homeId: number, awayId: number, beforeYmd: string, opts: Opts = {}): Promise<Match[]> {
  const tz = tzOffsetHours()
  const [a, b] = [homeId, awayId].sort((x, y) => x - y)
  return cache.get(
    `games:h2h:${a},${b}:${beforeYmd}`,
    async () =>
      (
        (await apiGet<RawGame[]>(
          '/Games/list',
          { BothTeams: `${a},${b}`, Ended: true, Limit: 10, Order: -1, To: beforeYmd, TimeZone: tz },
          opts,
        )) ?? []
      ).map((g) => N.normalizeGame(g, tz)),
    { ttl: 24 * H, stale: 3 * 24 * H },
  )
}

/** Все матчи сезона лиги: и расписание, и результаты, и справочник команд для таблицы. */
export async function getSeasonGames(leagueId: number, year: number, opts: Opts = {}): Promise<Match[]> {
  const tz = tzOffsetHours()
  return cache.get(
    `games:season:${leagueId}:${year}`,
    async () => {
      const out: Match[] = []
      for (let offset = 0; offset < 3000; offset += 1000) {
        const page = await apiGet<RawGame[]>(
          '/Games/list',
          { LeagueId: leagueId, Year: year, Limit: 1000, Offset: offset || undefined, TimeZone: tz },
          opts,
        )
        out.push(...(page ?? []).map((g) => N.normalizeGame(g, tz)))
        if (!page || page.length < 1000) break
      }
      return out.sort(byTime)
    },
    (games) => (games.some((g) => g.status === 'live') ? { ttl: 120, stale: 600 } : { ttl: 1800, stale: 6 * H }),
  )
}

// ─── Матч ────────────────────────────────────────────────────────────────────

export async function getMatchFull(id: number, opts: Opts = {}): Promise<MatchFull | null> {
  const tz = tzOffsetHours()
  try {
    return await cache.get(
      `game:${id}`,
      async () => N.normalizeFull(await apiGet<RawGameFull>(`/Games/${id}`, { TimeZone: tz }, opts), tz),
      (full) => matchTtl(full.match),
    )
  } catch (err) {
    const e = err as ApiError
    if (e.status === 404 || e.status === 400 || /not found|не найден/i.test(e.message)) return null
    throw err
  }
}

export async function getOdds(m: Match, opts: Opts = {}): Promise<BookOdds[]> {
  return cache.get(
    `odds:${m.id}`,
    async () =>
      N.normalizeBookOdds(await apiGet<RawBookmakerOdds[]>(`/Odds/${m.id}`, {}, opts), {
        home: m.home.original,
        away: m.away.original,
      }),
    matchTtl(m),
  )
}

export async function getGlicko(m: Match, opts: Opts = {}): Promise<Glicko | null> {
  return cache.get(
    `glicko:${m.id}`,
    async () => N.normalizeGlicko(await apiGet<RawGameGlicko>(`/Games/glicko/${m.id}`, {}, opts)),
    m.status === 'finished' ? { ttl: 7 * 24 * H } : { ttl: 3 * H, stale: 12 * H },
  )
}

export async function getInjuries(m: Match, opts: Opts = {}): Promise<Injury[]> {
  return cache.get(
    `injuries:${m.id}`,
    async () => N.normalizeInjuries(await apiGet<RawInjury[]>('/Games/injuries', { gameId: m.id }, opts)),
    m.status === 'scheduled' ? { ttl: 3 * H, stale: 12 * H } : { ttl: 7 * 24 * H },
  )
}

// ─── Лиги и таблицы ──────────────────────────────────────────────────────────

export async function getLeagues(opts: Opts = {}): Promise<LeagueInfo[]> {
  return cache.get(
    'leagues',
    async () => N.normalizeLeagues(await apiGet<RawLeagueWithSeasons[]>('/Leagues', {}, opts)),
    { ttl: 24 * H, stale: 6 * 24 * H },
  )
}

export async function getLeague(id: number, opts: Opts = {}): Promise<LeagueInfo | null> {
  const all = await getLeagues(opts)
  return all.find((l) => l.id === id) ?? null
}

/** Текущий сезон: тот, в чьи даты попадает сегодня, иначе самый свежий. */
export function currentSeason(l: LeagueInfo): number | null {
  const today = todayYmd()
  const hit = l.seasons.find((s) => s.start && s.end && s.start.slice(0, 10) <= today && today <= s.end.slice(0, 10))
  return hit?.year ?? l.seasons[0]?.year ?? null
}

export function teamsFromGames(games: Match[]): Map<number, Team> {
  const map = new Map<number, Team>()
  for (const g of games) {
    map.set(g.home.id, g.home)
    map.set(g.away.id, g.away)
  }
  return map
}

export async function getStandings(leagueId: number, year: number, opts: Opts = {}): Promise<Standings | null> {
  const [raw, games] = await Promise.all([
    cache.get(
      `standings:${leagueId}:${year}`,
      () => apiGet<RawStandings>('/Seasons/standings', { leagueId, year }, opts),
      { ttl: 1800, stale: 6 * H },
    ),
    settle(getSeasonGames(leagueId, year, opts), []),
  ])
  const st = N.normalizeStandings(raw, teamsFromGames(games))
  return st.groups.length ? st : null
}

// ─── Инсайты матча: модель, прогноз, теги, текст ─────────────────────────────

export type MatchSummary = {
  id: number
  tags: TagHit[]
  pick: {
    key: string
    label: string
    prob: number
    odd: number | null
    bookmaker: string | null
    partnerSlug: string | null
    ev: number | null
    kind: Pick['kind']
  } | null
  at: number
}

export type MatchInsights = {
  full: MatchFull
  match: Match
  books: BookOdds[]
  cons: Consensus
  glicko: Glicko | null
  model: ModelOutput | null
  candidates: Candidate[]
  pick: Pick | null
  homeForm: TeamForm | null
  awayForm: TeamForm | null
  h2h: H2H | null
  injuries: Injury[]
  standings: Standings | null
  tags: TagHit[]
  preview: Paragraph[]
}

const MARKET_BOOK = 'Среднее по рынку'

/** Модель по линии — одна и та же для страницы матча и досчёта журнала «Выгодно». */
function modelFor(m: Match, books: BookOdds[], glicko: Glicko | null) {
  // если полной линии нет — используем короткие кэфы из списка матчей
  const consensusBooks = books.length ? books : m.odds ? [{ bookmakerId: 0, bookmakerName: MARKET_BOOK, ...m.odds }] : []
  const cons = buildConsensus(consensusBooks)
  const model = buildModel(cons, glicko)
  return { cons, model, candidates: buildCandidates(books, model) }
}

/** Подсказка для лент и плиток: кэф — лучший партнёрский, если он есть. */
function summaryPick(pick: Pick | null): MatchSummary['pick'] {
  if (!pick) return null
  const c = pick.candidate
  const o = c.bestPartner ?? c.best
  return {
    key: c.key,
    label: c.label,
    prob: c.prob,
    odd: o?.value ?? null,
    bookmaker: o ? (o.partner?.name ?? o.bookmakerName) : null,
    partnerSlug: o?.partner?.slug ?? null,
    ev: c.ev,
    kind: pick.kind,
  }
}

/** Готовые инсайты держим в памяти 30 с: страница матча не пересчитывает модель на каждый запрос. */
export function getMatchInsights(id: number, opts: Opts = {}): Promise<MatchInsights | null> {
  return cache.get(`insights:${id}`, () => computeMatchInsights(id, opts), { ttl: 30, stale: 60 }, false)
}

async function computeMatchInsights(id: number, opts: Opts): Promise<MatchInsights | null> {
  const full = await getMatchFull(id, opts)
  if (!full) return null
  const m = full.match
  const before = ymdInTz(m.ts)
  const [books, glicko, teamGames, h2hGames, injuries, standings] = await Promise.all([
    settle(getOdds(m, opts), [] as BookOdds[]),
    settle(getGlicko(m, opts), null),
    settle(getTeamGames(m.home.id, m.away.id, before, opts), [] as Match[]),
    settle(getH2HGames(m.home.id, m.away.id, before, opts), [] as Match[]),
    m.status === 'finished' ? ([] as Injury[]) : settle(getInjuries(m, opts), [] as Injury[]),
    m.season?.year ? settle(getStandings(m.league.id, m.season.year, opts), null) : null,
  ])

  const { cons, model, candidates } = modelFor(m, books, glicko)
  const pick = m.status === 'scheduled' ? choosePick(candidates) : null
  const homeForm = buildForm(m.home.id, teamGames)
  const awayForm = buildForm(m.away.id, teamGames)
  const h2h = buildH2H(m.home.id, m.away.id, h2hGames)
  const tags = computeTags({
    match: m,
    cons,
    model,
    candidates: m.status === 'scheduled' ? candidates : [],
    pick,
    homeForm,
    awayForm,
    h2h,
    injuries,
    standings,
  })
  const preview = buildPreview({ full, cons, model, pick, glicko, homeForm, awayForm, h2h, injuries, standings, tags })

  const summary: MatchSummary = { id, tags, pick: summaryPick(pick), at: Date.now() }
  cache.set(`summary:${id}`, summary, { ttl: 3 * H, stale: 9 * H, persist: false })
  // журнал «Выгодно»: подсказка есть только до начала матча — запоминаем последнюю
  const sp = summary.pick
  if (sp?.kind === 'value' && sp.odd) logValuePick({ id, ts: m.ts, key: sp.key, label: sp.label, odd: sp.odd })

  return { full, match: m, books, cons, glicko, model, candidates, pick, homeForm, awayForm, h2h, injuries, standings, tags, preview }
}

/** Теги из списка матчей: по коротким кэфам + «глубокие», если матч уже разобран. */
export function tagsFor(m: Match): { tags: TagHit[]; summary: MatchSummary | null } {
  const summary = cache.peek<MatchSummary>(`summary:${m.id}`) ?? null
  if (summary) return { tags: summary.tags, summary }
  if (!m.odds || m.status === 'finished') return { tags: [], summary: null }
  const cons = buildConsensus([{ bookmakerId: 0, bookmakerName: MARKET_BOOK, ...m.odds }])
  return { tags: computeTags({ match: m, cons }), summary: null }
}

// ─── Ленты ───────────────────────────────────────────────────────────────────

export type FeedItem = { match: Match; tags: TagHit[]; summary: MatchSummary | null }

/** Матчи на несколько дней вперёд с тегами (для страниц тегов и главной). */
export async function getUpcomingFeed(days = 3, opts: Opts = {}): Promise<{ items: FeedItem[]; ok: boolean }> {
  const today = todayYmd()
  const results = await Promise.allSettled(
    Array.from({ length: days }, (_, i) => getMatchesByDate(addDays(today, i), opts)),
  )
  const ok = results.some((r) => r.status === 'fulfilled')
  const now = Date.now()
  const items = results
    .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .filter((m) => m.status === 'scheduled' || m.status === 'live')
    .filter((m) => m.ts > now - 3 * H * 1000)
    .map((m) => ({ match: m, ...tagsFor(m) }))
  return { items, ok }
}

export function featuredFirst(a: Match, b: Match) {
  const ra = featuredRank(a.league)
  const rb = featuredRank(b.league)
  const fa = ra < 0 ? 999 : ra
  const fb = rb < 0 ? 999 : rb
  return fa - fb || a.ts - b.ts
}

// ─── «Выгодные ставки» рублями ───────────────────────────────────────────────

/** Банк «по 1000 ₽ на каждую выгодную ставку» за сегодня и 6 прошлых дней — по журналу подсказок (lib/bank.ts). */
export async function getValueBank(opts: Opts = {}): Promise<Bank | null> {
  const today = todayYmd()
  const lists = await Promise.all(
    Array.from({ length: BANK_DAYS }, (_, i) => settle(getMatchesByDate(addDays(today, i - BANK_DAYS + 1), opts), [] as Match[])),
  )
  const matches = new Map(lists.flat().map((m) => [m.id, m]))
  if (IS_MOCK) await backfillDemoPicks([...matches.values()], opts)
  return buildBank(await valuePicksFor(matches.keys()), matches)
}

const demo = singleton('value-demo', () => ({ done: new Set<number>(), running: null as Promise<void> | null }))

/**
 * Демо: сервер не работал, пока шли прошедшие матчи, — их подсказки досчитываем задним числом,
 * той же моделью по той же линии, как их показал бы сайт до начала. На реальных данных журнал
 * пишется только до начала матча (computeMatchInsights), задним числом — никогда.
 * Модель — ~80 мс на матч, поэтому досчёт идёт в фоне (его запускает и прогрев), подсказки
 * хранятся в кэше на диске, а страница ждёт его не дольше пары секунд.
 */
async function backfillDemoPicks(matches: Match[], opts: Opts) {
  const todo = matches.filter((m) => m.status !== 'scheduled' && isFeatured(m.league) && !demo.done.has(m.id))
  if (!todo.length) return
  demo.running ??= (async () => {
    try {
      for (const m of todo) {
        const p = await cache.get(`demo-pick:${m.id}`, () => demoPick(m, opts), { ttl: 7 * 24 * H })
        if (p) await backfillValuePick(p)
        demo.done.add(m.id)
      }
    } finally {
      demo.running = null
    }
  })()
  await Promise.race([demo.running, new Promise((r) => setTimeout(r, 2000).unref?.())])
}

async function demoPick(m: Match, opts: Opts): Promise<LoggedPick | null> {
  const [books, glicko] = await Promise.all([settle(getOdds(m, opts), [] as BookOdds[]), settle(getGlicko(m, opts), null)])
  const p = summaryPick(choosePick(modelFor(m, books, glicko).candidates))
  return p?.kind === 'value' && p.odd ? { id: m.id, ts: m.ts, key: p.key, label: p.label, odd: p.odd, at: m.ts - 3 * H * 1000 } : null
}
