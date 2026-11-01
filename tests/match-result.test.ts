import { describe, expect, it } from 'vitest'
import { forecastCheck, resultNote } from '@/lib/match-result'
import type { MatchEvent } from '@/lib/types'

const t = (name: string) => ({ id: name.length, name }) as never
const g = (minute: number, side: 'home' | 'away', player: string, kind: MatchEvent['kind'] = 'goal'): MatchEvent => ({ minute, extra: null, side, kind, player, assist: null })
const m = (h: number, a: number, statusCode = 8) => ({ home: t('Овьедо'), away: t('Реал Мадрид'), score: { home: h, away: a }, statusCode })

describe('resultNote', () => {
  it('победа в гостях — счёт победителя первым, камбэк и дубль', () => {
    const n = resultNote(m(1, 4), [g(10, 'home', 'A. Lopez'), g(30, 'away', 'K. Mbappé'), g(50, 'away', 'K. Mbappé'), g(70, 'away', 'Vini'), g(80, 'away', 'Rodrygo')])!
    expect(n.title).toBe('Победа «Реал Мадрид» в гостях — 4:1')
    expect(n.text).toBe('Камбэк: уступали 0:1 на 10′. Дубль — Mbappé (30′, 50′).')
  })
  it('победа в один мяч — победный гол', () => {
    expect(resultNote(m(2, 1), [g(5, 'home', 'X'), g(40, 'away', 'Y'), g(88, 'home', 'B. Petrov')])!.text).toBe('Победный гол — Petrov, 88′.')
  })
  it('ничья: упустили два мяча; без голов', () => {
    expect(resultNote(m(2, 2), [g(5, 'home', 'a'), g(9, 'home', 'b'), g(60, 'away', 'c'), g(80, 'away', 'd')])!.text).toBe('«Овьедо» вели 2:0, но не удержали.')
    expect(resultNote(m(0, 0), [])!.title).toBe('Ничья без голов')
  })
  it('ход счёта не сходится с итогом — без фактов про ход', () => {
    expect(resultNote(m(1, 0), [g(5, 'away', 'a')])!.text).toBe('')
  })
})

describe('forecastCheck', () => {
  it('берёт сторону с большим шансом и сверяет с итогом', () => {
    const rows = forecastCheck({ home: 'Овьедо', away: 'Реал Мадрид', est: { home: 14, draw: 18, away: 68 }, over25: 0.46, btts: 0.52, score: { home: 1, away: 4 } })
    expect(rows.map((r) => [r.label, r.fact, r.hit])).toEqual([
      ['Победа «Реал Мадрид»', '1:4', true],
      ['Не больше 2 голов', '5 голов', false],
      ['Обе забьют', 'забили обе', true],
    ])
    expect(rows[1].p).toBeCloseTo(0.54)
  })
})
