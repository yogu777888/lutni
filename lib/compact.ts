import { formatTime } from './format'
import { matchHref } from './links'
import { isLive } from './rank'
import type { Match } from './types'

/** Матч одной строкой — для клиентских виджетов (избранное, «Сейчас в игре» в боковой панели). */
export type CompactMatch = {
  id: number
  href: string
  league: string
  home: { id: number; name: string; logo: string | null }
  away: { id: number; name: string; logo: string | null }
  time: string
  live: boolean
  finished: boolean
  minute: string | null
  score: [number, number] | null
}

export function compactMatch(m: Match): CompactMatch {
  return {
    id: m.id,
    href: matchHref(m),
    league: m.league.name,
    home: { id: m.home.id, name: m.home.name, logo: m.home.logo },
    away: { id: m.away.id, name: m.away.name, logo: m.away.logo },
    time: formatTime(m.ts),
    live: isLive(m),
    finished: m.status === 'finished',
    minute: isLive(m) ? (m.statusCode === 4 ? 'перерыв' : m.elapsed ? `${m.elapsed}′` : 'идёт') : null,
    score: m.score ? [m.score.home, m.score.away] : null,
  }
}
