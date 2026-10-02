import { describe, expect, it } from 'vitest'
import { activeNav } from '@/components/NavCapsule'
import type { FeedItem, MatchSummary } from '@/lib/data'
import { buildDaySummary, edgeTone, parseProgruz } from '@/lib/day-summary'
import type { Match } from '@/lib/types'

const NOW = Date.UTC(2026, 9, 2, 12)
const team = (id: number, name: string) => ({ id, name, original: name, logo: null, country: 'England' })
const q = (value: number) => ({ value, opening: null })

type Opts = {
  tags?: FeedItem['tags']
  pick?: Partial<NonNullable<MatchSummary['pick']>>
  x12?: [number, number, number]
  at?: number
  league?: number
}

function item(id: number, status: Match['status'], { tags = [], pick, x12, at = id, league = 39 }: Opts = {}): FeedItem {
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
    league: { id: league, name: 'Англия. Премьер-лига', original: 'Premier League', country: 'England', countryCode: 'GB' },
    season: null,
    round: null,
    odds: x12 ? { x12: { home: q(x12[0]), draw: q(x12[1]), away: q(x12[2]) }, totals: [], btts: null, dc: null } : null,
  }
  const summary: MatchSummary | null = pick
    ? {
        id,
        tags,
        at: 0,
        pick: { key: 'home', label: 'П1', prob: 0.5, odd: 2.2, bookmaker: 'Фонбет', partnerSlug: 'fonbet', ev: 0.1, kind: 'value', ...pick },
      }
    : null
  return { match, tags, summary }
}

const progruz = (team: string, from: string, to: string, pct: number) => ({
  slug: 'progruz',
  score: pct / 20,
  reason: `Коэффициент на победу «${team}» упал с ${from} до ${to} (−${pct}%)`,
})

describe('главное за день', () => {
  it('ставки дня: сначала value по перевесу, потом уверенные исходы; сыгранные и копеечные кэфы — мимо', () => {
    const s = buildDaySummary(
      [
        item(1, 'scheduled', { pick: { ev: 0.05 } }),
        item(2, 'scheduled', { pick: { ev: 0.11 } }),
        item(3, 'scheduled', { pick: { kind: 'probability', prob: 0.7, odd: 1.6, ev: -0.02 } }),
        item(4, 'scheduled', { pick: { kind: 'probability', prob: 0.85, odd: 1.15, ev: -0.02 } }),
        item(5, 'finished', { pick: { ev: 0.3 } }),
        item(6, 'scheduled', { pick: { kind: 'probability', prob: 0.6, odd: 1.9, ev: 0.01 } }),
      ],
      NOW,
    )
    expect(s.picks.map((p) => p.item.match.id)).toEqual([2, 1, 3, 6])
    expect(s.picks[0]).toMatchObject({ kind: 'value', partnerSlug: 'fonbet', label: 'П1' })
    expect(s.picks[0].fair).toBeCloseTo(2, 5)
  })

  it('«почему» у value-ставки — другой тег: перевес уже написан на кнопке', () => {
    const tags = [
      { slug: 'value', score: 1, reason: 'П1 за 2.20 при справедливом 2.00' },
      { slug: 'krepost', score: 0.6, reason: '«Home 1» не проигрывает дома 7 матчей подряд' },
    ]
    const [value] = buildDaySummary([item(1, 'scheduled', { tags, pick: {} })], NOW).picks
    expect(value.why?.slug).toBe('krepost')
    const [sure] = buildDaySummary([item(1, 'scheduled', { tags: tags.slice(0, 1), pick: { kind: 'probability', ev: -0.01 } })], NOW).picks
    expect(sure.why?.slug).toBe('value')
  })

  it('пока матчи не разобраны — фавориты громких матчей по коротким кэфам', () => {
    const s = buildDaySummary(
      [item(1, 'scheduled', { x12: [1.5, 4.2, 6.5] }), item(2, 'scheduled', { x12: [2.6, 3.2, 2.8] }), item(3, 'scheduled', { x12: [4.5, 3.8, 1.75] })],
      NOW,
    )
    expect(s.picks.map((p) => [p.item.match.id, p.label, p.kind])).toEqual([
      [1, 'П1', 'favorite'],
      [3, 'П2', 'favorite'],
    ])
  })

  it('прогрузы: самые сильные падения кэфа, сторона и цифры — из объяснения тега', () => {
    const s = buildDaySummary(
      [
        item(1, 'scheduled', { tags: [progruz('Away 1', '2.40', '1.97', 18)] }),
        item(2, 'scheduled', { tags: [progruz('Home 2', '2.00', '1.80', 10)] }),
        item(3, 'finished', { tags: [progruz('Home 3', '3.00', '2.00', 33)] }),
      ],
      NOW,
    )
    expect(s.drops.map((d) => d.item.match.id)).toEqual([1, 2])
    expect(s.drops[0]).toMatchObject({ side: 'away', from: 2.4, to: 1.97 })
    expect(parseProgruz(item(9, 'scheduled', { tags: [{ slug: 'progruz', score: 1, reason: 'упал кэф' }] }))).toBeNull()
  })

  it('live — по важности турнира; без live — ближайшие матчи по времени', () => {
    const live = buildDaySummary([item(1, 'live'), item(2, 'live', { league: 999 }), item(3, 'scheduled')], NOW)
    expect(live.liveCount).toBe(2)
    expect(live.live[0].match.id).toBe(1)

    const calm = buildDaySummary([item(1, 'scheduled', { at: 5 }), item(2, 'scheduled', { at: 2 }), item(3, 'scheduled', { at: -1 })], NOW)
    // матч, который по времени уже должен был начаться, — не «ближайший»
    expect(calm.upcoming.map((u) => u.match.id)).toEqual([2, 1])
  })

  it('яркость кнопки ставки — по силе перевеса', () => {
    expect(edgeTone(0.11)).toBe('hot')
    expect(edgeTone(0.06)).toBe('lime')
    expect(edgeTone(0.03)).toBe('soft')
    expect(edgeTone(-0.02)).toBe('none')
    expect(edgeTone(null)).toBe('none')
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
