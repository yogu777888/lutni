import { describe, expect, it } from 'vitest'
import { applyListFilter, isEmptyFilter, parseListFilter } from '@/lib/list-filter'
import type { FeedItem } from '@/lib/data'

const item = (id: number, status: string, league: number, tags: string[]): FeedItem =>
  ({
    match: { id, status, league: { id: league, name: 'L', country: 'England', original: 'L' } },
    tags: tags.map((slug) => ({ slug, score: 1, reason: '' })),
    summary: null,
  }) as unknown as FeedItem

describe('list filter', () => {
  it('parses and ignores junk', () => {
    const f = parseListFilter({ st: 'live', lg: '39,abc,140', tag: 'value,<x>', top: '1' })
    expect(f).toEqual({ st: 'live', lg: [39, 140], top: true, tags: ['value'] })
    expect(isEmptyFilter(parseListFilter({}))).toBe(true)
  })
  it('filters by status, league and any tag', () => {
    const items = [item(1, 'live', 39, ['value']), item(2, 'scheduled', 39, ['progruz']), item(3, 'scheduled', 140, []), item(4, 'finished', 39, ['value'])]
    expect(applyListFilter(items, parseListFilter({ st: 'ahead' })).map((i) => i.match.id)).toEqual([2, 3])
    expect(applyListFilter(items, parseListFilter({ lg: '39', tag: 'value,progruz' })).map((i) => i.match.id)).toEqual([1, 2, 4])
    expect(applyListFilter(items, parseListFilter({})).length).toBe(4)
  })
})
