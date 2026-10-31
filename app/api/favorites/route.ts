import { getMatchesByDate } from '@/lib/data'
import { compactMatch } from '@/lib/compact'
import { todayYmd } from '@/lib/format'

export const dynamic = 'force-dynamic'

const idList = (s: string | null, cap: number) =>
  new Set(
    (s ?? '')
      .split(',')
      .map(Number)
      .filter((n) => Number.isSafeInteger(n) && n > 0)
      .slice(0, cap),
  )

/**
 * Избранное за день (components/FavMatches, левая панель): ?teams=1,2,3&matches=7,8&date=2026-10-04 — матчи избранных
 * команд и избранные матчи этого дня. Компактно — только для строки.
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const teams = idList(url.searchParams.get('teams'), 30)
  const matches = idList(url.searchParams.get('matches'), 50)
  const date = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get('date') ?? '') ? url.searchParams.get('date')! : todayYmd()
  if (!teams.size && !matches.size) return Response.json({ items: [] })
  let items: unknown[] = []
  try {
    const ms = await getMatchesByDate(date)
    items = ms
      .filter((m) => matches.has(m.id) || teams.has(m.home.id) || teams.has(m.away.id))
      .sort((a, b) => a.ts - b.ts)
      .map(compactMatch)
  } catch {}
  return Response.json({ items }, { headers: { 'Cache-Control': 'private, max-age=30', 'X-Robots-Tag': 'noindex' } })
}
