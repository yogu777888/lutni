/**
 * «Турниры дня» для левой панели каркаса (components/shell/LeftPanel.tsx): турниры сегодняшних матчей в том же порядке,
 * что и список в центре главной (DayView: топ-лиги по `featuredRank`, дальше страны по `countryRank`, турниры с линией
 * раньше), с числом матчей и идущих. Панель — на всех страницах, поэтому считаем из кэша слоя данных. Только для сервера.
 */
import { countryRank, featuredRank } from '@/config/leagues'
import { getMatchesByDate } from './data'
import { flagCode, leagueTitle } from './flags'
import { addDays, formatTime, todayYmd } from './format'
import { leagueHref, listHref, matchHref } from './links'
import { isLive } from './rank'
import type { League, Match } from './types'

export type DayLeague = {
  id: number
  /** «Ла Лига» — без страны, если есть флаг; иначе полное название */
  name: string
  /** полное название — для подсказки */
  full: string
  flag: string | null
  /** страница турнира — если блока лиги нет на текущей странице */
  href: string
  total: number
  live: number
  top: boolean
  /** время первого ещё не начавшегося матча; null — таких нет */
  next: string | null
  /** уже начинались матчи (идут или сыграны) — «в 22:00» (следующий) вместо «с 22:00» */
  started: boolean
  /** матчи турнира по времени — очередь сторис лиги (клик по флагу) и сегменты кольца */
  items: { id: number; href: string }[]
}

export type DayLeagues = {
  live: number
  leagues: DayLeague[]
  /** турниры завтра (только число матчей) — ниже сегодняшних, чтобы в спокойный день панель не стояла пустой */
  tomorrow: DayLeague[]
}

/** Завтра в панели — топ-лиги и первые из остальных, всего не больше стольких. */
const TOMORROW_LIMIT = 12

/** Сколько турниров в панели: топ-лиги все, остальные — первые по порядку. */
const LIMIT = 60

/** Турниры дня по порядку списка в центре. `href` — куда вести, если блока лиги на странице нет. */
async function leaguesOf(ymd: string, href: (l: League) => string, limit: number): Promise<{ matches: Match[]; leagues: DayLeague[] }> {
  const matches = await getMatchesByDate(ymd)
  const groups = new Map<number, { league: League; items: Match[] }>()
  for (const m of matches) {
    const g = groups.get(m.league.id)
    if (g) g.items.push(m)
    else groups.set(m.league.id, { league: m.league, items: [m] })
  }
  const all = [...groups.values()]
  const top = all.filter((g) => featuredRank(g.league) >= 0).sort((a, b) => featuredRank(a.league) - featuredRank(b.league))
  const rest = all
    .filter((g) => featuredRank(g.league) < 0)
    .sort(
      (a, b) =>
        countryRank(a.league.country) - countryRank(b.league.country) ||
        Number(b.items.some((m) => m.odds)) - Number(a.items.some((m) => m.odds)) ||
        a.league.name.localeCompare(b.league.name, 'ru'),
    )
  const leagues = [...top, ...rest].slice(0, Math.max(limit, top.length)).map(({ league: l, items }) => {
    const flag = flagCode(l)
    return {
      id: l.id,
      name: flag ? leagueTitle(l.name) : l.name,
      full: l.name,
      flag,
      href: href(l),
      total: items.length,
      live: items.filter(isLive).length,
      top: featuredRank(l) >= 0,
      next: (() => {
        const ts = items.filter((m) => m.status === 'scheduled').map((m) => m.ts)
        return ts.length ? formatTime(Math.min(...ts)) : null
      })(),
      started: items.some((m) => isLive(m) || m.status === 'finished'),
      items: [...items].sort((a, b) => a.ts - b.ts).map((m) => ({ id: m.id, href: matchHref(m) })),
    }
  })
  return { matches, leagues }
}

export async function dayLeagues(): Promise<DayLeagues> {
  const today = todayYmd()
  const tomorrow = addDays(today, 1)
  const [now, next] = await Promise.all([
    leaguesOf(today, leagueHref, LIMIT).catch(() => null),
    // завтрашний список — страница «Матчи» на завтра, сразу к блоку лиги
    leaguesOf(tomorrow, (l) => `${listHref(tomorrow, today)}#league-${l.id}`, TOMORROW_LIMIT).catch(() => null),
  ])
  return { live: now ? now.matches.filter(isLive).length : 0, leagues: now?.leagues ?? [], tomorrow: (next?.leagues ?? []).slice(0, TOMORROW_LIMIT) }
}
