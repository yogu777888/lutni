import { describe, expect, it } from 'vitest'
import { indexLeague, indexMatch } from '@/lib/seo'
import type { Match } from '@/lib/types'

const match = (league: number, status = 'scheduled') =>
  ({ id: 1, status, league: { id: league, name: 'L', country: 'X', original: 'L' } }) as unknown as Match

describe('что отдаём поисковикам', () => {
  it('матчи топ-турниров — в индекс, остальные и отменённые — нет', () => {
    expect(indexMatch(match(39))).toBe(true)
    expect(indexMatch(match(39, 'finished'))).toBe(true)
    expect(indexMatch(match(39, 'cancelled'))).toBe(false)
    expect(indexMatch(match(999999))).toBe(false)
  })
  it('турниры — только топ', () => {
    expect(indexLeague({ id: 39, name: 'Premier League', country: 'England' })).toBe(true)
    expect(indexLeague({ id: 999999, name: 'Non League Div One', country: 'England' })).toBe(false)
  })
})
