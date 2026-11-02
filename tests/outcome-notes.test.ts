import { describe, expect, it } from 'vitest'
import { outcomeNotes } from '../lib/outcome-notes'
import { buildForm } from '../lib/stats'
import type { Match } from '../lib/types'

const team = (id: number) => ({ id, name: `T${id}`, logo: null }) as unknown as Match['home']
let n = 1
const game = (h: number, a: number, gh: number, ga: number): Match =>
  ({ id: n++, ts: 1000 + n, status: 'finished', home: team(h), away: team(a), score: { home: gh, away: ga }, scoreFT: null, league: { id: 1, name: 'L' } }) as unknown as Match

describe('outcomeNotes', () => {
  it('дома хозяева выигрывают — «за» победу хозяев и «против» победы гостей; голы — зеркально', () => {
    const past = [...Array.from({ length: 6 }, () => game(1, 9, 3, 1)), ...Array.from({ length: 6 }, () => game(9, 2, 2, 1))]
    const m = { ...game(1, 2, 0, 0), status: 'scheduled' } as Match
    const notes = outcomeNotes({ match: m, x12: { home: 0.5, draw: 0.25, away: 0.25 }, over25: 0.6, btts: 0.5, homeForm: buildForm(1, past), awayForm: buildForm(2, past), h2h: null, injuries: [], standings: null })
    const by = (k: string) => notes.find((x) => x.key === k)!
    expect(by('home').lines[0]).toMatchObject({ tone: 'pro', text: '«T1» дома: 6 побед, 0 ничьих, 0 поражений в последних 6 матчах.' })
    expect(by('away').lines[0].tone).toBe('con')
    expect(by('over2.5').lines[0].tone).toBe('pro')
    expect(by('under2.5').lines[0].tone).toBe('con')
    expect(by('under2.5').chance).toBeCloseTo(0.4)
  })
})
