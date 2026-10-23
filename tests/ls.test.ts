import { describe, expect, it } from 'vitest'
import { findLsGame, lsStats, minuteLabel, normalizeLineups, normalizeMomentum, surname, type RawLsPlayer } from '../lib/sstats/ls'

describe('Flashscore-раздел SStats (/Ls/*)', () => {
  it('матч — по id команд из flashId', () => {
    const list = [
      { id: 'AAAAAAAA', homeTeamId: 'OtpNdwrc', awayTeamId: 'zzzzzzzz' },
      { id: 'Y34wXpJN', homeTeamId: 'OtpNdwrc', awayTeamId: 'WSzc94ws' },
    ]
    expect(findLsGame(list, 'bournemouth/OtpNdwrc', 'sunderland/WSzc94ws')).toBe('Y34wXpJN')
    expect(findLsGame(list, 'bournemouth/OtpNdwrc', 'x/qqqqqqqq')).toBeNull()
  })

  it('фамилия без инициалов', () => {
    expect(surname('Tavernier M.')).toBe('Tavernier')
    expect(surname('Kroupi E. J.')).toBe('Kroupi')
    expect(surname('Evanilson')).toBe('Evanilson')
    expect(surname('N. Schmidt')).toBe('Schmidt')
  })

  it('давление: минуты по таймам как в API, добавленное время — «45+3′»', () => {
    const pts = [
      ...Array.from({ length: 48 }, (_, i) => ({ eventStage: 12, elapsedMinute: i, addedTime: Math.max(0, i - 44), momentumValue: 0.2 })),
      { eventStage: 13, elapsedMinute: 45, addedTime: 0, momentumValue: -2 },
      { eventStage: 13, elapsedMinute: 91, addedTime: 2, momentumValue: 0.4 },
    ]
    const m = normalizeMomentum({ points: pts })!
    expect(m[47]).toEqual({ part: 1, minute: 48, v: 0.2 })
    expect(minuteLabel(m[47])).toBe('45+3′')
    expect(m[48]).toEqual({ part: 2, minute: 46, v: -1 })
    expect(minuteLabel(m[49])).toBe('90+2′')
    expect(normalizeMomentum({ points: pts.slice(0, 5) })).toBeNull()
  })

  it('составы: основа по линиям, запасные, тренер; меньше 11 в основе — состава нет', () => {
    const p = (kind: number, row: number | null, n: number): RawLsPlayer => ({ playerName: `P${n} A.`, kind, formationRow: row, sortOrder: n, shirtNumber: String(n), subInTime: kind === 1 ? '65' : null })
    const team = (side: number) => ({
      side,
      formation: '4-3-3',
      players: [p(0, 0, 1), ...[1, 1, 1, 1, 2, 2, 2, 3, 3, 3].map((r, i) => p(0, r, i + 2)), p(1, null, 20), p(2, null, 30), p(3, null, 40)],
    })
    const l = normalizeLineups({ lineups: [team(1), team(2)] })!
    expect(l.home.rows.map((r) => r.length)).toEqual([1, 4, 3, 3])
    expect(l.home.bench).toHaveLength(1)
    expect(l.home.bench[0].subIn).toBe(65)
    expect(l.home.coach).toBe('P30 A.')
    expect(normalizeLineups({ lineups: [{ ...team(1), players: team(1).players.slice(3) }, team(2)] })).toBeNull()
  })

  it('статистика: только новые строки, проценты — из percentage, своих не подменяем', () => {
    const info = {
      statistics: {
        fullTime: {
          metrics: [
            { id: '461', home: { value: 20 }, away: { value: 2 } },
            { id: '342', home: { value: null, percentage: 83 }, away: { value: null, percentage: 63 } },
            { id: '432', home: { value: 4.23 }, away: { value: 0.07 } },
            { id: '457', home: { value: null }, away: { value: null } },
          ],
        },
      },
    }
    const out = lsStats(info, new Set(['expectedGoals']))
    expect(out.map((s) => s.key)).toEqual(['shotsInsideBox', 'passAccuracy'])
    expect(out[1]).toMatchObject({ home: 83, away: 63, suffix: '%' })
  })
})
