import { describe, expect, it } from 'vitest'
import { handNotes } from '@/lib/hand-notes'
import type { TeamForm } from '@/lib/stats'
import type { StandingRow, Standings } from '@/lib/types'

const row = (teamId: number, rank: number, gf: number, ga: number, extra: Partial<StandingRow> = {}): StandingRow => ({
  teamId, team: `T${teamId}`, logo: null, rank, points: 0, played: 10, wins: 0, draws: 0, losses: 0,
  goalsFor: gf, goalsAgainst: ga, form: '', zone: null, group: null, ...extra,
})
const table = (rows: StandingRow[]): Standings => ({ groups: [{ name: null, rows }] })
const form = (streak: TeamForm['streak'], gfAvg = 1.2, gaAvg = 1.2): TeamForm =>
  ({ teamId: 0, games: Array(10).fill({}), streak, gfAvg, gaAvg, home: { played: 5, wins: 0, draws: 0, losses: 0, unbeatenRun: 0 } }) as unknown as TeamForm

describe('handNotes', () => {
  it('лидер важнее серии, у соперника — свой факт', () => {
    const st = table([row(1, 1, 20, 10), row(2, 2, 25, 8), row(3, 3, 5, 20)])
    const n = handNotes({ homeId: 1, awayId: 2, standings: st, homeForm: form({ kind: 'W', len: 4 }), awayForm: form(null) })
    expect(n).toEqual({ home: 'лидер', away: 'лучшая атака' })
  })

  it('серии с правильным склонением', () => {
    const n = handNotes({ homeId: 1, awayId: 2, standings: null, homeForm: form({ kind: 'W', len: 5 }), awayForm: form({ kind: 'L', len: 3 }) })
    expect(n).toEqual({ home: '5 побед подряд', away: '3 поражения подряд' })
  })

  it('таблица после двух туров и тихая форма — без приписок', () => {
    const st = table([row(1, 1, 4, 0, { played: 2 }), row(2, 2, 3, 1, { played: 2 })])
    expect(handNotes({ homeId: 1, awayId: 2, standings: st, homeForm: form(null), awayForm: form(null) })).toEqual({ home: null, away: null })
  })

  it('без ярких фактов — сравнение по голам', () => {
    const n = handNotes({ homeId: 1, awayId: 2, standings: null, homeForm: form(null, 2.1, 1), awayForm: form(null, 1.2, 1) })
    expect(n.home).toBe('забивает больше')
  })
})
