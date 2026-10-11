import { getMatchesByDate } from '@/lib/data'
import { compactMatch } from '@/lib/compact'
import { todayYmd } from '@/lib/format'

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
      .map(compactMatch)
  } catch {}
  return Response.json({ items }, { headers: { 'Cache-Control': 'private, max-age=30', 'X-Robots-Tag': 'noindex' } })
}
