import { describe, expect, it } from 'vitest'
import { isNationsCup, leagueTier, searchText } from '@/lib/league-index'

describe('страница «Лиги»', () => {
  it('взрослые турниры — раньше плей-офф, женских и молодёжных', () => {
    expect(leagueTier('League One')).toBe(0)
    expect(leagueTier('FA Cup')).toBe(0)
    expect(leagueTier('National League - Play-offs')).toBe(1)
    expect(leagueTier('Africa Cup of Nations - Qualification')).toBe(1)
    expect(leagueTier("FA Women's Cup")).toBe(2)
    expect(leagueTier('FA WSL')).toBe(2)
    expect(leagueTier('FA Youth Cup')).toBe(3)
    expect(leagueTier('Brasileiro U20 A')).toBe(3)
    expect(leagueTier('Campionato Primavera - 1')).toBe(3)
  })
  it('международные — клубные отдельно от сборных', () => {
    expect(isNationsCup('UEFA Nations League')).toBe(true)
    expect(isNationsCup('World Cup - Qualification Europe')).toBe(true)
    expect(isNationsCup('Friendlies')).toBe(true)
    expect(isNationsCup('Confederations Cup')).toBe(true)
    expect(isNationsCup('UEFA U19 Championship')).toBe(true)
    expect(isNationsCup('CONMEBOL Libertadores')).toBe(false)
    expect(isNationsCup('AFC Champions League Elite')).toBe(false)
    expect(isNationsCup('UEFA Super Cup')).toBe(false)
    expect(isNationsCup('Friendlies Clubs')).toBe(false)
    expect(isNationsCup('ASEAN Club Championship')).toBe(false)
  })
  it('поиск — без регистра и «ё»', () => {
    expect(searchText('Шотландия', 'Scotland')).toBe('шотландия scotland')
    expect(searchText('Тёркс и Кайкос')).toBe('теркс и кайкос')
  })
})
