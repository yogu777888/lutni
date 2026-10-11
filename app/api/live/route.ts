import { compactMatch } from '@/lib/compact'
import { getMatchesByDate } from '@/lib/data'
import { appNow, todayYmd } from '@/lib/format'
import { isLive, isMinor, liveRank } from '@/lib/rank'

export const dynamic = 'force-dynamic'

/**
 * «Сейчас в игре» для правой панели (components/shell/RightPanel): идущие матчи, главные первыми, без молодёжных
 * и женских; если сейчас ничего не идёт — ближайшие сегодня (`upcoming: true`).
 */
export async function GET() {
  let live: ReturnType<typeof compactMatch>[] = []
  let upcoming = false
  try {
    const ms = (await getMatchesByDate(todayYmd())).filter((m) => !isMinor(m))
    const now = ms.filter(isLive).sort((a, b) => liveRank(a) - liveRank(b) || a.ts - b.ts)
    if (now.length) live = now.slice(0, 8).map(compactMatch)
    else {
      upcoming = true
      live = ms
        .filter((m) => m.status === 'scheduled' && m.ts >= appNow())
        .sort((a, b) => liveRank(a) - liveRank(b) || a.ts - b.ts)
        .slice(0, 6)
        .map(compactMatch)
    }
  } catch {}
  return Response.json({ items: live, upcoming }, { headers: { 'Cache-Control': 'public, max-age=30', 'X-Robots-Tag': 'noindex' } })
}
