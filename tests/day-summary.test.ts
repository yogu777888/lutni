import { describe, expect, it } from 'vitest'
import { activeNav } from '@/components/NavCapsule'
import type { FeedItem, MatchSummary } from '@/lib/data'
import { dayCounts, goalsPicks, linePicks, mainMatches, moveExample } from '@/lib/day-summary'
import type { OddsSnap } from '@/lib/lines'
import type { BookOdds } from '@/lib/odds'
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

/** Снимок линии одного партнёра (Фонбет): 1X2 с открытием и пара тотала 2,5. */
function snapFor(x12: [number, number, number], open: [number, number, number] | null, ou?: [number, number]): OddsSnap {
  const qq = (v: number, o: number | null) => ({ value: v, opening: o })
  const book: BookOdds = {
    bookmakerId: 1,
    bookmakerName: 'Fonbet',
    x12: { home: qq(x12[0], open?.[0] ?? null), draw: qq(x12[1], open?.[1] ?? null), away: qq(x12[2], open?.[2] ?? null) },
    totals: ou ? [{ line: 2.5, over: qq(ou[0], null), under: qq(ou[1], null) }] : [],
    btts: null,
    dc: null,
  }
  return { books: [book], at: NOW }
}

describe('сводка дня', () => {
  it('«Все матчи»: настоящие количества дня и ближайший матч', () => {
    const c = dayCounts([item(1, 'live'), item(2, 'scheduled'), item(3, 'scheduled', { at: -5 }), item(4, 'finished')], NOW)
    expect(c).toMatchObject({ total: 4, live: 1, finished: 1, leagues: 1 })
    // ближайший — впереди по времени, а не уже прошедший по расписанию
    expect(c.next?.match.id).toBe(2)
  })

  it('«Голевые матчи»: шанс по паре ТБ/ТМ одного букмекера, от порога, сильнейшие первыми; без линии — мимо', () => {
    const snaps = new Map<number, OddsSnap>([
      [1, snapFor([2, 3.4, 3.6], null, [1.6, 2.4])], // 1/1.6 / (1/1.6 + 1/2.4) = 60%
      [2, snapFor([2, 3.4, 3.6], null, [2.05, 1.8])], // 47% — ниже порога
      [3, snapFor([2, 3.4, 3.6], null, [1.5, 2.65])], // 64%
    ])
    const day = [item(1, 'scheduled'), item(2, 'scheduled'), item(3, 'finished'), item(4, 'scheduled')]
    const { picks, covered } = goalsPicks(day, (id) => snaps.get(id) ?? null)
    expect(covered).toBe(3)
    expect(picks.map((p) => p.it.match.id)).toEqual([3, 1])
    expect(picks[0].g).toMatchObject({ bookmaker: 'Фонбет', over: 1.5, under: 2.65 })
    expect(picks[1].g.p).toBeCloseTo(0.6, 3)
  })

  it('«Движение коэффициентов»: открытие → последнее значение одного букмекера; пример — сначала доматчевый', () => {
    const snaps = new Map<number, OddsSnap>([
      [1, snapFor([1.97, 3.5, 4], [2.4, 3.4, 3.6])], // идёт: −18% на хозяев
      [2, snapFor([2.79, 3.2, 2.6], [3.1, 3.1, 2.5])], // впереди: −10% на хозяев
      [3, snapFor([2, 3.4, 3.6], null)], // без кэфов открытия — движения нет
    ])
    const snapOf = (id: number) => snaps.get(id) ?? null
    const day = [item(1, 'live'), item(2, 'scheduled'), item(3, 'scheduled')]
    const { picks, covered } = linePicks(day, snapOf, { min: 0.08 })
    expect(covered).toBe(2)
    expect(picks[0]).toMatchObject({ mv: { key: 'home', from: 2.4, to: 1.97 } })
    expect(picks[0].it.match.id).toBe(1)
    // пример для плитки: ещё не начавшийся матч важнее большего падения в идущем
    expect(moveExample(day, snapOf)?.it.match.id).toBe(2)
    // доматчевых движений нет — пример из идущего
    expect(moveExample([item(1, 'live'), item(3, 'scheduled')], snapOf)?.mv).toMatchObject({ key: 'home', from: 2.4, to: 1.97 })
    expect(moveExample([item(3, 'scheduled')], snapOf)).toBeNull()
  })

  it('главные матчи: по важности турнира, сначала по одному на лигу; идущие и предстоящие важнее сыгранных', () => {
    const inLeague = (it: FeedItem, id: number, name: string): FeedItem => ({ ...it, match: { ...it.match, league: { ...it.match.league, id, name } } })
    const apl = (n: number, st: Match['status']) => item(n, st) // id 39 — АПЛ
    const liga = (n: number, st: Match['status']) => inLeague(item(n, st), 140, 'Испания. Ла Лига')
    const other = (n: number) => inLeague(item(n, 'scheduled'), 999, 'Кипр. Первый дивизион')
    const day = [apl(1, 'scheduled'), apl(2, 'live'), liga(3, 'scheduled'), other(4), apl(5, 'finished'), liga(6, 'postponed')]
    const ids = mainMatches(day).map((it) => it.match.id)
    // сыгранный и перенесённый — мимо, пока впереди есть матчи
    expect(ids).not.toContain(5)
    expect(ids).not.toContain(6)
    // топ-лиги раньше безвестного турнира, и по одной встрече на лигу прежде повтора лиги
    expect(ids.indexOf(4)).toBeGreaterThan(ids.indexOf(3))
    expect(new Set(ids.slice(0, 2).map((id) => day.find((it) => it.match.id === id)!.match.league.id)).size).toBe(2)
    // день сыгран (вчера) — сыгранные матчи, по важности
    expect(mainMatches([apl(7, 'finished'), other(8)].map((it) => ({ ...it, match: { ...it.match, status: 'finished' as const } }))).map((it) => it.match.id)[0]).toBe(7)
    expect(mainMatches([apl(1, 'scheduled')], 1)).toHaveLength(1)
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
