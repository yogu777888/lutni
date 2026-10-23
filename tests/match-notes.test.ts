import { describe, expect, it } from 'vitest'
import { matchNotes, momentumLine } from '../lib/match-notes'
import type { MatchEvent, StatPair } from '../lib/types'

const st = (key: string, home: number, away: number): StatPair => ({ key, label: key, home, away })
const base = { home: 'Арсенал', away: 'Челси', events: [] as MatchEvent[], momentum: null, live: true }

describe('«Главное» словами', () => {
  it('опаснее по моментам, но уступает — первым', () => {
    const n = matchNotes({ ...base, score: { home: 2, away: 1 }, stats: [st('expectedGoals', 0.78, 1.89), st('totalShots', 8, 15)] })
    expect(n[0].title).toBe('«Челси» опаснее, но уступает')
    expect(n[0].text).toContain('1,89 против 0,78')
  })

  it('ничего яркого — пусто', () => {
    expect(matchNotes({ ...base, score: { home: 1, away: 1 }, stats: [st('expectedGoals', 1.1, 1.0), st('totalShots', 9, 8), st('ballPossession', 52, 48)] })).toEqual([])
  })

  it('не больше трёх; давление в концовке — по последним 10 точкам', () => {
    const momentum = Array.from({ length: 20 }, (_, i) => ({ part: 2 as const, minute: 50 + i, v: i >= 10 ? 0.6 : -0.2 }))
    const n = matchNotes({
      ...base,
      score: { home: 0, away: 1 },
      momentum,
      stats: [st('expectedGoals', 2.1, 0.4), st('bigChances', 5, 0), st('totalShots', 18, 4), st('ballPossession', 66, 34)],
    })
    expect(n).toHaveLength(3)
    expect(n.map((x) => x.title)).toContain('«Арсенал» давит последние 10 минут')
    expect(momentumLine(momentum, 'Арсенал', 'Челси', false)).toBe('Концовка — за «Арсенал».')
  })
})
