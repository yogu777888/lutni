/**
 * Слой данных сайта: всё, что страницы берут из SStats, проходит здесь —
 * через кэш (SWR + диск) и лимитер запросов. TTL зависит от статуса матча:
 * live обновляем раз в минуту, завершённые храним сутками.
 */
import { featuredRank, isFeatured } from '@/config/leagues'
import { partnerForApiBookmaker } from '@/config/bookmakers'
import { cache, type CacheOptions } from './cache'
import { CHANCE_DAYS, chanceCheck, mergeTallies, tallyChances, type ChanceCheck, type ChanceTally } from './chance-check'
import { addDays, appNow, diffDays, todayYmd, tzOffsetHours, ymdInTz, ymdToNoonTs } from './format'
import { buildCandidates, buildConsensus, buildModel, choosePick, valueThreshold, type Candidate, type Consensus, type ModelOutput, type Pick } from './model'
import { fair1x2, fairTwoWay, type BookOdds } from './odds'
import type { OddsSnap } from './lines'
import { buildPreview, type Paragraph } from './preview'
import { readForecasts, recordForecast, settleForecasts } from './forecast-log'
import { trackRecord, type Forecast, type TrackRecord } from './track-record'
import { leagueTitle } from './flags'
import { matchHref } from './links'
import type { Priority } from './rate-limit'
import { ApiError, IS_MOCK, apiGet } from './sstats/client'
import * as N from './sstats/normalize'
import { normalizePariMatch, pariBook, pariHistory, type PariHistory, type PariMatch, type RawPariMatch, type RawPariSnapshot } from './sstats/pari'
import { linkPari } from './pari-link'
import { findLsGame, lsPeriods, lsReds, lsStats, normalizeLineups, normalizeMomentum, type LsExtra, type RawLsGame, type RawLsInfo, type RawLsLineups, type RawLsMomentum } from './sstats/ls'
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
import { teamFacts, type Fact } from './facts'
import { teamXg, type GameXg, type TeamXg } from './team-xg'
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
  const now = appNow()
  if (m.status === 'live' || m.status === 'suspended') return { ttl: 60, stale: 120 }
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
      // в кэше лежит уже разобранный матч, и у сыгранных старый разбор жил бы ещё неделю: v2 — события VAR больше не
      // голы и не карточки (`eventKind`), v3 — тур по-русски («Clausura - 11» → «Клаусура, 11-й тур», `ruRound`),
      // v4 — у команд id во Flashscore (`flash`): по нему ищем составы и давление (`getLsExtra`)
      `game:v4:${id}`,
      async () => N.normalizeFull(await apiGet<RawGameFull>(`/Games/${id}`, { TimeZone: tz }, opts), tz),
      (full) => matchTtl(full.match),
    )
  } catch (err) {
    const e = err as ApiError
    if (e.status === 404 || e.status === 400 || /not found|не найден/i.test(e.message)) return null
    throw err
  }
}

/**
 * Коэффициенты всех букмекеров на матч и момент, когда мы их взяли (`at`): своего времени обновления у доматчевых
 * кэфов SStats нет, а подписи «линия на 19:25» и «до 19:25» нужны честные. После начала матча API отдаёт кэфы закрытия.
 */
export async function getOddsSnap(m: Match, opts: Opts = {}): Promise<OddsSnap> {
  return cache.get(
    `odds-snap:${m.id}`,
    async () => {
      const books = N.normalizeBookOdds(await apiGet<RawBookmakerOdds[]>(`/Odds/${m.id}`, {}, opts), {
        home: m.home.original,
        away: m.away.original,
      })
      // PARI — легальный партнёр, в /Odds его нет: доматчевую линию берём из /Pari (только пока матч не начался —
      // после начала там live-кэфы, а снимок линии — доматчевый)
      const pari = m.status === 'scheduled' ? await settle(pariFor(m, opts), null) : null
      const pb = pari?.status === 'scheduled' ? pariBook(pari) : null
      return { books: pb ? [...books.filter((b) => !/\bpari\b/i.test(b.bookmakerName)), pb] : books, at: appNow() }
    },
    matchTtl(m),
  )
}

