import { describe, expect, it } from 'vitest'
import { activeNav } from '@/components/NavCapsule'
import type { FeedItem, MatchSummary } from '@/lib/data'
import { buildDaySummary, parseProgruz, summaryCards } from '@/lib/day-summary'
import type { Match } from '@/lib/types'

const NOW = Date.UTC(2026, 9, 2, 12)
const team = (id: number, name: string) => ({ id, name, original: name, logo: null, country: 'England' })
const q = (value: number) => ({ value, opening: null })

function item(
  id: number,
  status: Match['status'],
  { tags = [], ev, x12, at = id }: { tags?: FeedItem['tags']; ev?: number; x12?: [number, number, number]; at?: number } = {},
): FeedItem {
  const match: Match = {
    id,
    ts: NOW + at * 60 * 60_000,
    status,
    statusCode: status === 'live' ? 3 : 1,
    statusLabel: '',
    elapsed: status === 'live' ? 30 : null,
    home: team(id * 10, `Home ${id}`),
    away: team(id * 10 + 1, `Away ${id}`),
    score: status === 'live' ? { home: 1, away: 0 } : null,
    scoreFT: null,
    scoreHT: null,
    league: { id: 39, name: 'Англия. Премьер-лига', original: 'Premier League', country: 'England', countryCode: 'GB' },
    season: null,
    round: null,
    odds: x12 ? { x12: { home: q(x12[0]), draw: q(x12[1]), away: q(x12[2]) }, totals: [], btts: null, dc: null } : null,
  }
  const summary: MatchSummary | null =
    ev === undefined
      ? null
      : { id, tags, at: 0, pick: { key: 'home', label: 'П1', prob: 0.5, odd: 2.2, bookmaker: null, partnerSlug: null, ev, kind: 'value' } }
  return { match, tags, summary }
}

const progruz = (team: string, from: string, to: string, pct: number) => ({
  slug: 'progruz',
  score: pct / 20,
  reason: `Коэффициент на победу «${team}» упал с ${from} до ${to} (−${pct}%)`,
})

