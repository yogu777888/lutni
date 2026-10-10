import { describe, expect, it } from 'vitest'
import { getMatchesByDate } from '@/lib/data'
import { appNow, formatTime, todayYmd } from '@/lib/format'
import { isLive } from '@/lib/rank'
import { buildTicker } from '@/lib/ticker'

describe('buildTicker', () => {
  it('идущие матчи — со счётом и минутой, главные первыми', async () => {
    const ms = await getMatchesByDate(todayYmd())
    const t = buildTicker(ms, appNow(), formatTime)
    expect(t.mode).toBe(ms.some(isLive) ? 'live' : t.items.length ? 'next' : 'none')
    if (t.mode === 'live') {
      expect(t.items.every((i) => i.live && i.note.length > 0)).toBe(true)
      expect(t.items.length).toBeLessThanOrEqual(10)
    }
  })

  it('нет идущих — ближайшие с временем начала', async () => {
    const ms = (await getMatchesByDate(todayYmd())).filter((m) => !isLive(m))
    const t = buildTicker(ms, 0, () => '21:00')
    expect(t.mode).toBe('next')
    expect(t.items.every((i) => !i.live && i.score === null && i.note === '21:00')).toBe(true)
  })
})