export async function getOdds(m: Match, opts: Opts = {}): Promise<BookOdds[]> {
  return (await getOddsSnap(m, opts)).books
}

/** Снимок линии из памяти — без запроса к API (для списков дня: линия есть у разобранных матчей). */
export function peekOddsSnap(id: number): OddsSnap | null {
  return cache.peek<OddsSnap>(`odds-snap:${id}`) ?? null
}

/** Подождать снимок линии не дольше `ms`: из кэша — сразу, на холодном старте — без него. */
export async function waitOddsSnap(m: Match, ms = 1200): Promise<OddsSnap | null> {
  const run = settle(getOddsSnap(m, { priority: 'low' }), null)
  return Promise.race([run, new Promise<null>((r) => setTimeout(() => r(null), ms).unref?.())])
}

// ─── PARI: live-кэфы и история линии легального букмекера (lib/sstats/pari.ts, связь — lib/pari-link.ts) ──

const pariList = (raw: RawPariMatch[] | null) => (raw ?? []).map(normalizePariMatch).filter((x): x is PariMatch => x !== null)

/** Все матчи PARI за день с текущими кэфами (~1 запрос, ~1 МБ): связь с нашими матчами и доматчевая линия PARI. */
export async function getPariDay(ymd: string, opts: Opts = {}): Promise<PariMatch[]> {
  const past = diffDays(ymd, todayYmd()) < 0
  return cache.get(
    `pari:day:${ymd}`,
    async () => pariList(await apiGet<RawPariMatch[]>('/Pari/matches', { date: ymd, timezone: tzOffsetHours(), limit: 1000, includeOdds: true }, opts)),
    past ? { ttl: 24 * H } : { ttl: 900, stale: 6 * H },
  )
}

/** Идущие матчи PARI с текущими live-кэфами (1 запрос на всех, обновление раз в минуту). */
export async function getPariLive(opts: Opts = {}): Promise<PariMatch[]> {
  return cache.get(
    'pari:live',
    async () => pariList(await apiGet<RawPariMatch[]>('/Pari/matches', { live: true, includeOdds: true, limit: 200 }, opts)),
    { ttl: 60, stale: 120 },
    false,
  )
}

/** Матч PARI для нашего матча (или null): по дню, времени начала и командам. */
export async function pariFor(m: Match, opts: Opts = {}): Promise<PariMatch | null> {
  const day = await settle(getPariDay(ymdInTz(m.ts), opts), [])
  return linkPari(m, day)
}

/** Live-кэфы PARI идущего матча: исходы 1X2 и тотал 2,5 (нет связи или линии — пусто). */
export async function getLiveOdds(m: Match, opts: Opts = {}): Promise<PariMatch['odds'] | null> {
  const link = await pariFor(m, opts)
  if (!link) return null
  const live = await settle(getPariLive(opts), [])
  const odds = live.find((p) => p.eventId === link.eventId)?.odds
  return odds && Object.keys(odds).length ? odds : null
}

/** История доматчевой линии PARI: точки со временем по 1X2 и тоталу 2,5. */
export async function getPariHistory(m: Match, opts: Opts = {}): Promise<{ eventId: number; history: PariHistory } | null> {
  const link = await pariFor(m, opts)
  if (!link) return null
  const started = m.status !== 'scheduled'
  const history = await cache.get(
    `pari:hist:${link.eventId}`,
    async () => pariHistory((await apiGet<RawPariSnapshot[]>(`/Pari/odds/history/${link.eventId}`, { oddsType: 'prematch' }, opts)) ?? []),
    started ? { ttl: 7 * 24 * H } : { ttl: 600, stale: 6 * H },
  )
  return { eventId: link.eventId, history }
}

