import { getLeagues, getMatchesByDate, settle } from '@/lib/data'
import { featuredRank } from '@/config/leagues'
import { dayLeagues } from '@/lib/day-leagues'
import { addDays, formatDayMonth, formatTime, todayYmd, ymdInTz } from '@/lib/format'
import { leagueHref, matchHref } from '@/lib/links'
import { isLive, isMinor } from '@/lib/rank'
import { searchLeagues, searchMatches } from '@/lib/search'
import type { Match } from '@/lib/types'

export const dynamic = 'force-dynamic'

const HEADERS = { 'Cache-Control': 'private, max-age=60', 'X-Robots-Tag': 'noindex' }

/** «Сегодня, 20:30» / «Завтра, 19:45» / «6 октября, 19:45» — ближние дни словами. */
function whenText(ts: number, today: string): string {
  const d = ymdInTz(ts)
  const day = d === today ? 'Сегодня' : d === addDays(today, 1) ? 'Завтра' : formatDayMonth(ts)
  return `${day}, ${formatTime(ts)}`
}

/**
 * Подсказки для пустого окна поиска (?suggest=1): турниры дня с флагами (клик — к блоку лиги на главной) и команды
 * главных матчей дня (клик — подставить в поиск). Окно полезно ещё до ввода.
 */
async function suggest(): Promise<Response> {
  const today = todayYmd()
  const [day, ms] = await Promise.all([dayLeagues(), settle(getMatchesByDate(today), [] as Match[])])
  const leagues = day.leagues.slice(0, 8).map((l) => ({ id: l.id, href: `/#league-${l.id}`, name: l.name, flag: l.flag, live: l.live }))
  const seen = new Set<number>()
  const teams: { name: string; logo: string | null }[] = []
  for (const m of ms.filter((m) => featuredRank(m.league) >= 0 && !isMinor(m)).sort((a, b) => featuredRank(a.league) - featuredRank(b.league) || a.ts - b.ts))
    for (const t of [m.home, m.away])
      if (!seen.has(t.id) && teams.length < 10) {
        seen.add(t.id)
        teams.push({ name: t.name, logo: t.logo })
      }
  return Response.json({ leagues, teams }, { headers: HEADERS })
}

/** Поиск для окна в шапке: ?q=спартак → матчи на сегодня и два дня вперёд + турниры. Всё из кэша слоя данных. */
export async function GET(req: Request) {
  const url = new URL(req.url)
  if (url.searchParams.get('suggest')) return suggest()
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 60)
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
    when: isLive(m) ? 'идёт' : m.status === 'finished' ? 'итог' : whenText(m.ts, today),
    live: isLive(m),
    score: m.score && m.status !== 'scheduled' ? `${m.score.home}:${m.score.away}` : null,
  }))
  return Response.json(
    { matches, leagues: searchLeagues(leagues, q).map((l) => ({ href: leagueHref(l), name: l.name })) },
    { headers: HEADERS },
  )
}
