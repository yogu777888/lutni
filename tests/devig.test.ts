import { describe, expect, it } from 'vitest'
import { betWon, quoteOf } from '@/lib/model'
import { DEVIGS, devig, fair1x2, fairTwoWay } from '@/lib/odds'

const q = (...odds: number[]) => odds.map((o) => 1 / o)
const total = (xs: number[]) => xs.reduce((s, x) => s + x, 0)

describe('снятие маржи', () => {
  it('у всех способов шансы в сумме — 1', () => {
    for (const m of DEVIGS) {
      expect(total(devig(q(1.34, 5.3, 9.5), m))).toBeCloseTo(1, 9)
      expect(total(devig(q(1.9, 1.9), m))).toBeCloseTo(1, 9)
    }
  })

  it('пропорционально — делим обратные кэфы на их сумму', () => {
    const p = devig(q(1.91, 3.6, 4.2), 'proportional')
    const s = total(q(1.91, 3.6, 4.2))
    expect(p[0]).toBeCloseTo(1 / 1.91 / s, 12)
  })

  it('степенной и Шин снимают с длинного кэфа больше: фаворит выше, аутсайдер ниже', () => {
    const prop = devig(q(1.34, 5.3, 9.5), 'proportional')
    for (const m of ['power', 'shin'] as const) {
      const p = devig(q(1.34, 5.3, 9.5), m)
      expect(p[0]).toBeGreaterThan(prop[0])
      expect(p[2]).toBeLessThan(prop[2])
    }
  })

  it('равные кэфы — равные шансы, без маржи — как есть', () => {
    for (const m of DEVIGS) {
      const [a, b] = devig(q(1.9, 1.9), m)
      expect(a).toBeCloseTo(0.5, 9)
      expect(b).toBeCloseTo(0.5, 9)
      expect(devig([0.5, 0.3, 0.2], m)).toEqual([0.5, 0.3, 0.2])
    }
  })

  it('fair1x2 и fairTwoWay принимают способ, маржа та же', () => {
    const x = { home: { value: 1.34, opening: null }, draw: { value: 5.3, opening: null }, away: { value: 9.5, opening: null } }
    const prop = fair1x2(x, false, 'proportional')!
    const shin = fair1x2(x, false, 'shin')!
    expect(shin.margin).toBeCloseTo(prop.margin, 12)
    expect(shin.home).toBeGreaterThan(prop.home)
    expect(fairTwoWay({ value: 1.5, opening: null }, { value: 2.6, opening: null }, 'power')!.a).toBeGreaterThan(
      fairTwoWay({ value: 1.5, opening: null }, { value: 2.6, opening: null }, 'proportional')!.a,
    )
  })
})

describe('ставка по ключу', () => {
  const book = {
    bookmakerId: 1,
    bookmakerName: 'Marathonbet',
    x12: { home: { value: 2.1, opening: null } },
    dc: { hd: { value: 1.3, opening: null } },
    totals: [{ line: 2.5, over: { value: 1.8, opening: null }, under: { value: 2.0, opening: null } }],
    btts: { yes: { value: 1.7, opening: null } },
  }
  it('кэф', () => {
    expect(quoteOf(book, 'home')?.value).toBe(2.1)
    expect(quoteOf(book, 'hd')?.value).toBe(1.3)
    expect(quoteOf(book, 'under2.5')?.value).toBe(2.0)
    expect(quoteOf(book, 'bttsYes')?.value).toBe(1.7)
    expect(quoteOf(book, 'over3.5')).toBeUndefined()
  })
  it('итог по счёту', () => {
    expect(betWon('draw', 1, 1)).toBe(true)
    expect(betWon('da', 0, 2)).toBe(true)
    expect(betWon('over2.5', 2, 1)).toBe(true)
    expect(betWon('under2.5', 2, 1)).toBe(false)
    expect(betWon('bttsNo', 3, 0)).toBe(true)
  })
})
