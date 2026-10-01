import { describe, expect, it } from 'vitest'
import { getMatchesByDate, tagsFor, type FeedItem } from '@/lib/data'
import { todayYmd } from '@/lib/format'
import { buildStoryGroups } from '@/lib/story-groups'
import type { Match } from '@/lib/types'

const team = (id: number, name: string) => ({ id, name, original: name, logo: null, country: 'England' })
function item(id: number, status: Match['status'], tags: FeedItem['tags'] = [], leagueId = 39): FeedItem {
  const match: Match = {
    id,
    ts: Date.now() + id * 60_000,
    status,
    statusCode: status === 'live' ? 3 : 1,
    statusLabel: '',
    elapsed: status === 'live' ? 30 : null,
    home: team(id * 10, `Home ${id}`),
    away: team(id * 10 + 1, `Away ${id}`),
    score: null,
    scoreFT: null,
    scoreHT: null,
    league: { id: leagueId, name: 'Англия. Премьер-лига', original: 'Premier League', country: 'England', countryCode: 'GB' },
    season: null,
    round: null,
    odds: null,
  }
  return { match, tags, summary: null }
}

describe('кружки историй', () => {
  it('порядок: «В игре», «Топ дня», value и прогрузы раньше остальных тегов', () => {
    const groups = buildStoryGroups([
      item(1, 'live'),
      item(2, 'scheduled', [{ slug: 'tb-2-5', score: 0.9, reason: 'много голов' }]),
      item(3, 'scheduled', [{ slug: 'tb-2-5', score: 0.5, reason: 'голы' }, { slug: 'progruz', score: 0.6, reason: 'упал кэф' }]),
      item(4, 'scheduled', [{ slug: 'value', score: 0.4, reason: 'перевес' }]),
      item(5, 'finished', [{ slug: 'value', score: 1, reason: 'прошлое' }]),
    ])
    expect(groups.map((g) => g.key)).toEqual(['live', 'top', 'value', 'progruz', 'tb-2-5'])
    // завершённые матчи в кружки не попадают
    expect(groups.flatMap((g) => g.items.map((i) => i.id))).not.toContain(5)
    // в теге — его матчи, «почему» — причина этого тега
    const tb = groups.find((g) => g.key === 'tb-2-5')!
    expect(tb.href).toBe('/tag/tb-2-5')
    expect(tb.items.every((i) => i.focus?.slug === 'tb-2-5')).toBe(true)
    // «Топ дня» — только предстоящие, подпись — самый весомый тег матча
    const top = groups.find((g) => g.key === 'top')!
    expect(top.items.map((i) => i.id)).not.toContain(1)
    expect(top.items.find((i) => i.id === 3)?.focus?.slug).toBe('progruz')
  })

  it('логотипы на кружках не повторяются, если есть из чего выбрать', () => {
    const groups = buildStoryGroups([
      item(1, 'scheduled', [{ slug: 'value', score: 1, reason: 'a' }, { slug: 'progruz', score: 1, reason: 'b' }]),
      item(2, 'scheduled', [{ slug: 'value', score: 0.5, reason: 'c' }]),
      item(3, 'scheduled', [{ slug: 'progruz', score: 0.5, reason: 'd' }]),
    ])
    const covers = groups.map((g) => g.cover.home.name)
    expect(new Set(covers).size).toBe(covers.length)
    // матч с обложки — первый в кружке
    for (const g of groups) expect(g.cover.home.name).toBe(`Home ${g.items[0].id}`)
  })

  it('демо-день: кружки собираются, в теге не больше 10 матчей', async () => {
    const list = await getMatchesByDate(todayYmd())
    const groups = buildStoryGroups(list.map((m) => ({ match: m, ...tagsFor(m) })))
    expect(groups.length).toBeGreaterThan(3)
    for (const g of groups) {
      expect(g.items.length).toBeGreaterThan(0)
      expect(g.items.length).toBeLessThanOrEqual(10)
      expect(new Set(g.items.map((i) => i.id)).size).toBe(g.items.length)
    }
  })
})
