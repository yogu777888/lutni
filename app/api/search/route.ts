import { getLeagues, getMatchesByDate, settle } from '@/lib/data'
import { addDays, formatDayMonth, formatTime, todayYmd } from '@/lib/format'
import { leagueHref, matchHref } from '@/lib/links'
import { isLive } from '@/lib/rank'
import { searchLeagues, searchMatches } from '@/lib/search'
import type { Match } from '@/lib/types'

export const dynamic = 'force-dynamic'

/** Поиск для окна в шапке: ?q=спартак → матчи на сегодня и два дня вперёд + турниры. Всё из кэша слоя данных. */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim().slice(0, 60)
  if (q.length < 2) return Response.json({ matches: [], leagues: [] })
  const today = todayYmd()
  const [days, leagues] = await Promise.all([
    Promise.all([0, 1, 2].map((d) => settle(getMatchesByDate(addDays(today, d)), [] as Match[]))),
    settle(getLeagues(), []),
  ])
  const matches = searchMatches(days.flat(), q).map((m) => ({
    id: m.id,
    href: matchHref(m),
    home: { name: m.home.name, logo: m.home.logo },
    away: { name: m.away.name, logo: m.away.logo },
    league: m.league.name,
    when: isLive(m) ? 'идёт' : m.status === 'finished' ? 'итог' : `${formatDayMonth(m.ts)}, ${formatTime(m.ts)}`,
    live: isLive(m),
    score: m.score && m.status !== 'scheduled' ? `${m.score.home}:${m.score.away}` : null,
  }))
  return Response.json(
    { matches, leagues: searchLeagues(leagues, q).map((l) => ({ href: leagueHref(l), name: l.name })) },
    { headers: { 'Cache-Control': 'private, max-age=60', 'X-Robots-Tag': 'noindex' } },
  )
}
