import { describe, expect, it } from 'vitest'
import { BANK_MIN_BETS, buildBank, settleBet } from '@/lib/bank'
import type { Match } from '@/lib/types'
import type { LoggedPick } from '@/lib/value-log'

const NOW = Date.UTC(2026, 9, 2, 12)
const team = (id: number) => ({ id, name: `T${id}`, original: `T${id}`, logo: null, country: 'England' })

function match(id: number, status: Match['status'], score: [number, number] | null, ft: [number, number] | null = score): Match {
  return {
    id,
    ts: NOW + id * 3600_000,
    status,
    statusCode: 0,
    statusLabel: '',
    elapsed: null,
    home: team(id * 10),
    away: team(id * 10 + 1),
    score: score ? { home: score[0], away: score[1] } : null,
    scoreFT: ft ? { home: ft[0], away: ft[1] } : null,
    scoreHT: null,
    league: { id: 39, name: 'Англия. Премьер-лига', original: 'Premier League', country: 'England', countryCode: 'GB' },
    season: null,
    round: null,
    odds: null,
  }
}

const pick = (id: number, key: string, odd: number): LoggedPick => ({ id, ts: NOW + id * 3600_000, key, label: key, odd, at: 0 })

describe('расчёт ставок', () => {
  it('исходы, двойной шанс, обе забьют', () => {
    expect(settleBet('home', { home: 2, away: 1 })).toBe('won')
    expect(settleBet('home', { home: 1, away: 1 })).toBe('lost')
    expect(settleBet('draw', { home: 0, away: 0 })).toBe('won')
    expect(settleBet('away', { home: 0, away: 2 })).toBe('won')
    expect(settleBet('hd', { home: 1, away: 1 })).toBe('won')
    expect(settleBet('da', { home: 2, away: 1 })).toBe('lost')
    expect(settleBet('ha', { home: 1, away: 1 })).toBe('lost')
    expect(settleBet('bttsYes', { home: 1, away: 1 })).toBe('won')
    expect(settleBet('bttsNo', { home: 3, away: 0 })).toBe('won')
  })
  it('тоталы: половинная линия — без возврата, целая — возврат при равенстве', () => {
    expect(settleBet('over2.5', { home: 2, away: 1 })).toBe('won')
    expect(settleBet('over2.5', { home: 1, away: 1 })).toBe('lost')
    expect(settleBet('under1.5', { home: 1, away: 0 })).toBe('won')
    expect(settleBet('over2', { home: 1, away: 1 })).toBe('void')
    expect(settleBet('нечто', { home: 1, away: 1 })).toBe('void')
  })
})

describe('банк «по 1000 ₽ на каждую выгодную ставку»', () => {
  const won = (id: number) => match(id, 'finished', [2, 0])
  const lost = (id: number) => match(id, 'finished', [0, 1])

  it('выигрыш — ставка × (кэф − 1), проигрыш — минус ставка; по времени начала', () => {
    const ms = [won(2), lost(1), ...Array.from({ length: 8 }, (_, i) => lost(3 + i))]
    const picks = ms.map((m) => pick(m.id, 'home', 2.5)).reverse()
    const b = buildBank(picks, new Map(ms.map((m) => [m.id, m])))!
    expect(b.bets.map((x) => x.match.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(b.bets.slice(0, 2).map((x) => [x.delta, x.cum])).toEqual([
      [-1000, -1000],
      [1500, 500],
    ])
    expect(b).toMatchObject({ won: 1, profit: 500 - 8000, avgOdd: 2.5, pending: 0 })
    expect(b.roi).toBeCloseTo(-7500 / 10000)
  })

  it('по счёту основного времени, а не после овертайма', () => {
    const ms = Array.from({ length: BANK_MIN_BETS }, (_, i) => match(i + 1, 'finished', [2, 1], [1, 1]))
    const b = buildBank(
      ms.map((m) => pick(m.id, 'home', 2)),
      new Map(ms.map((m) => [m.id, m])),
    )!
    expect(b.won).toBe(0)
  })

  it('недоигранные — в ожидании, возвраты и отмены — мимо; мало ставок — виджета нет', () => {
    const ms = [
      ...Array.from({ length: BANK_MIN_BETS - 1 }, (_, i) => won(i + 1)),
      match(20, 'live', [1, 0]),
      match(21, 'scheduled', null),
      match(22, 'cancelled', null),
      match(23, 'finished', [1, 1]),
    ]
    const picks = [...ms.map((m) => pick(m.id, m.id === 23 ? 'over2' : 'home', 1.8)), pick(99, 'home', 2)]
    const map = new Map(ms.map((m) => [m.id, m]))
    expect(buildBank(picks, map)).toBeNull()
    map.set(24, won(24))
    const b = buildBank([...picks, pick(24, 'home', 1.8)], map)!
    expect(b.bets).toHaveLength(BANK_MIN_BETS)
    expect(b.pending).toBe(2)
    expect(b.profit).toBe(BANK_MIN_BETS * 800)
  })
})
