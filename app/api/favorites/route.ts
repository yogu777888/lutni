import { getMatchesByDate } from '@/lib/data'
import { formatTime, todayYmd } from '@/lib/format'
import { matchHref } from '@/lib/links'
import { isLive } from '@/lib/rank'

export const dynamic = 'force-dynamic'

/** Матчи избранных команд за день (components/FavMatches): ?teams=1,2,3&date=2026-10-04. Компактно — только для строки. */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const ids = new Set(
    (url.searchParams.get('teams') ?? '')
      .split(',')
      .map(Number)
      .filter((n) => Number.isSafeInteger(n) && n > 0)
      .slice(0, 30),
  )
  const date = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get('date') ?? '') ? url.searchParams.get('date')! : todayYmd()
  if (!ids.size) return Response.json({ items: [] })
  let items: unknown[] = []
  try {
    const ms = await getMatchesByDate(date)
    items = ms
      .filter((m) => ids.has(m.home.id) || ids.has(m.away.id))
      .sort((a, b) => a.ts - b.ts)
      .map((m) => ({
        id: m.id,
        href: matchHref(m),
        league: m.league.name,
        home: { name: m.home.name, logo: m.home.logo },
        away: { name: m.away.name, logo: m.away.logo },
        time: formatTime(m.ts),
        live: isLive(m),
        finished: m.status === 'finished',
        minute: isLive(m) ? (m.statusCode === 4 ? 'перерыв' : m.elapsed ? `${m.elapsed}′` : 'идёт') : null,
        score: m.score ? [m.score.home, m.score.away] : null,
      }))
  } catch {}
  return Response.json({ items }, { headers: { 'Cache-Control': 'private, max-age=30', 'X-Robots-Tag': 'noindex' } })
}
