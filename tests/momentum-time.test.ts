import { describe, expect, it } from 'vitest'
import { momentumSummary, playedTime, pressShares } from '../lib/match-notes'
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
  it('проценты: 43 / 8 / 10 из 61 — 70,5 / 13,1 / 16,4, сумма ровно 100', () => {
    const pts = (h: number, e: number, a: number) =>
      [...Array(h).fill(0.5), ...Array(e).fill(0), ...Array(a).fill(-0.5)].map((v, i) => ({ part: 1 as const, minute: i + 1, v }))
    expect(pressShares(pts(43, 8, 10))).toEqual({ home: 705, even: 131, away: 164, n: 61 })
    const eq = pressShares(pts(1, 1, 1))!
    expect(eq.home + eq.even + eq.away).toBe(1000)
    expect(pressShares([])).toBeNull()
  })
  it('без добавленного, после 90′ и с пропуском — время по точкам, пропуск не в знаменателе', () => {
    const plain = normalizeMomentum({ points: Array.from({ length: 45 }, (_, i) => ({ eventStage: 12, elapsedMinute: i, momentumValue: 0.2 })) })!
    expect([playedTime(plain).total, playedTime(plain).added]).toEqual([45, 0])
    const full = normalizeMomentum({
      points: [
        ...Array.from({ length: 46 }, (_, i) => ({ eventStage: 12, elapsedMinute: i, momentumValue: 0.2 })),
        ...Array.from({ length: 49 }, (_, i) => ({ eventStage: 13, elapsedMinute: 45 + i, momentumValue: -0.2 })),
      ],
    })!
    const t = playedTime(full)
    expect([t.len1, t.len2, t.total, t.added, t.pos(2, 94)]).toEqual([46, 49, 95, 5, 95])
    const holed = full.filter((p) => !(p.part === 2 && p.minute >= 60 && p.minute < 63))
    expect(playedTime(holed).gap).toBe(3)
    expect(pressShares(holed)!.n).toBe(92)
  })
})