describe('сводка дня', () => {
  it('value — самый большой перевес, прогруз — самое большое падение, матч дня — другой матч', () => {
    const s = buildDaySummary(
      [
        item(1, 'scheduled', { ev: 0.05 }),
        item(2, 'scheduled', { ev: 0.11 }),
        item(3, 'scheduled', { tags: [progruz('Away 3', '2.40', '1.97', 18)] }),
        item(4, 'scheduled', { tags: [progruz('Home 4', '2.00', '1.80', 10)] }),
        item(5, 'finished', { ev: 0.3 }),
      ],
      NOW,
    )
    expect(s.value?.match.id).toBe(2)
    expect(s.progruz).toMatchObject({ side: 'away', from: 2.4, to: 1.97 })
    expect(s.progruz?.item.match.id).toBe(3)
    expect(s.progruz?.drop).toBeCloseTo(0.179, 2)
    expect([2, 3]).not.toContain(s.top?.match.id)
    expect(s.total).toBe(5)
  })

  it('разбор прогруза из объяснения тега', () => {
    expect(parseProgruz(item(1, 'scheduled', { tags: [progruz('Home 1', '3.53', '3.08', 13)] }))).toMatchObject({ side: 'home', from: 3.53, to: 3.08 })
    expect(parseProgruz(item(1, 'scheduled', { tags: [{ slug: 'progruz', score: 1, reason: 'упал кэф' }] }))).toBeNull()
    expect(parseProgruz(item(1, 'scheduled'))).toBeNull()
  })

  it('live: число идущих матчей; без live — ближайший матч', () => {
    const live = buildDaySummary([item(1, 'live'), item(2, 'live'), item(3, 'scheduled')], NOW)
    expect(live.liveCount).toBe(2)
    // матчи идут — live первым, ближайший матч — запасной виджет
    expect(summaryCards(live)).toEqual(['live', 'next', 'count'])

    const calm = buildDaySummary([item(1, 'scheduled', { at: 5 }), item(2, 'scheduled', { at: 2 }), item(3, 'scheduled', { at: -1 })], NOW)
    // матч, который по времени уже должен был начаться, — не «ближайший»
    expect(calm.next?.match.id).toBe(2)
    expect(summaryCards(calm)[0]).toBe('next')
  })

  it('голы и фаворит: максимум по тегу ТБ 2.5 и по честному шансу', () => {
    const s = buildDaySummary(
      [
        item(1, 'scheduled', { tags: [{ slug: 'tb-2-5', score: 0.5, reason: 'Вероятность тотала больше 2.5 — 61%' }], x12: [2.5, 3.3, 2.9] }),
        item(2, 'scheduled', { tags: [{ slug: 'tb-2-5', score: 0.9, reason: 'Вероятность тотала больше 2.5 — 72%' }], x12: [1.25, 6.5, 11] }),
        item(3, 'scheduled', { x12: [4.2, 3.6, 1.8] }),
      ],
      NOW,
    )
    expect(s.goals).toMatchObject({ count: 2, p: 0.72 })
    // для мини-графика — матчи с ТБ, самые голевые первыми
    expect(s.goals?.list.map((g) => g.p)).toEqual([0.72, 0.61])
    expect(s.goals?.list[0].title).toBe('Home 2 — Away 2')
    expect(s.goals?.item.match.id).toBe(2)
    expect(s.favorite?.item.match.id).toBe(2)
    expect(s.favorite?.side).toBe('home')
  })

  it('виджетов четыре, value и прогруз — первыми; фаворит не повторяет матч дня', () => {
    const s = buildDaySummary(
      [
        item(1, 'scheduled', { ev: 0.09 }),
        item(2, 'scheduled', { tags: [progruz('Home 2', '2.00', '1.70', 15)] }),
        item(3, 'scheduled', { x12: [1.3, 5.5, 9] }),
        item(4, 'live'),
      ],
      NOW,
    )
    // матч дня — №3 (единственный без value и прогруза) и он же фаворит → фаворита нет в виджетах
    expect(s.top?.match.id).toBe(3)
    expect(s.favorite?.item.match.id).toBe(3)
    expect(summaryCards(s)).toEqual(['value', 'progruz', 'live', 'count'])
  })

  it('фаворит с шансом ниже 60% — не виджет', () => {
    const s = buildDaySummary([item(1, 'scheduled', { x12: [2.6, 3.2, 2.8] }), item(2, 'scheduled', { x12: [1.9, 3.4, 4.2] })], NOW)
    expect(s.favorite?.p).toBeLessThan(0.6)
    expect(summaryCards(s)).not.toContain('favorite')
  })

  it('точки дня: матчи по времени — сыгран, идёт, впереди; перенесённые не считаем', () => {
    const s = buildDaySummary(
      [item(3, 'scheduled', { at: 3 }), item(1, 'finished', { at: -3 }), item(2, 'live', { at: -1 }), item(4, 'postponed', { at: 4 })],
      NOW,
    )
    expect(s.timeline).toEqual(['done', 'live', 'next'])
    // по часам: от первого матча до последнего, пустые часы внутри дня — тоже колонки
    expect(s.hours.map((h) => h.states.length)).toEqual([1, 0, 1, 0, 0, 0, 1])
    expect(s.hours[1].states).toEqual([])
  })

  it('прошедший день: нет открытых матчей — нет и сводки', () => {
    const s = buildDaySummary([item(1, 'finished'), item(2, 'finished')], NOW)
    expect(s.top).toBeNull()
  })
})

describe('меню', () => {
  it('подсвечивает раздел по адресу', () => {
    expect(activeNav('/')).toBe('/')
    expect(activeNav('/matches/2026-10-03')).toBe('/')
    expect(activeNav('/match/milan-cagliari-123')).toBe('/')
    expect(activeNav('/tag/value')).toBe('/tag/value')
    expect(activeNav('/tag/progruz')).toBe('/tags')
    expect(activeNav('/tags')).toBe('/tags')
    expect(activeNav('/league/england-premier-league-39')).toBe('/leagues')
    expect(activeNav('/bookmakers/fonbet')).toBe('/bookmakers')
    expect(activeNav('/about')).toBeNull()
  })
})
