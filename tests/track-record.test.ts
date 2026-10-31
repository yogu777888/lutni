import { describe, expect, it } from 'vitest'
import { brier1x2, brier2, trackRecord, type Forecast } from '../lib/track-record'

const f = (id: number, p: [number, number, number], res?: [number, number], extra: Partial<Forecast> = {}): Forecast => ({
  id,
  ts: 1_000 + id,
  league: 'Ла Лига',
  leagueId: 1,
  featured: true,
  home: 'Барселона',
  away: 'Хетафе',
  href: `/match/${id}`,
  at: 0,
  p: { home: p[0], draw: p[1], away: p[2], over25: 0.6, btts: null },
  line: { home: p[0], draw: p[1], away: p[2], over25: null, btts: null },
  ...(res ? { res: { home: res[0], away: res[1] } } : {}),
  ...extra,
})

describe('track record', () => {
  it('brier', () => {
    expect(brier1x2({ home: 1, draw: 0, away: 0 }, 'home')).toBe(0)
    expect(brier1x2({ home: 1 / 3, draw: 1 / 3, away: 1 / 3 }, 'draw')).toBeCloseTo(2 / 3)
    expect(brier2(0.6, true)).toBeCloseTo(0.16)
  })

  it('считает только сверенные, без отменённых', () => {
    const t = trackRecord([f(1, [0.6, 0.25, 0.15], [2, 0]), f(2, [0.6, 0.25, 0.15], [0, 1]), f(3, [0.5, 0.3, 0.2]), f(4, [0.5, 0.3, 0.2], undefined, { void: true })])
    expect(t.settled).toBe(2)
    expect(t.pending).toBe(1)
    expect(t.x12!.top).toBe(0.5)
    expect(t.x12!.even).toBeCloseTo(2 / 3)
    // 3 гола и больше: давали 60%, сбылось в одном из двух
    expect(t.over25!.n).toBe(2)
    expect(t.over25!.top).toBe(0)
    expect(t.btts).toBeNull()
  })

  it('неожиданные итоги — шанс сбывшегося ниже 25%, самые редкие первыми', () => {
    const t = trackRecord([f(1, [0.6, 0.25, 0.15], [0, 1]), f(2, [0.7, 0.2, 0.1], [1, 2]), f(3, [0.4, 0.3, 0.3], [0, 1])])
    expect(t.misses.map((m) => m.f.id)).toEqual([2, 1])
    expect(t.misses[0].won).toBe('away')
  })
})

describe('«Выгодно» вживую', () => {
  it('куда пошёл кэф к началу и как сбывалось', () => {
    const v = (key: string, first: number, last: number) => ({ key, slug: 'marathonbet', prob: 0.4, first, firstAt: 0, last, lastAt: 1 })
    const t = trackRecord([
      f(1, [0.4, 0.3, 0.3], [2, 0], { value: [v('home', 2.8, 2.6), v('over2.5', 2.0, 2.0)] }),
      f(2, [0.4, 0.3, 0.3], [0, 1], { value: [v('home', 2.6, 2.7)] }),
      // без итога — не в счёт
      f(3, [0.4, 0.3, 0.3], undefined, { value: [v('home', 3, 2)] }),
    ])
    expect(t.value!.n).toBe(3)
    expect(t.value!.down).toBeCloseTo(1 / 3)
    expect(t.value!.up).toBeCloseTo(1 / 3)
    expect(t.value!.move).toBeCloseTo((2.8 / 2.6 - 1 + 0 + (2.6 / 2.7 - 1)) / 3)
    // home 2:0 — да, over2.5 при 2:0 — нет, home 0:1 — нет
    expect(t.value!.hit).toBeCloseTo(1 / 3)
    expect(trackRecord([f(1, [0.4, 0.3, 0.3], [2, 0])]).value).toBeNull()
  })
})