/**
 * Снимки линии для подборок дня («Голевые матчи», «Движение коэффициентов»): из кэша — сразу; матчам
 * топ-турниров без снимка догружаем линию, но страница ждёт не дольше `ms` — остальное дойдёт в фоне
 * к следующему открытию. `pending` — у скольких топ-матчей линия ещё грузится.
 */
export async function daySnaps(matches: Match[], ms = 2500): Promise<{ snaps: Map<number, OddsSnap>; pending: number }> {
  const snaps = new Map<number, OddsSnap>()
  const need: Match[] = []
  for (const m of matches) {
    const s = peekOddsSnap(m.id)
    if (s) snaps.set(m.id, s)
    else if (isFeatured(m.league) && m.status !== 'postponed' && m.status !== 'cancelled') need.push(m)
  }
  if (need.length) {
    const jobs = need.slice(0, 80).map((m) =>
      settle(getOddsSnap(m, { priority: 'low' }), null).then((s) => {
        if (s) snaps.set(m.id, s)
      }),
    )
    await Promise.race([Promise.all(jobs), new Promise((r) => setTimeout(r, ms).unref?.())])
  }
  return { snaps, pending: need.filter((m) => !snaps.has(m.id)).length }
}

/** Полные данные матча (статистика, события) не дольше `ms` — для «Главных матчей»: идущие и сыгранные. */
export async function waitMatchFull(id: number, ms = 1200): Promise<MatchFull | null> {
  const run = settle(getMatchFull(id, { priority: 'low' }), null)
  return Promise.race([run, new Promise<null>((r) => setTimeout(() => r(null), ms).unref?.())])
}

/** Id матча во Flashscore-разделе (`/Ls/*`) — по команде хозяев и дню; не нашли — null (и это тоже держим в кэше). */
async function getLsId(m: Match, opts: Opts = {}): Promise<string | null> {
  const home = m.home.flash
  const away = m.away.flash
  if (!home || !away) return null
  const tz = tzOffsetHours(undefined, m.ts)
  return cache.get(
    `ls-id:${m.id}`,
    async () => findLsGame(await apiGet<RawLsGame[]>('/Ls/List', { Team: home, Date: ymdInTz(m.ts), TimeZone: tz }, opts), home, away),
    (id) => (id ? { ttl: 7 * 24 * H } : { ttl: 6 * H }),
  )
}

/**
 * Составы, давление по минутам, лишние строки статистики, стадион и зрители (владелец: «сделай всё» — про новые
 * методы `/Ls/*`). До начала — только составы и не раньше чем за 90 минут (раньше их нет); давление и статистика —
 * после начала. Каждая часть — своим запросом, упала одна — остальные на месте.
 */
