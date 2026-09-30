import { describe, expect, it } from 'vitest'
import { buildCandidates, buildConsensus, buildModel, choosePick, fitLambdas, poisson } from '@/lib/model'
import type { BookOdds } from '@/lib/odds'

const q = (value: number, opening: number | null = null) => ({ value, opening })

function book(id: number, name: string, h: number, d: number, a: number, o25?: [number, number]): BookOdds {
  return {
    bookmakerId: id,
    bookmakerName: name,
    x12: { home: q(h, h * 1.1), draw: q(d), away: q(a) },
    totals: o25 ? [{ line: 2.5, over: q(o25[0]), under: q(o25[1]) }] : [],
    btts: null,
    dc: null,
  }
}

describe('poisson', () => {
  it('вероятности исходов в сумме дают 1', () => {
    const p = poisson(1.6, 1.1)
    expect(p.x12.home + p.x12.draw + p.x12.away).toBeCloseTo(1, 6)
    expect(p.x12.home).toBeGreaterThan(p.x12.away)
    expect(p.topScores[0].p).toBeGreaterThan(p.topScores[1].p)
  })
  it('fitLambdas восстанавливает исходные λ по вероятностям', () => {
    const truth = poisson(1.8, 0.9)
    const fit = fitLambdas(truth.x12, truth.over['2.5'])
    expect(fit.home).toBeCloseTo(1.8, 1)
    expect(fit.away).toBeCloseTo(0.9, 1)
  })
})

describe('consensus / value / pick', () => {
  const books = [
    book(1, 'Pinnacle', 2.0, 3.6, 4.0, [1.95, 1.95]),
    book(2, 'Bet365', 1.95, 3.5, 3.9, [1.9, 1.9]),
    book(3, 'Fonbet', 2.25, 3.4, 3.7, [1.9, 1.92]), // завышенный П1 → value у партнёра
    book(4, 'Winline', 1.96, 3.5, 4.0, [1.88, 1.95]),
  ]
  it('консенсус взвешивает букмекеров и считает прогрузы', () => {
    const c = buildConsensus(books)
    expect(c.books).toBe(4)
    expect(c.x12!.home + c.x12!.draw + c.x12!.away).toBeCloseTo(1, 6)
    expect(c.movement.home!.opening).toBeGreaterThan(c.movement.home!.current)
    expect(c.over['2.5']).toBeGreaterThan(0.4)
  })
  it('находит value у партнёра и выбирает его прогнозом', () => {
    const c = buildConsensus(books)
    const model = buildModel(c, null)!
    const cands = buildCandidates(books, model)
    const home = cands.find((x) => x.key === 'home')!
    expect(home.bestPartner?.bookmakerName).toBe('Fonbet')
    expect(home.ev!).toBeGreaterThan(0.035)
    const pick = choosePick(cands)!
    expect(pick.kind).toBe('value')
    expect(pick.candidate.key).toBe('home')
  })
  it('модель работает только на xG из Glicko', () => {
    const c = buildConsensus([])
    const model = buildModel(c, { homeRating: 1600, awayRating: 1500, homeRd: 50, awayRd: 50, homeXg: 1.7, awayXg: 1.0, homeWin: null, awayWin: null })
    expect(model?.source).toBe('xg')
    expect(model!.x12.home).toBeGreaterThan(model!.x12.away)
  })
})
