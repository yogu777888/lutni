import { describe, expect, it } from 'vitest'
import { classifyMarket, fair1x2, parseMarkets } from '@/lib/odds'

describe('classifyMarket', () => {
  it('распознаёт основные рынки в разных написаниях', () => {
    expect(classifyMarket('Match Winner')).toBe('1x2')
    expect(classifyMarket('1X2')).toBe('1x2')
    expect(classifyMarket('Full Time Result')).toBe('1x2')
    expect(classifyMarket('Исход')).toBe('1x2')
    expect(classifyMarket('Goals Over/Under')).toBe('totals')
    expect(classifyMarket('Тотал')).toBe('totals')
    expect(classifyMarket('Both Teams Score')).toBe('btts')
    expect(classifyMarket('Обе забьют')).toBe('btts')
    expect(classifyMarket('Double Chance')).toBe('dc')
  })
  it('игнорирует таймы, командные тоталы, форы и угловые', () => {
    for (const n of [
      'First Half Winner',
      'Goals Over/Under First Half',
      'Total - Home',
      'Home/Away',
      'Asian Handicap',
      'Corners Over Under',
      'Both Teams Score - First Half',
      'Double Chance - First Half',
      'Exact Score',
      'Тотал 1-го тайма',
    ]) {
      expect(classifyMarket(n), n).toBeNull()
    }
  })
})

describe('parseMarkets', () => {
  it('разбирает 1X2, тоталы по линиям, ОЗ и двойной шанс', () => {
    const m = parseMarkets([
      { marketId: 1, marketName: 'Match Winner', odds: [
        { name: 'Home', value: '2.10', openingValue: 2.3 },
        { name: 'Draw', value: 3.4 },
        { name: 'Away', value: 3.6 },
      ] },
      { marketId: 5, marketName: 'Goals Over/Under', odds: [
        { name: 'Over 2.5', value: 1.9 }, { name: 'Under 2.5', value: 1.95 },
        { name: 'Over 1.5', value: 1.3 }, { name: 'Under 1.5', value: 3.5 },
      ] },
      { marketId: 8, marketName: 'Both Teams Score', odds: [{ name: 'Yes', value: 1.8 }, { name: 'No', value: 2.0 }] },
      { marketId: 12, marketName: 'Double Chance', odds: [{ name: 'Home/Draw', value: 1.3 }, { name: 'Draw/Away', value: 1.7 }] },
      { marketId: 13, marketName: 'First Half Winner', odds: [{ name: 'Home', value: 9 }] },
    ])
    expect(m.x12?.home).toEqual({ value: 2.1, opening: 2.3 })
    expect(m.x12?.away?.value).toBe(3.6)
    expect(m.totals.map((t) => t.line)).toEqual([1.5, 2.5])
    expect(m.totals[1].over?.value).toBe(1.9)
    expect(m.btts?.yes?.value).toBe(1.8)
    expect(m.dc?.hd?.value).toBe(1.3)
  })
  it('понимает исходы 1/X/2, ТБ/ТМ и линию в названии рынка', () => {
    const m = parseMarkets([
      { marketId: 1, marketName: '1X2', odds: [{ name: '1', value: 1.5 }, { name: 'X', value: 4 }, { name: '2', value: 6 }] },
      { marketId: 2, marketName: 'Тотал 2.5', odds: [{ name: 'Больше', value: 1.8 }, { name: 'Меньше', value: 2 }] },
      { marketId: 3, marketName: 'Total', odds: [{ name: 'ТБ(3.5)', value: 2.9 }, { name: 'ТМ(3.5)', value: 1.4 }] },
    ])
    expect(m.x12?.draw?.value).toBe(4)
    expect(m.totals.find((t) => t.line === 2.5)?.under?.value).toBe(2)
    expect(m.totals.find((t) => t.line === 3.5)?.over?.value).toBe(2.9)
  })
  it('сопоставляет исходы по названиям команд', () => {
    const m = parseMarkets(
      [{ marketId: 1, marketName: 'Winner', odds: [{ name: 'Arsenal', value: 1.8 }, { name: 'Draw', value: 3.8 }, { name: 'Chelsea', value: 4.5 }] }],
      { home: 'Arsenal', away: 'Chelsea' },
    )
    expect(m.x12?.home?.value).toBe(1.8)
    expect(m.x12?.away?.value).toBe(4.5)
  })
})

describe('fair1x2', () => {
  it('снимает маржу пропорционально', () => {
    const f = fair1x2({ home: { value: 2, opening: null }, draw: { value: 3.5, opening: null }, away: { value: 4, opening: null } })!
    expect(f.home + f.draw + f.away).toBeCloseTo(1, 10)
    expect(f.margin).toBeCloseTo(1 / 2 + 1 / 3.5 + 1 / 4 - 1, 10)
    expect(f.home).toBeGreaterThan(f.away)
  })
  it('отбрасывает неполные и битые линии', () => {
    expect(fair1x2({ home: { value: 2, opening: null } })).toBeNull()
    expect(fair1x2({ home: { value: 1.01, opening: null }, draw: { value: 1.01, opening: null }, away: { value: 1.01, opening: null } })).toBeNull()
  })
})
