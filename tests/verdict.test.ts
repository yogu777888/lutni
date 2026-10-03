import { describe, expect, it } from 'vitest'
import { computeTags, TAGS } from '@/lib/tags'
import type { Match } from '@/lib/types'
import { buildVerdict, chanceWord, headlineFor, outcomeText, outOf10 } from '@/lib/verdict'

const team = (id: number, name: string) => ({ id, name, original: name, logo: null, country: 'England' })
const q = (value: number) => ({ value, opening: null })

function match(x12: [number, number, number] | null): Match {
  return {
    id: 1,
    ts: Date.UTC(2026, 9, 3, 15),
    status: 'scheduled',
    statusCode: 1,
    statusLabel: '',
    elapsed: null,
    home: team(1, 'Арсенал'),
    away: team(2, 'Челси'),
    score: null,
    scoreFT: null,
    scoreHT: null,
    league: { id: 39, name: 'Англия. Премьер-лига', original: 'Premier League', country: 'England', countryCode: 'GB' },
    season: null,
    round: null,
    odds: x12 ? { x12: { home: q(x12[0]), draw: q(x12[1]), away: q(x12[2]) }, totals: [], btts: null, dc: null } : null,
  }
}

describe('шансы словами', () => {
  it('«из 10» — от 1 до 9: без «гарантий» и «невозможно»', () => {
    expect(outOf10(0.51)).toBe('5 из 10')
    expect(outOf10(0.97)).toBe('9 из 10')
    expect(outOf10(0.01)).toBe('1 из 10')
  })

  it('событие — одним-двумя словами', () => {
    expect(chanceWord(0.8)).toBe('очень вероятно')
    expect(chanceWord(0.62)).toBe('скорее да')
    expect(chanceWord(0.5)).toBe('50 на 50')
    expect(chanceWord(0.3)).toBe('скорее нет')
    expect(chanceWord(0.1)).toBe('маловероятно')
  })

  it('исход ставки — словами, команды в именительном падеже', () => {
    const m = match(null)
    expect(outcomeText('home', m)).toBe('победа «Арсенал»')
    expect(outcomeText('draw', m)).toBe('ничья')
    expect(outcomeText('da', m)).toBe('«Челси» не проиграет')
    expect(outcomeText('over2.5', m)).toBe('3 гола и больше')
    expect(outcomeText('under2.5', m)).toBe('не больше 2 голов')
    expect(outcomeText('over1.5', m)).toBe('2 гола и больше')
    expect(outcomeText('under1.5', m)).toBe('не больше 1 гола')
    expect(outcomeText('bttsYes', m)).toBe('обе забьют')
  })
})

describe('вывод по матчу', () => {
  it('главная фраза: явный фаворит, скорее, чуть сильнее, 50 на 50', () => {
    const m = match(null)
    expect(headlineFor({ home: 0.7, draw: 0.18, away: 0.12 }, m)).toMatchObject({ level: 'strong', side: 'home', text: 'Явный фаворит — «Арсенал»' })
    expect(headlineFor({ home: 0.2, draw: 0.25, away: 0.55 }, m)).toMatchObject({ level: 'lean', side: 'away', text: 'Скорее выиграет «Челси»' })
    expect(headlineFor({ home: 0.44, draw: 0.3, away: 0.26 }, m)).toMatchObject({ level: 'slight', text: 'Чуть сильнее «Арсенал»' })
    expect(headlineFor({ home: 0.38, draw: 0.28, away: 0.34 }, m)).toMatchObject({ level: 'even', side: null, text: 'Силы равны — 50 на 50' })
  })

  it('из коротких кэфов: шансы, голы, деньги и ставка словами', () => {
    const m = match([1.5, 4.2, 6.5])
    const v = buildVerdict({
      match: m,
      tags: [
        { slug: 'tb-2-5', score: 0.5, reason: '…', p: 0.66 },
        { slug: 'progruz', score: 0.8, reason: 'Коэффициент на победу «Арсенал» упал с 1.80 до 1.50 (−17%): на этот исход массово ставят' },
      ],
      pick: { key: 'home', odd: 1.55, kind: 'value' },
    })!
    expect(v.headline).toBe('Явный фаворит — «Арсенал»')
    expect(v.chances).toBe('«Арсенал» — 6 из 10, ничья — 2 из 10, «Челси» — 1 из 10')
    expect(v.goals).toBe('Скорее будет 3 гола и больше (7 из 10)')
    expect(v.money).toBe('На «Арсенал» массово ставят: кэф упал с 1.80 до 1.50')
    expect(v.bet).toEqual({ text: 'победа «Арсенал»', odd: 1.55, value: true, bookmaker: null, prob: null })
  })

  it('старые объяснения тегов с процентами тоже читаются; без линии вывода нет', () => {
    const v = buildVerdict({ match: match([2.6, 3.3, 2.7]), tags: [{ slug: 'tm-2-5', score: 0.5, reason: 'Вероятность тотала меньше 2.5 — 63%' }] })!
    expect(v.goals).toBe('Скорее будет не больше 2 голов (6 из 10)')
    expect(buildVerdict({ match: match(null), tags: [] })).toBeNull()
  })
})

describe('теги простыми словами', () => {
  it('подписи без жаргона, адреса страниц прежние', () => {
    const label = Object.fromEntries(TAGS.map((t) => [t.slug, t.label]))
    expect(label.value).toBe('#выгодно')
    expect(label.progruz).toBe('#идут деньги')
    expect(label['tb-2-5']).toBe('#много голов')
    expect(label.andedog).toBe('#может удивить')
  })

  it('объяснения — «из 10», а не проценты; цифра лежит в p', () => {
    const tags = computeTags({
      match: match([1.45, 4.5, 7.5]),
      cons: {
        x12: { home: 0.66, draw: 0.21, away: 0.13 },
        over: { '2.5': 0.64 },
        btts: 0.6,
        movement: { home: null, draw: null, away: null },
        books: 5,
      } as never,
    })
    const tb = tags.find((t) => t.slug === 'tb-2-5')!
    expect(tb.reason).toBe('Скорее будет 3 гола и больше: шанс 6 из 10')
    expect(tb.p).toBeCloseTo(0.64)
    expect(tags.find((t) => t.slug === 'favorit')?.reason).toBe('Шансы «Арсенал» на победу — 7 из 10')
    for (const t of tags) expect(t.reason).not.toMatch(/\d%/)
  })
})
