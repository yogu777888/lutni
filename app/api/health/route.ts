import { cache } from '@/lib/cache'
import { IS_MOCK, limiter } from '@/lib/sstats/client'
import { warmerState } from '@/lib/warmer'

export const dynamic = 'force-dynamic'

/** Для мониторинга (UptimeRobot и т.п.). */
export function GET() {
  return Response.json({
    ok: true,
    mode: IS_MOCK ? 'mock' : 'sstats',
    limiter: limiter.stats(),
    cacheEntries: cache.size(),
    warmer: {
      started: warmerState.started,
      lastRun: warmerState.lastRun ? new Date(warmerState.lastRun).toISOString() : null,
      analyzed: warmerState.analyzed,
      errors: warmerState.errors,
      queue: warmerState.queue.size,
    },
    time: new Date().toISOString(),
  })
}
