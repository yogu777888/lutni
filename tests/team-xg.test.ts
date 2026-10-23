import { describe, expect, it } from 'vitest'
import { teamPoints, teamXg } from '../lib/team-xg'
import type { TeamForm } from '../lib/stats'

const g = (xgFor: number, xgAgainst: number, gf: number, ga: number, id = 1) => ({ id, xgFor, xgAgainst, gf, ga })

describe('сильное и слабое место', () => {
  it('меньше трёх матчей с xG — xG не считаем', () => {
    expect(teamXg([g(1, 1, 1, 1), g(1, 1, 1, 1)])).toBeNull()
  })

  it('по xG: много моментов, но не реализует', () => {
    const x = teamXg([g(2.2, 0.8, 1, 0), g(1.9, 1, 1, 1), g(2.1, 0.9, 1, 1)])!
    const p = teamPoints(x, null)
    expect(p.byXg).toBe(true)
    expect(p.strong?.title).toBe('Создаёт много моментов')
    expect(p.weak?.title).toBe('Не реализует моменты')
    expect(p.weak?.text).toBe('В последних 3 матчах забивает 1,0 за игру при xG\u00a02,1.')
  })

  it('средняя команда — ни сильного, ни слабого', () => {
    const p = teamPoints(teamXg([g(1.3, 1.2, 1, 1), g(1.2, 1.3, 1, 1), g(1.4, 1.1, 2, 1)]), null)
    expect(p.strong).toBeNull()
    expect(p.weak).toBeNull()
  })

  it('без xG — по голам формы', () => {
    const form = { games: Array.from({ length: 10 }), gfAvg: 2.3, gaAvg: 1.9, cleanSheetRate: 0.1, failedToScoreRate: 0 } as unknown as TeamForm
    const p = teamPoints(null, form)
    expect(p.byXg).toBe(false)
    expect(p.strong?.title).toBe('Много забивает')
    expect(p.weak?.title).toBe('Много пропускает')
  })
})
