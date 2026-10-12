/**
 * «Турниры дня» для левой панели каркаса (components/shell/LeftPanel.tsx): турниры сегодняшних матчей в том же порядке,
 * что и список в центре главной (DayView: топ-лиги по `featuredRank`, дальше страны по `countryRank`, турниры с линией
 * раньше), с числом матчей и идущих. Панель — на всех страницах, поэтому считаем из кэша слоя данных. Только для сервера.
 */
import { countryRank, featuredRank } from '@/config/leagues'
import { getMatchesByDate } from './data'
import { flagCode, leagueTitle } from './flags'
import { todayYmd } from './format'
import { leagueHref } from './links'
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
}

export type DayLeagues = { live: number; leagues: DayLeague[] }

/** Сколько турниров в панели: топ-лиги все, остальные — первые по порядку. */
const LIMIT = 60

export async function dayLeagues(): Promise<DayLeagues> {
  try {
    const matches = await getMatchesByDate(todayYmd())
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
    const leagues = [...top, ...rest].slice(0, Math.max(LIMIT, top.length)).map(({ league: l, items }) => {
      const flag = flagCode(l)
      return {
        id: l.id,
        name: flag ? leagueTitle(l.name) : l.name,
        full: l.name,
        flag,
        href: leagueHref(l),
        total: items.length,
        live: items.filter(isLive).length,
        top: featuredRank(l) >= 0,
      }
    })
    return { live: matches.filter(isLive).length, leagues }
  } catch {
    return { live: 0, leagues: [] }
  }
}
