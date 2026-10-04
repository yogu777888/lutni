/**
 * Слой данных сайта: всё, что страницы берут из SStats, проходит здесь —
 * через кэш (SWR + диск) и лимитер запросов. TTL зависит от статуса матча:
 * live обновляем раз в минуту, завершённые храним сутками.
 */
import { featuredRank } from '@/config/leagues'
import { cache, type CacheOptions } from './cache'
import { CHANCE_DAYS, chanceCheck, mergeTallies, tallyChances, type ChanceCheck, type ChanceTally } from './chance-check'
import { addDays, diffDays, todayYmd, tzOffsetHours, ymdInTz, ymdToNoonTs } from './format'
import { buildCandidates, buildConsensus, buildModel, choosePick, type Candidate, type Consensus, type ModelOutput, type Pick } from './model'
import type { BookOdds } from './odds'
import { buildPreview, type Paragraph } from './preview'
import type { Priority } from './rate-limit'
import { ApiError, apiGet } from './sstats/client'
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
import { buildForm, buildH2H, type H2H, type Res, type TeamForm } from './stats'
import { computeTags, type TagHit } from './tags'
import type { Glicko, Injury, LeagueInfo, Match, MatchFull, Standings, Team } from './types'

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
  /** последние 5 результатов команд (свежие первыми) — для графика «Форма» в «Главных матчах» */
  form?: { home: Res[]; away: Res[] } | null
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

  const form = homeForm && awayForm ? { home: homeForm.last5, away: awayForm.last5 } : null
  const summary: MatchSummary = { id, tags, form, pick: summaryPick(pick), at: Date.now() }
  cache.set(`summary:${id}`, summary, { ttl: 3 * H, stale: 9 * H, persist: false })

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

// ─── «Проверка шансов» ───────────────────────────────────────────────────────

/** Итоги одного прошедшего дня для «Проверки шансов» — маленькие, хранятся долго: прошлое не меняется. */
function chanceDay(ymd: string, opts: Opts): Promise<ChanceTally> {
  const recent = diffDays(ymd, todayYmd()) >= -2
  return cache.get(`chance-day:${ymd}`, async () => tallyChances(await getMatchesByDate(ymd, opts)), recent ? { ttl: 6 * H, stale: 24 * H } : { ttl: 7 * 24 * H })
}

/** Сбываются ли шансы на сайте: 30 дней до сегодняшнего, по корзинам «около 10% … 90%» (lib/chance-check.ts). */
export async function getChanceCheck(opts: Opts = {}): Promise<ChanceCheck | null> {
  const today = todayYmd()
  return cache.get(
    `chance-check:${today}`,
    async () => {
      const days = await Promise.all(
        Array.from({ length: CHANCE_DAYS }, (_, i) => settle(chanceDay(addDays(today, -1 - i), opts), null)),
      )
      const ok = days.filter((d): d is ChanceTally => d !== null)
      return chanceCheck(mergeTallies(ok), ok.length)
    },
    { ttl: 3 * H, stale: 24 * H },
  )
}

/**
 * Матчи соседнего дня для чипа «Вчера / Завтра» в «Главных матчах»: из кэша — сразу (оба дня греет
 * прогрев и «Проверка шансов»), на холодном старте страница ждёт не дольше полутора секунд — дальше без них.
 */
export async function peekMatchesByDate(ymd: string, ms = 1500): Promise<Match[]> {
  const run = settle(getMatchesByDate(ymd), [] as Match[])
  return Promise.race([run, new Promise<Match[]>((r) => setTimeout(() => r([]), ms).unref?.())])
}

/**
 * Для главной: на холодном старте 30 дней матчей — десятки запросов к API, поэтому страница ждёт
 * не дольше полутора секунд, а расчёт доходит в фоне (его же запускает прогрев) — к следующему открытию.
 */
export async function peekChanceCheck(): Promise<ChanceCheck | null> {
  const run = settle(getChanceCheck({ priority: 'low' }), null)
  return Promise.race([run, new Promise<null>((r) => setTimeout(() => r(null), 1500).unref?.())])
}
