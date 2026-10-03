import { describe, expect, it } from 'vitest'
import { computeTags, TAGS } from '@/lib/tags'
import type { Match } from '@/lib/types'
import { buildVerdict, headlineFor, outcomeShort, outcomeText, split100 } from '@/lib/verdict'

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
  it('шансы трёх исходов — целые проценты, в сумме ровно 100', () => {
    expect(split100({ home: 0.51, draw: 0.255, away: 0.235 })).toEqual({ home: 51, draw: 26, away: 23 })
    expect(split100({ home: 0.334, draw: 0.333, away: 0.333 })).toEqual({ home: 34, draw: 33, away: 33 })
    // «из 10» по отдельности давало 5 + 3 + 3 = 11 — так больше не бывает
    let seed = 7
    const rnd = () => ((seed = (seed * 48271) % 2147483647) / 2147483647)
    for (let i = 0; i < 500; i++) {
      const [a, b, c] = [rnd(), rnd(), rnd()]
      const t = a + b + c
      const s = split100({ home: a / t, draw: b / t, away: c / t })
      expect(s.home + s.draw + s.away).toBe(100)
    }
  })

  it('исход коротко, без названий команд — для узких плиток', () => {
    expect(outcomeShort('home')).toBe('победа хозяев')
    expect(outcomeShort('away')).toBe('победа гостей')
    expect(outcomeShort('da')).toBe('гости не проиграют')
    expect(outcomeShort('over2.5')).toBe('3 гола и больше')
    expect(outcomeShort('draw')).toBe('ничья')
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

  it('из коротких кэфов: шансы, голы, падение кэфа и ставка словами', () => {
    const m = match([1.5, 4.2, 6.5])
    const v = buildVerdict({
      match: m,
      tags: [
        { slug: 'tb-2-5', score: 0.5, reason: '…', p: 0.66 },
        { slug: 'progruz', score: 0.8, reason: 'Коэффициент на победу «Арсенал» упал с 1.80 до 1.50 (−17%)' },
      ],
      pick: { key: 'home', odd: 1.55, kind: 'value' },
    })!
    expect(v.headline).toBe('Явный фаворит — «Арсенал»')
    const m3 = /^«Арсенал» — (\d+)%, ничья — (\d+)%, «Челси» — (\d+)%$/.exec(v.chances)!
    expect(Number(m3[1]) + Number(m3[2]) + Number(m3[3])).toBe(100)
    expect(v.goals).toBe('Скорее будет 3 гола и больше — шанс 66%')
    // только факт по линии — без «массово ставят»: сколько ставят, мы не знаем
    expect(v.drop).toBe('Кэф на «Арсенал» снизился: 1.80 → 1.50')
    expect(v.bet).toEqual({ text: 'победа «Арсенал»', odd: 1.55, value: true, bookmaker: null, prob: null })
  })

  it('старые объяснения тегов с процентами тоже читаются; без линии вывода нет', () => {
    const v = buildVerdict({ match: match([2.6, 3.3, 2.7]), tags: [{ slug: 'tm-2-5', score: 0.5, reason: 'Вероятность тотала меньше 2.5 — 63%' }] })!
    expect(v.goals).toBe('Скорее будет не больше 2 голов — шанс 63%')
    expect(buildVerdict({ match: match(null), tags: [] })).toBeNull()
  })
})

describe('теги простыми словами', () => {
  it('подписи без жаргона, адреса страниц прежние', () => {
    const label = Object.fromEntries(TAGS.map((t) => [t.slug, t.label]))
    expect(label.value).toBe('#выгодно')
    expect(label.progruz).toBe('#кэф упал')
    expect(label['tb-2-5']).toBe('#много голов')
    expect(label.andedog).toBe('#может удивить')
  })

  it('объяснения — простыми словами и в процентах; цифра лежит в p', () => {
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
    expect(tb.reason).toBe('Скорее будет 3 гола и больше: шанс 64%')
    expect(tb.p).toBeCloseTo(0.64)
    expect(tags.find((t) => t.slug === 'favorit')?.reason).toBe('Шансы «Арсенал» на победу — 66%')
    for (const t of tags) expect(t.reason).not.toMatch(/из 10|массово/)
  })
})