export async function getLsExtra(m: Match, have: Set<string>, opts: Opts = {}): Promise<LsExtra | null> {
  const started = m.status !== 'scheduled' && m.status !== 'postponed' && m.status !== 'cancelled'
  const soon = m.status === 'scheduled' && m.ts - appNow() < 90 * 60_000
  if (!started && !soon) return null
  const id = await getLsId(m, opts)
  if (!id) return null
  // по ходу матча — реже, чем счёт (владелец: «чуть более редко обновлялось … чтоб не нагружать апи»): давление и
  // статистика `/Ls/*` — раз в 2 минуты, составы (замены, оценки) — раз в 5; счёт из `/Games` — по `matchTtl`
  const isLive = m.status === 'live' || m.status === 'suspended'
  const ttl = isLive ? { ttl: 120, stale: 240 } : matchTtl(m)
  const lineupTtl = isLive ? { ttl: 300, stale: 600 } : ttl
  const [info, lineups, momentum] = await Promise.all([
    // в ответе ~100 КБ (события с комментариями, кэфы) — храним только нужное
    started
      ? settle(
          cache.get(
            // v3 — все показатели (`otherStats`, группы, «372/452») и доп. время
            `ls-info:v3:${id}`,
            async () => {
              const r = await apiGet<RawLsInfo>('/Ls/GameInfo', { id }, opts)
              const st = r?.statistics
              return {
                venue: r?.venue ?? null,
                city: r?.city ?? null,
                attendance: r?.attendance ?? null,
                // все периоды как есть (у доп. времени ключ бывает «extraTIme»), из метрик — только нужные поля
                statistics: Object.fromEntries(
                  Object.entries(st ?? {}).map(([k, p]) => [
                    k,
                    {
                      metrics: (p?.metrics ?? []).map((m) => ({ id: m.id, name: m.name, groups: m.groups, home: m.home, away: m.away })),
                      otherStats: p?.otherStats ?? null,
                    },
                  ]),
                ),
                // из событий (с комментариями — десятки КБ) — только карточки с причиной
                events: (r?.events ?? [])
                  .filter((e) => e.reason && e.actions?.some((a) => /red/i.test(a.actionName ?? '')))
                  .map((e) => ({ team: e.team, minute: e.minute, displayTime: e.displayTime, reason: e.reason, actions: e.actions?.map((a) => ({ actionName: a.actionName })) })),
              } as RawLsInfo
            },
            ttl,
          ),
          null,
        )
      : null,
    settle(cache.get(`ls-lineups:v2:${id}`, async () => normalizeLineups(await apiGet<RawLsLineups>('/Ls/GameLineups', { id }, opts)), lineupTtl), null),
    started ? settle(cache.get(`ls-momentum:${id}`, async () => normalizeMomentum(await apiGet<RawLsMomentum>('/Ls/GameMomentum', { id }, opts)), ttl), null) : null,
  ])
  return {
    lineups,
    momentum,
    stats: lsStats(info, have),
    periods: lsPeriods(info),
    reds: lsReds(info?.events),
    venue: info?.venue ? { name: info.venue, city: info.city ?? '' } : null,
    attendance: typeof info?.attendance === 'number' && info.attendance > 0 ? info.attendance : null,
  }
}

/** Подождать `getLsExtra` не дольше `ms`: дальше ответ дозаполнит кэш к следующему открытию. */
export async function waitLsExtra(m: Match, have: Set<string>, ms = 1500): Promise<LsExtra | null> {
  const run = settle(getLsExtra(m, have, { priority: 'low' }), null)
  return Promise.race([run, new Promise<null>((r) => setTimeout(() => r(null), ms).unref?.())])
}

/**
 * xG прошлого матча — из его полной карточки (`/Games/{id}`: в `/Games/list` статистики нет). Сыгранный матч не
 * меняется — храним полгода; нужен и обеим его командам, и всем их следующим соперникам, так что запрос — один на матч.
 * Нет xG в API (низшие лиги) — `null`, тоже надолго.
 */
async function getGameXg(id: number, opts: Opts = {}): Promise<{ home: number; away: number } | null> {
  const v = await cache.get(
    `xg:game:${id}`,
    async () => {
      const full = await getMatchFull(id, opts)
      const x = full?.stats.find((s) => s.key === 'expectedGoals')
      return { x: x && x.home + x.away > 0 ? { home: x.home, away: x.away } : null }
    },
    { ttl: 180 * 24 * H },
  )
  return v.x
}

/** xG команды за 5 последних сыгранных матчей формы; меньше трёх с xG — `null` (тогда «Сильное и слабое место» — по голам). */
export async function getTeamXg(form: TeamForm | null, opts: Opts = {}): Promise<TeamXg | null> {
  if (!form) return null
  const games = form.games.slice(0, 5)
  const rows = await Promise.all(
    games.map(async (g): Promise<GameXg | null> => {
      const x = await settle(getGameXg(g.id, opts), null)
      if (!x) return null
      return { id: g.id, xgFor: g.isHome ? x.home : x.away, xgAgainst: g.isHome ? x.away : x.home, gf: g.gf, ga: g.ga }
    }),
  )
  return teamXg(rows.filter((r): r is GameXg => r != null))
}

