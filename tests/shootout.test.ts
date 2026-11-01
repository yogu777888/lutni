import { describe, expect, it } from 'vitest'
import { splitShootout } from '@/lib/sstats/normalize'
import { resultNote } from '@/lib/match-result'
import type { MatchEvent } from '@/lib/types'

const e = (minute: number, extra: number | null, side: 'home' | 'away', kind: MatchEvent['kind'], player = 'x'): MatchEvent => ({ minute, extra, side, kind, player, assist: null })

// «Атлетико Тукуман» — «Платенсе», Copa Argentina, 29 октября 2026 (настоящий ответ /Games/1643513): 1:1, удары серии —
// события «Penalty» на 120+N′ (доп. времени в турнире нет), `homePenaltyResult` пустой
const real = [
  e(36, null, 'home', 'goal', 'R. Tesuri'),
  e(58, null, 'away', 'goal', 'N. Retamar'),
  e(120, 1, 'home', 'penalty'),
  e(120, 1, 'away', 'penalty'),
  e(120, 2, 'away', 'penalty'),
  e(120, 2, 'home', 'penalty'),
  e(120, 3, 'home', 'penalty'),
  e(120, 3, 'away', 'penalty'),
  e(120, 4, 'home', 'penalty'),
  e(120, 4, 'away', 'penalty'),
  e(120, 5, 'home', 'missed-penalty'),
  e(120, 5, 'away', 'penalty'),
]

describe('splitShootout', () => {
  it('удары серии — не голы, счёт серии из них', () => {
    const r = splitShootout(real, { statusCode: 10, score: { home: 1, away: 1 } })
    expect(r.shootout).toEqual({ home: 4, away: 5 })
    expect(r.events).toHaveLength(2)
  })
  it('не «после пенальти» — ничего не трогаем', () => {
    expect(splitShootout(real, { statusCode: 9, score: { home: 1, away: 1 } }).shootout).toBeNull()
  })
  it('без ударов голы не сходятся со счётом (пенальти на 120+1′ в доп. время) — ничего не трогаем', () => {
    const r = splitShootout([e(30, null, 'home', 'goal'), e(120, 1, 'away', 'penalty'), e(120, 3, 'home', 'penalty')], { statusCode: 10, score: { home: 1, away: 1 } })
    expect(r.shootout).toBeNull()
    expect(r.events).toHaveLength(3)
  })
  it('итог словами — победитель серии', () => {
    const { events, shootout } = splitShootout(real, { statusCode: 10, score: { home: 1, away: 1 } })
    const m = { home: { id: 1, name: 'Атлетико Тукуман' }, away: { id: 2, name: 'Платенсе' }, score: { home: 1, away: 1 }, statusCode: 10 } as never
    expect(resultNote(m, events, shootout)!.title).toBe('Победа «Платенсе» по пенальти — 1:1, серия 5:4')
  })
})
