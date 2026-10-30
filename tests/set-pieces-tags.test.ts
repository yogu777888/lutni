import { describe, expect, it } from 'vitest'
import { statFor } from '@/lib/story-groups'
import { computeTags } from '@/lib/tags'
import { perMatch, type TeamSetPieces } from '@/lib/team-xg'
import type { Match } from '@/lib/types'

const match = { id: 1, home: { id: 1, name: 'Севилья' }, away: { id: 2, name: 'Осасуна' }, status: 'scheduled' } as unknown as Match
const sp = (cornersFor: number, cornersAgainst: number, cards: number, cardsAgainst: number, n = 5): TeamSetPieces => ({
  cornersN: n, cornersFor, cornersAgainst, cardsN: n, cards, cardsAgainst,
})

describe('«Много угловых» и «Много карточек»', () => {
  it('среднее за матч — по обеим командам', () => {
    expect(perMatch(sp(6, 5, 2, 2), sp(5, 6, 3, 2), 'corners')).toBe(11)
    expect(perMatch(sp(6, 5, 2, 2), sp(5, 6, 3, 2), 'cards')).toBe(4.5)
    expect(perMatch(sp(6, 5, 2, 2), sp(0, 0, 0, 0, 0), 'corners')).toBeNull()
  })

  it('порог: 10,5 угловых и 4,5 жёлтых; цифра кружка — из повода', () => {
    const tags = computeTags({ match, setPieces: { home: sp(6, 5, 2, 2), away: sp(5, 6, 3, 2) } })
    const c = tags.find((t) => t.slug === 'uglovye')!
    expect(c.reason).toContain('11,0 угловых за матч')
    expect(statFor('uglovye', c.reason)).toBe('11,0')
    expect(tags.some((t) => t.slug === 'kartochki')).toBe(true)
    const low = computeTags({ match, setPieces: { home: sp(5, 5, 2, 2), away: sp(5, 5, 2, 2) } })
    expect(low.some((t) => t.slug === 'uglovye' || t.slug === 'kartochki')).toBe(false)
  })
})
