import { describe, expect, it } from 'vitest'
import { binOf, CHANCE_BINS, CHANCE_MIN_BIN, chanceCheck, emptyTally, mergeTallies, tallyChances } from '@/lib/chance-check'
import type { Match } from '@/lib/types'

const team = (id: number, name = `T${id}`) => ({ id, name, original: name, logo: null, country: 'England' })
const q = (value: number) => ({ value, opening: null })

function match(id: number, x12: [number, number, number] | null, ft: [number, number] | null, extra: Partial<Match> = {}): Match {
  return {
    id,
    ts: id,
    status: 'finished',
    statusCode: 8,
    statusLabel: '',
    elapsed: null,
    home: team(id * 10),
    away: team(id * 10 + 1),
    score: ft ? { home: ft[0], away: ft[1] } : null,
    scoreFT: ft ? { home: ft[0], away: ft[1] } : null,
    scoreHT: null,
    league: { id: 39, name: 'Англия. Премьер-лига', original: 'Premier League', country: 'England', countryCode: 'GB' },
    season: null,
    round: null,
    odds: x12 ? { x12: { home: q(x12[0]), draw: q(x12[1]), away: q(x12[2]) }, totals: [], btts: null, dc: null } : null,
    ...extra,
  }
}

describe('проверка шансов', () => {
  it('корзины «около 10% … 90%»: ±5 пунктов, крайние — мимо', () => {
    expect(binOf(0.04)).toBe(-1)
    expect(binOf(0.05)).toBe(0)
    expect(binOf(0.149)).toBe(0)
    expect(binOf(0.55)).toBe(5)
    expect(binOf(0.649)).toBe(5)
    expect(binOf(0.949)).toBe(CHANCE_BINS - 1)
    expect(binOf(0.95)).toBe(-1)
  })

  it('считаем только сыгранные «взрослые» матчи с кэфами, итог — по основному времени', () => {
    const t = tallyChances([
      // 1.5 / 4.2 / 6.5 → без маржи ≈ 62% / 22% / 14%: хозяева выиграли
      match(1, [1.5, 4.2, 6.5], [2, 0]),
      // по основному времени ничья, победа — в овертайме
      match(2, [1.5, 4.2, 6.5], [1, 1], { score: { home: 2, away: 1 } }),
      match(3, [1.5, 4.2, 6.5], null, { status: 'live' }),
      match(4, null, [1, 0]),
      match(5, [1.5, 4.2, 6.5], [1, 0], { league: { id: 1, name: 'Юноши', original: 'Premier League U21', country: 'England', countryCode: 'GB' } }),
    ])
    expect(t.matches).toBe(2)
    expect(t.n[binOf(0.62)]).toBe(2)
    expect(t.hits[binOf(0.62)]).toBe(1)
    expect(t.hits[binOf(0.22)]).toBe(1)
    expect(t.hits[binOf(0.14)]).toBe(0)
  })

  it('честные шансы — маленькая разница; главная цифра — корзина «около 60%»; мало исходов — виджета нет', () => {
    const t = emptyTally()
    for (let i = 0; i < CHANCE_BINS; i++) {
      const at = (i + 1) / 10
      t.n[i] = 100
      t.sum[i] = at * 100
      t.hits[i] = Math.round(at * 100) + (i === 5 ? -2 : 0)
    }
    t.matches = 300
    const c = chanceCheck(mergeTallies([t]), 30)!
    expect(c.bins).toHaveLength(CHANCE_BINS)
    expect(c.lead).toMatchObject({ at: 60, n: 100 })
    expect(c.lead.hit).toBeCloseTo(0.58)
    expect(c.gap).toBeCloseTo(2 / 9)
    expect(c.outcomes).toBe(900)

    const few = emptyTally()
    few.n[5] = CHANCE_MIN_BIN
    few.sum[5] = CHANCE_MIN_BIN * 0.6
    expect(chanceCheck(few, 30)).toBeNull()
  })
})
