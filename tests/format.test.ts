import { describe, expect, it } from 'vitest'
import { addDays, idFromSlug, plural, slugify, tzOffsetHours, ymdInTz } from '@/lib/format'
import { flagCode } from '@/lib/flags'
import { ruCountry, ruLeague, ruTeam } from '@/lib/i18n/ru'
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
    // турниры по частям и команды сезона 2026/27 (настоящий API, суббота 17 октября)
    expect(ruLeague('Second League - Group 3', 'Russia')).toBe('Россия. Вторая лига, группа 3')
    expect(ruLeague('Second League A - Division A Silver', 'Russia')).toBe('Россия. Вторая лига А, серебряная группа')
    expect(ruLeague('Serie C - Girone B', 'Italy')).toBe('Италия. Серия C, группа B')
    expect(ruLeague('Campionato Primavera - 1', 'Italy')).toBe('Италия. Примавера 1')
    expect(ruLeague('Oberliga - Bayern Süd', 'Germany')).toBe('Германия. Оберлига, Бавария-Юг')
    expect(ruLeague('U18 Premier League - North', 'England')).toBe('Англия. Премьер-лига U18, Север')
    expect(ruLeague('Tercera División RFEF - Group 12', 'Spain')).toBe('Испания. Терсера RFEF, группа 12')
    expect(ruLeague('Unknown League - Something', 'Spain')).toBe('Испания. Unknown League - Something')
    expect(ruTeam('Krylia Sovetov')).toBe('Крылья Советов')
    expect(ruTeam('Gençlerbirliği S.K.')).toBe('Генчлербирлиги')
    expect(ruTeam('Raków Częstochowa')).toBe('Ракув')
    // сборные — по словарю стран, с припиской (на «Лиге наций» стояли «Türkiye», «Belgium»)
    expect(ruTeam('Türkiye')).toBe('Турция')
    expect(ruTeam('Belgium')).toBe('Бельгия')
    expect(ruTeam('Russia U21')).toBe('Россия U21')
    expect(ruTeam('Norway W')).toBe('Норвегия (жен.)')
    expect(ruTeam('Mexico W U17')).toBe('Мексика U17 (жен.)')
    expect(ruTeam('Cape Verde Islands')).toBe('Кабо-Верде')
    expect(ruTeam('Manchester United U21')).toBe('Манчестер Юнайтед U21')
    expect(ruTeam('World')).toBe('World')
    // страны турниров, которых не было в словаре (шли по-английски через дефис)
    expect(ruLeague('1st Division', 'Albania')).toMatch(/^Албания\. /)
    expect(ruCountry('Antigua-And-Barbuda')).toBe('Антигуа и Барбуда')
    expect(ruLeague('FA Cup', 'England')).toBe('Англия. Кубок Англии')
    expect(ruLeague('FA Cup', 'Scotland')).toBe('Шотландия. Кубок страны')
    expect(ruLeague('FA Cup', 'China')).toBe('Китай. Кубок страны')
    expect(ruCountry('Congo-DR')).toBe('ДР Конго')
    expect(flagCode({ country: 'Congo-DR', countryCode: 'CG' })).toBe('cd')
    expect(flagCode({ country: 'Congo', countryCode: 'CD' })).toBe('cg')
    expect(ruRound('Regular Season - 12')).toBe('12-й тур')
    expect(ruRound('Round of 16')).toBe('1/8 финала')
    // названия туров с настоящего API
    expect(ruRound('Clausura - 11')).toBe('Клаусура, 11-й тур')
    expect(ruRound('Apertura - 4')).toBe('Апертура, 4-й тур')
    expect(ruRound('Girone A - 10')).toBe('Группа A, 10-й тур')
    expect(ruRound('Group 2 - 26')).toBe('Группа 2, 26-й тур')
    expect(ruRound('1st Phase - 5')).toBe('1-й этап, 5-й тур')
    expect(ruRound('Championship Group - 4')).toBe('Группа за чемпионство, 4-й тур')
    expect(ruRound('League Stage - 2')).toBe('Общий этап, 2-й тур')
    expect(ruRound('Bayern - 15', 'Regionalliga - Bayern')).toBe('15-й тур')
    expect(ruRound('Fall Season - 4', 'U21 Divisie 1')).toBe('Fall Season, 4-й тур')
    expect(ruRound('4th Round Qualifying')).toBe('4-й квалификационный раунд')
    expect(ruRound('2nd Preliminary Round')).toBe('2-й предварительный раунд')
    expect(ruRound('Regular Season')).toBeNull()
    expect(ruRound('Group Stage')).toBe('Групповой этап')
    expect(ruRound('Group Stage - 1')).toBe('Групповой этап, 1-й тур')
  })
})

describe('топ-лиги', async () => {
  const { featuredRank, countryRank } = await import('@/config/leagues')
  it('узнаёт турниры по ID, по названию и с разными «странами» у еврокубков', () => {
    const ucl = featuredRank({ id: 2, name: 'x', country: '' })
    expect(ucl).toBeGreaterThanOrEqual(0)
    expect(featuredRank({ id: 99999, name: 'Champions League', country: 'Europe' })).toBe(ucl)
    expect(featuredRank({ id: 99999, name: 'UEFA Champions League', country: 'World' })).toBe(ucl)
    expect(featuredRank({ id: 99998, name: 'UEFA Conference League', country: '' })).toBe(
      featuredRank({ id: 848, name: '', country: '' }),
    )
    expect(featuredRank({ id: 99997, name: 'Premier League', country: 'England' })).toBe(featuredRank({ id: 39, name: '', country: '' }))
    // одноимённая лига другой страны — не топ
    expect(featuredRank({ id: 99996, name: 'Premier League', country: 'Ukraine' })).toBe(-1)
    expect(featuredRank({ id: 99995, name: 'National League', country: 'England' })).toBe(-1)
  })
  it('порядок стран', () => {
    expect(countryRank('Russia')).toBeLessThan(countryRank('England'))
    expect(countryRank('England')).toBeLessThan(countryRank('Peru'))
  })
})