/** Страница ждёт xG обеих команд не дольше `ms` (первый раз — до 10 запросов); остальное дозаполнит кэш. */
export async function waitTeamXg(home: TeamForm | null, away: TeamForm | null, ms = 1500): Promise<{ home: TeamXg | null; away: TeamXg | null }> {
  const run = Promise.all([settle(getTeamXg(home, { priority: 'low' }), null), settle(getTeamXg(away, { priority: 'low' }), null)])
  const r = await Promise.race([run, new Promise<null>((ok) => setTimeout(() => ok(null), ms).unref?.())])
  return r ? { home: r[0], away: r[1] } : { home: null, away: null }
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
  // v3 — названия по-русски (109 стран дописаны в словарь, «FA Cup» не в Англии — «Кубок страны»): в кэше на диске они
  // жили бы ещё сутки по-старому
  return cache.get(
    'leagues:v3',
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
  /** последние 5 результатов команд (свежие первыми) — для графика «Форма» в сторис и на странице матча */
  form?: { home: Res[]; away: Res[] } | null
  /** факты о командах с выборкой («Хозяева забивали в 9 из 10 последних домашних матчей») — для «Главных матчей» */
  facts?: Fact[]
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
  /** лучшая выгодная ставка именно по линии PARI (для «Выгодно сегодня» в правой панели — только PARI), иначе null */
  pari?: { key: string; label: string; prob: number; odd: number; ev: number } | null
  /** оценка tag.bet (модель) — для «Сегодня в цифрах» (средние по матчам дня, `lib/day-numbers.ts`); нет модели — null */
  probs?: { home: number; draw: number; away: number; over25: number | null; btts: number | null } | null
  at: number
}

export type MatchInsights = {
  full: MatchFull
  match: Match
  books: BookOdds[]
  /** когда взяли линию (`OddsSnap.at`); линии нет — null */
  oddsAt: number | null
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

/**
 * Выгодная ставка по линии PARI: исходы 1X2 и тотал 2,5, кэф PARI выше честной цены с тем же порогом, что и везде
 * (`valueThreshold`), и в тех же рамках, что `isValue` (кэф 1.3–4, шанс от 25%). Правая панель показывает только PARI
 * (владелец: «а можно блок выгодно сегодня сделать только про пари?»), поэтому лучший кэф другого партнёра здесь не в счёт.
 */
function pariValue(books: BookOdds[], candidates: Candidate[]): MatchSummary['pari'] {
  const book = books.find((b) => partnerForApiBookmaker(b.bookmakerId, b.bookmakerName)?.slug === 'pari')
  if (!book) return null
  const quote: Record<string, number | undefined> = {
    home: book.x12?.home?.value,
    draw: book.x12?.draw?.value,
    away: book.x12?.away?.value,
    'over2.5': book.totals.find((t) => t.line === 2.5)?.over?.value,
    'under2.5': book.totals.find((t) => t.line === 2.5)?.under?.value,
  }
  let best: NonNullable<MatchSummary['pari']> | null = null
  for (const c of candidates) {
    const odd = quote[c.key]
    if (!odd || odd < 1.3 || odd > 4 || c.prob < 0.25) continue
    const ev = c.prob * odd - 1
    if (ev < valueThreshold(odd)) continue
    if (!best || ev > best.ev) best = { key: c.key, label: c.label, prob: c.prob, odd, ev }
  }
  return best
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
  const [snap, glicko, teamGames, h2hGames, injuries, standings] = await Promise.all([
    settle(getOddsSnap(m, opts), null),
    settle(getGlicko(m, opts), null),
    settle(getTeamGames(m.home.id, m.away.id, before, opts), [] as Match[]),
    settle(getH2HGames(m.home.id, m.away.id, before, opts), [] as Match[]),
    m.status === 'finished' ? ([] as Injury[]) : settle(getInjuries(m, opts), [] as Injury[]),
    m.season?.year ? settle(getStandings(m.league.id, m.season.year, opts), null) : null,
  ])

  const books = snap?.books ?? []
  const oddsAt = books.length ? (snap?.at ?? null) : null
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
  const facts = teamFacts({ homeForm, awayForm, h2h })
  // «История точности»: последняя оценка до начала матча — на диск (после начала не меняется)
  void recordForecast(m, model, cons).catch(() => {})
  const summary: MatchSummary = { id, tags, form, facts, pick: summaryPick(pick), pari: m.status === 'scheduled' ? pariValue(books, candidates) : null, probs: model ? { ...model.x12, over25: model.over['2.5'] ?? null, btts: model.btts ?? null } : null, at: Date.now() }
  cache.set(`summary:${id}`, summary, { ttl: 3 * H, stale: 9 * H, persist: false })

  return { full, match: m, books, oddsAt, cons, glicko, model, candidates, pick, homeForm, awayForm, h2h, injuries, standings, tags, preview }
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
  const now = appNow()
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
 * Для главной: на холодном старте 30 дней матчей — десятки запросов к API, поэтому страница ждёт
 * не дольше полутора секунд, а расчёт доходит в фоне (его же запускает прогрев) — к следующему открытию.
 */
export async function peekChanceCheck(): Promise<ChanceCheck | null> {
  const run = settle(getChanceCheck({ priority: 'low' }), null)
  return Promise.race([run, new Promise<null>((r) => setTimeout(() => r(null), 1500).unref?.())])
}

// ─── «История точности» ──────────────────────────────────────────────────────

/** Окно страницы «История точности»: столько дней до сегодняшнего. */
export const TRACK_DAYS = 90

/** Сверить архив оценок с итогами и посчитать точность за `TRACK_DAYS` (lib/track-record.ts). */
export async function getTrackRecord(): Promise<TrackRecord> {
  const list = IS_MOCK ? await demoForecasts() : (await settleArchive(), await readForecasts(TRACK_DAYS))
  return trackRecord(list, { missesSince: appNow() - 7 * 24 * H * 1000 })
}

/** Сверка архива с итогами — страница и прогрев (каждый обход). */
export async function settleArchive() {
  await settle(settleForecasts((ymd) => getMatchesByDate(ymd, { priority: 'low' })), undefined)
}

/**
 * Демо: часы стоят, архив не копится — собираем его из сыгранных матчей демо за 30 дней, оценка — кэфы из списка без маржи
 * (у настоящего архива — оценка tag.bet перед началом). Только чтобы видеть страницу.
 */
async function demoForecasts(): Promise<Forecast[]> {
  const today = todayYmd()
  const lists = await Promise.all(Array.from({ length: 30 }, (_, i) => settle(getMatchesByDate(addDays(today, -i)), [] as Match[])))
  const out: Forecast[] = []
  for (const m of lists.flat()) {
    const f = fair1x2(m.odds?.x12)
    const s = m.scoreFT ?? m.score
    if (!f || m.status !== 'finished' || !s) continue
    const t = m.odds?.totals.find((x) => x.line === 2.5)
    const over = fairTwoWay(t?.over, t?.under)?.a ?? null
    const line = { home: f.home, draw: f.draw, away: f.away, over25: over, btts: null }
    out.push({
      id: m.id,
      ts: m.ts,
      league: leagueTitle(m.league.name),
      leagueId: m.league.id,
      featured: isFeatured(m.league),
      home: m.home.name,
      away: m.away.name,
      href: matchHref(m),
      at: m.ts - 3600_000,
      p: line,
      line,
      res: { home: s.home, away: s.away },
    })
  }
  return out
}
