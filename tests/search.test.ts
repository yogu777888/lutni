import { describe, expect, it } from 'vitest'
import { getLeagues, getMatchesByDate } from '@/lib/data'
import { todayYmd } from '@/lib/format'
import { hits, searchLeagues, searchMatches } from '@/lib/search'

describe('поиск', () => {
  it('начало слова, без регистра и «ё», по-русски и в оригинале', () => {
    expect(hits('Барселона', 'бар')).toBe(true)
    expect(hits('Барселона', 'сел')).toBe(false)
    expect(hits('Реал Мадрид', 'реал мад')).toBe(true)
    expect(hits('Бёрнли', 'берн')).toBe(true)
    expect(hits('Atlético Madrid', 'atletico')).toBe(true)
  })

  it('демо: находит матч команды и турнир', async () => {
    const ms = await getMatchesByDate(todayYmd())
    const found = searchMatches(ms, 'барс')
    expect(found.some((m) => m.home.name === 'Барселона' || m.away.name === 'Барселона')).toBe(true)
    expect(searchLeagues(await getLeagues(), 'ла лиг').length).toBeGreaterThan(0)
  })
})
