import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ValueMoves } from '@/components/ValueMoves'
import { trackValues } from '@/lib/forecast-log'
import { buildCandidates, buildConsensus, buildModel } from '@/lib/model'
import type { BookOdds } from '@/lib/odds'

const q = (value: number) => ({ value, opening: null })
const book = (name: string, h: number, d: number, a: number): BookOdds => ({
  bookmakerId: 0,
  bookmakerName: name,
  x12: { home: q(h), draw: q(d), away: q(a) },
  totals: [],
  btts: null,
  dc: null,
})

describe('ставки «Выгодно» до начала', () => {
  it('новая — с кэфом сейчас, у прежней обновляется последний кэф', () => {
    // у Марафона победа хозяев заметно выше рынка — выгодно
    const books = [book('Pinnacle', 2.0, 3.5, 4.0), book('Bet365', 2.0, 3.4, 3.9), book('Marathonbet', 2.3, 3.3, 3.8)]
    const cands = buildCandidates(books, buildModel(buildConsensus(books), null))
    const first = trackValues([], books, cands, 100)
    const home = first.find((v) => v.key === 'home')!
    expect(home).toMatchObject({ slug: 'marathonbet', first: 2.3, last: 2.3, firstAt: 100 })
    // через час кэф Марафона упал до 2.1 — ставка уже не выгодна, но последний кэф записываем
    const later = [books[0], books[1], book('Marathonbet', 2.1, 3.4, 3.9)]
    const next = trackValues(first, later, buildCandidates(later, buildModel(buildConsensus(later), null)), 200)
    expect(next.find((v) => v.key === 'home')).toMatchObject({ first: 2.3, last: 2.1, firstAt: 100, lastAt: 200 })
  })
})

describe('блок на «Истории точности»', () => {
  it('до 20 ставок — без цифр', () => {
    const html = renderToStaticMarkup(createElement(ValueMoves, { v: { n: 5, down: 0.6, up: 0.2, move: 0.02, prob: 0.4, hit: 0.4 } }))
    expect(html).toContain('сейчас 5')
    expect(html).not.toContain('ниже на')
  })
  it('от 20 — доли и средний сдвиг', () => {
    const html = renderToStaticMarkup(createElement(ValueMoves, { v: { n: 40, down: 0.6, up: 0.3, move: 0.021, prob: 0.42, hit: 0.45 } }))
    expect(html).toContain('60%')
    expect(html).toContain('не изменился — у 10%')
    expect(html).toContain('ниже на 2,1%')
    expect(html).toContain('сбылось — 45%')
  })
})
