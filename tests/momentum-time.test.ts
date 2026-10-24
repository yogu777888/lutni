import { describe, expect, it } from 'vitest'
import { momentumSummary, playedTime } from '../lib/match-notes'
import { normalizeMomentum } from '../lib/sstats/ls'

// 59′: первый тайм 45+2 (47 точек), второй — 46…59 (14 точек)
const raw = [
  ...Array.from({ length: 47 }, (_, i) => ({ eventStage: 12, elapsedMinute: i, momentumValue: i % 3 ? 0.4 : 0 })),
  ...Array.from({ length: 14 }, (_, i) => ({ eventStage: 13, elapsedMinute: 45 + i, momentumValue: -0.3 })),
]

describe('давление: сыгранное время', () => {
  it('на 59′ с 2 добавленными — 61 минута, группы не пересекаются', () => {
    const m = normalizeMomentum({ points: raw })!
    const t = playedTime(m)
    const s = momentumSummary(m)
    expect([t.total, t.added, t.gap, t.len1]).toEqual([61, 2, 0, 47])
    expect(t.pos(2, 46)).toBe(48)
    const even = m.length - s.minutes.home - s.minutes.away
    expect(s.minutes.home + s.minutes.away + even).toBe(t.total)
  })
  it('повтор минуты не считается дважды, пропуск — «нет данных»', () => {
    const dup = normalizeMomentum({ points: [...raw, { eventStage: 13, elapsedMinute: 58, momentumValue: 0.5 }] })!
    expect(dup.length).toBe(61)
    const gap = normalizeMomentum({ points: raw.filter((p) => !(p.eventStage === 13 && p.elapsedMinute === 50)) })!
    expect(playedTime(gap).gap).toBe(1)
  })
})
