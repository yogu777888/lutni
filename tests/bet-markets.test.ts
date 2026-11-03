import { describe, expect, it } from 'vitest'
import { betMarkets } from '../lib/bet-markets'
import { buildForm } from '../lib/stats'
import type { Match } from '../lib/types'

const team = (id: number) => ({ id, name: `T${id}`, logo: null }) as unknown as Match['home']
let n = 1
const game = (h: number, a: number, gh: number, ga: number, ts = 1000 + n): Match =>
  ({ id: n++, ts, status: 'finished', home: team(h), away: team(a), score: { home: gh, away: ga }, scoreFT: null, league: { id: 1, name: 'L' } }) as unknown as Match

describe('betMarkets', () => {
  it('исход — хозяева дома и гости в гостях, голы — все матчи, лига — от 20 матчей', () => {
    const past = [game(1, 9, 2, 0), game(1, 9, 1, 1), game(1, 9, 3, 2), game(9, 2, 1, 0), game(9, 2, 0, 0), game(9, 2, 2, 3)]
    const m = { ...game(1, 2, 0, 0, 99999), status: 'scheduled' } as Match
    const [x12, goals] = betMarkets(m, buildForm(1, past), buildForm(2, past), past)
    // хозяева дома: В Н В; гости в гостях: П Н В → «победа хозяев» — 2 + 1 из 6
    expect(x12.outcomes[0].past).toEqual({ hit: 3, of: 6 })
    expect(x12.outcomes[1].past).toEqual({ hit: 2, of: 6 })
    expect(x12.outcomes[0].league).toBeNull()
    // 3+ гола: у «1» — один из трёх (3:2), у «2» — один из трёх (2:3)
    expect(goals.outcomes[0].past).toEqual({ hit: 2, of: 6 })
    const season = Array.from({ length: 20 }, (_, i) => game(5, 6, i % 2, 0))
    expect(betMarkets(m, null, null, season)[0].outcomes[0].league).toEqual({ hit: 10, of: 20 })
    // двойной шанс: «хозяева или ничья» — хозяева дома не проиграли (3) и гости в гостях не выиграли (2)
    const dc = betMarkets(m, buildForm(1, past), buildForm(2, past), past).find((x) => x.key === 'dc')!
    expect(dc.outcomes.map((o) => o.past)).toEqual([{ hit: 5, of: 6 }, { hit: 3, of: 6 }, { hit: 4, of: 6 }])
  })
})
