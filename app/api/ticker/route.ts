import { getMatchesByDate } from '@/lib/data'
import { appNow, formatTime, todayYmd } from '@/lib/format'
import { buildTicker } from '@/lib/ticker'

export const dynamic = 'force-dynamic'

/** Бегущая строка матчей для шапки (components/LiveTicker): идущие матчи или ближайшие сегодня. */
export async function GET() {
  let body
  try {
    const matches = await getMatchesByDate(todayYmd())
    body = buildTicker(matches, appNow(), formatTime)
  } catch {
    body = { mode: 'none', items: [] }
  }
  return Response.json(body, {
    headers: { 'Cache-Control': 'private, max-age=30', 'X-Robots-Tag': 'noindex' },
  })
}
