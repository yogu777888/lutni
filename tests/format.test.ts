import { describe, expect, it } from 'vitest'
import { addDays, idFromSlug, plural, slugify, tzOffsetHours, ymdInTz } from '@/lib/format'
import { ruLeague, ruTeam } from '@/lib/i18n/ru'
import { ruRound } from '@/lib/sstats/normalize'

describe('format', () => {
  it('plural', () => {
    const f = ['матч', 'матча', 'матчей'] as const
    expect([1, 2, 5, 11, 12, 21, 22, 25, 111].map((n) => plural(n, f))).toEqual([
      'матч', 'матча', 'матчей', 'матчей', 'матчей', 'матч', 'матча', 'матчей', 'матчей',
    ])
  })
  it('slugify', () => {
    expect(slugify('Bayern München')).toBe('bayern-munchen')
    expect(slugify('Атлетико Мадрид')).toBe('atletiko-madrid')
    expect(slugify('1. FC Köln — Hamburger SV')).toBe('1-fc-koln-hamburger-sv')
    expect(idFromSlug('123456-arsenal-chelsea')).toBe(123456)
    expect(idFromSlug('arsenal')).toBeNull()
  })
  it('даты в МСК', () => {
    expect(tzOffsetHours('Europe/Moscow')).toBe(3)
    expect(ymdInTz(Date.parse('2026-09-30T22:30:00Z'), 'Europe/Moscow')).toBe('2026-10-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })
  it('русские названия', () => {
    expect(ruTeam('Manchester United')).toBe('Манчестер Юнайтед')
    expect(ruTeam('Bayern München')).toBe('Бавария')
    expect(ruTeam('Unknown FC')).toBe('Unknown FC')
    expect(ruLeague('Premier League', 'England')).toBe('Англия. Премьер-лига')
    expect(ruLeague('Premier League', 'Russia')).toBe('Россия. Премьер-лига')
    expect(ruLeague('UEFA Champions League', 'World')).toBe('Лига чемпионов УЕФА')
    expect(ruRound('Regular Season - 12')).toBe('12-й тур')
    expect(ruRound('Round of 16')).toBe('1/8 финала')
  })
})
