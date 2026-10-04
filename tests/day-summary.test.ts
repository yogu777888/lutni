import { describe, expect, it } from 'vitest'
import { activeNav } from '@/components/NavCapsule'
import type { FeedItem, MatchSummary } from '@/lib/data'
import { buildDaySummary, dayStats, parseProgruz } from '@/lib/day-summary'
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

    const calm = buildDaySummary([item(1, 'scheduled', { at: 5 }), item(2, 'scheduled', { at: 2 }), item(3, 'scheduled', { at: -1 })], NOW)
    // матч, который по времени уже должен был начаться, — не «ближайший»
    expect(calm.next?.match.id).toBe(2)
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

  it('плитки: по одному матчу на вопрос, без матча дня и без начавшихся', () => {
    const tb = (p: number) => ({ slug: 'tb-2-5', score: p, reason: `Скорее будет 3 гола и больше: шанс ${Math.round(p * 100)}%`, p })
    const s = buildDaySummary(
      [
        item(1, 'scheduled', { ev: 0.09 }),
        item(2, 'scheduled', { tags: [progruz('Home 2', '2.00', '1.70', 15)] }),
        item(3, 'scheduled', { x12: [1.3, 5.5, 9] }),
        item(4, 'live', { tags: [tb(0.8), progruz('Home 4', '2.40', '1.80', 25)] }),
        item(5, 'scheduled', { x12: [1.4, 4.8, 7.5], tags: [tb(0.66)] }),
      ],
      NOW,
    )
    const top = s.top!.match.id
    const st = dayStats(s)
    const ids = [st.favorite?.item.match.id, st.goals?.item.match.id, st.drop?.item.match.id, st.value?.match.id]
    // матча дня в плитках нет — он и так крупно сверху
    expect(ids).not.toContain(top)
    // идущий №4 — сильнее всех по голам и падению кэфа, но цифры в плитках доматчевые
    expect(ids).not.toContain(4)
    expect(st.goals?.item.match.id).toBe(5)
    expect(st.favorite?.p).toBeGreaterThanOrEqual(0.6)
    if (top !== 2) expect(st.drop?.item.match.id).toBe(2)
    if (top !== 1) expect(st.value?.match.id).toBe(1)
  })

  it('плитки по возможности про разные матчи, но лучше повтор, чем пустая плитка', () => {
    const tb = (p: number) => ({ slug: 'tb-2-5', score: p, reason: `Скорее будет 3 гола и больше: шанс ${Math.round(p * 100)}%`, p })
    const s = buildDaySummary(
      [
        item(1, 'scheduled', { x12: [2.6, 3.2, 2.8] }),
        item(2, 'scheduled', { x12: [1.3, 5.5, 9], tags: [tb(0.7)] }),
        item(3, 'scheduled', { x12: [1.4, 4.8, 7.5], tags: [tb(0.62)] }),
        item(4, 'scheduled', { x12: [1.5, 4.2, 6.5] }),
      ],
      NOW,
    )
    const st = dayStats(s)
    const top = s.top!.match.id
    expect([st.favorite?.item.match.id, st.goals?.item.match.id]).not.toContain(top)
    // голы есть только у одного матча, кроме матча дня, — он и в плитке, даже если уже занят фаворитом
    expect(st.goals).not.toBeNull()
    if (s.lists.goals.length > 1) expect(st.goals?.item.match.id).not.toBe(st.favorite?.item.match.id)
  })

  it('подборки: по несколько матчей, сильнейшие первыми, без матча дня', () => {
    const tb = (p: number) => ({ slug: 'tb-2-5', score: p, reason: `Скорее будет 3 гола и больше: шанс ${Math.round(p * 100)}%`, p })
    const s = buildDaySummary(
      [
        item(1, 'scheduled', { ev: 0.04, x12: [1.25, 6.5, 11], tags: [tb(0.66)] }),
        item(2, 'scheduled', { ev: 0.12, x12: [1.5, 4.2, 6.5], tags: [tb(0.6), progruz('Home 2', '1.80', '1.50', 17)] }),
        item(3, 'scheduled', { x12: [2.6, 3.2, 2.8], tags: [tb(0.71), progruz('Away 3', '3.00', '2.70', 10)] }),
        item(4, 'scheduled', { x12: [7.5, 4.8, 1.4] }),
        item(5, 'live'),
        item(6, 'live'),
      ],
      NOW,
    )
    const ids = (xs: { match: { id: number } }[]) => xs.map((x) => x.match.id)
    const top = s.top!.match.id
    // кандидаты для плиток — только ещё не начавшиеся
    const all = [...ids(s.lists.values), ...s.lists.goals.map((g) => g.item.match.id), ...s.lists.drops.map((d) => d.item.match.id)]
    expect(all).not.toContain(5)
    expect(all).not.toContain(6)
    // фаворит — от 60%, самый уверенный первым; матча дня в подборках нет
    const favs = s.lists.favorites.map((f) => f.item.match.id)
    expect(favs).not.toContain(3)
    expect(favs).not.toContain(top)
    expect(s.lists.favorites.every((f) => f.p >= 0.6)).toBe(true)
    expect(s.lists.favorites.map((f) => f.p)).toEqual([...s.lists.favorites.map((f) => f.p)].sort((a, b) => b - a))
    expect(s.lists.goals.map((g) => g.p)).toEqual([...s.lists.goals.map((g) => g.p)].sort((a, b) => b - a))
    expect(s.lists.goals.map((g) => g.item.match.id)).not.toContain(top)
    expect(ids(s.lists.values)).not.toContain(top)
    expect(s.lists.drops.map((d) => d.item.match.id)).not.toContain(top)
    expect(s.lists.drops.map((d) => d.drop)).toEqual([...s.lists.drops.map((d) => d.drop)].sort((a, b) => b - a))
  })

  it('карусель матча дня: матч дня первым, дальше — по одному из каждой другой топ-лиги', () => {
    const inLeague = (it: FeedItem, id: number, name: string): FeedItem => ({ ...it, match: { ...it.match, league: { ...it.match.league, id, name } } })
    const s = buildDaySummary(
      [
        item(1, 'scheduled', { ev: 0.05 }),
        inLeague(item(2, 'scheduled'), 140, 'Испания. Ла Лига'),
        inLeague(item(3, 'scheduled'), 140, 'Испания. Ла Лига'),
        inLeague(item(4, 'scheduled'), 78, 'Германия. Бундеслига'),
        item(5, 'scheduled'),
      ],
      NOW,
    )
    expect(s.tops[0]).toBe(s.top)
    const leagues = s.tops.map((t) => t.match.league.id)
    expect(new Set(leagues).size).toBe(leagues.length)
    expect(leagues.sort()).toEqual([140, 39, 78].sort())
  })

  it('фаворит с шансом ниже 60% — не виджет', () => {
    const s = buildDaySummary([item(1, 'scheduled', { x12: [2.6, 3.2, 2.8] }), item(2, 'scheduled', { x12: [1.9, 3.4, 4.2] })], NOW)
    expect(s.favorite?.p).toBeLessThan(0.6)
    expect(dayStats(s).favorite).toBeNull()
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
