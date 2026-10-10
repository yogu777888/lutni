/**
 * Бегущая строка матчей в шапке: идущие матчи — главные первыми (как «В игре»), без молодёжных и женских;
 * нет идущих — ближайшие предстоящие сегодня. Только факты из списка матчей: счёт, минута, время начала.
 */
import { matchHref } from './links'
import { isLive, isMinor, liveRank } from './rank'
import type { Match } from './types'

export type TickerItem = {
  id: number
  href: string
  home: string
  away: string
  /** счёт идущего матча; у предстоящего — null */
  score: [number, number] | null
  /** «59′», «перерыв» — у идущего; «21:00» — у предстоящего */
  note: string
  live: boolean
}

export type Ticker = { mode: 'live' | 'next' | 'none'; items: TickerItem[] }

const minute = (m: Match) => (m.statusCode === 4 ? 'перерыв' : m.elapsed ? `${m.elapsed}′` : 'идёт')

export function buildTicker(matches: Match[], now: number, time: (ts: number) => string, max = 10): Ticker {
  const item = (m: Match, live: boolean): TickerItem => ({
    id: m.id,
    href: matchHref(m),
    home: m.home.name,
    away: m.away.name,
    score: live && m.score ? [m.score.home, m.score.away] : null,
    note: live ? minute(m) : time(m.ts),
    live,
  })
  const live = matches
    .filter((m) => isLive(m) && !isMinor(m))
    .sort((a, b) => liveRank(a) - liveRank(b) || a.ts - b.ts)
    .slice(0, max)
  if (live.length) return { mode: 'live', items: live.map((m) => item(m, true)) }
  const next = matches
    .filter((m) => m.status === 'scheduled' && m.ts > now && !isMinor(m))
    .sort((a, b) => a.ts - b.ts || liveRank(a) - liveRank(b))
    .slice(0, Math.min(max, 5))
  return next.length ? { mode: 'next', items: next.map((m) => item(m, false)) } : { mode: 'none', items: [] }
}
