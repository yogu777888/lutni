import { describe, expect, it } from 'vitest'
import { eventKind, visibleStats } from '../lib/sstats/normalize'
import { scorers } from '../components/match/EventsBlock'
import type { MatchEvent } from '../lib/types'

const ev = (type: number, name: string) => ({ teamId: 1, elapsed: 10, type, name })

describe('eventKind', () => {
  it('решения VAR — не голы и не карточки (названия из настоящего API)', () => {
    expect(eventKind(ev(4, 'Penalty confirmed'))).toBe('var')
    expect(eventKind(ev(4, 'Red card cancelled'))).toBe('var')
    expect(eventKind(ev(4, 'Goal cancelled'))).toBe('var')
    expect(eventKind(ev(1, 'Goal Disallowed - offside'))).toBe('var')
  })

  it('голы, пенальти и карточки — как были', () => {
    expect(eventKind(ev(1, 'Normal Goal'))).toBe('goal')
    expect(eventKind(ev(1, 'Penalty'))).toBe('penalty')
    expect(eventKind(ev(1, 'Own Goal'))).toBe('own-goal')
    expect(eventKind(ev(1, 'Missed Penalty'))).toBe('missed-penalty')
    expect(eventKind(ev(2, 'Yellow Card'))).toBe('yellow')
    expect(eventKind(ev(2, 'Red Card'))).toBe('red')
    expect(eventKind(ev(3, 'Substitution 1'))).toBe('sub')
  })
})

describe('scorers', () => {
  it('назначенный VAR и незабитый пенальти — не автор гола («Junior» — «Deportivo Pereira» 1:1)', () => {
    const raw: [number, number, string, 'home' | 'away', string][] = [
      [5, 1, 'Normal Goal', 'home', 'J. Peña'],
      [44, 4, 'Penalty confirmed', 'home', 'K. Pérez'],
      [45, 1, 'Missed Penalty', 'home', 'L. Muriel'],
      [58, 1, 'Normal Goal', 'away', 'Á. Plata'],
    ]
    const events: MatchEvent[] = raw.map(([minute, type, name, side, player]) => ({
      minute,
      extra: null,
      side,
      kind: eventKind({ teamId: 1, elapsed: minute, type, name }),
      player,
      assist: null,
    }))
    expect(scorers(events, { home: 1, away: 1 })).toEqual({ home: ['J. Peña 5′'], away: ['Á. Plata 58′'] })
  })
})

describe('visibleStats', () => {
  it('«Красные карточки 0 : 0» не показываем, жёлтые 0 : 0 — показываем', () => {
    const s = (key: string, home: number, away: number) => ({ key, label: key, home, away })
    const keys = visibleStats([s('redCards', 0, 0), s('yellowCards', 0, 0), s('fouls', 0, 0), s('redCards', 1, 0)]).map((x) => `${x.key}:${x.home}`)
    expect(keys).toEqual(['yellowCards:0', 'redCards:1'])
  })
})
