import { describe, expect, it } from 'vitest'
import { getMatchInsights, getMatchesByDate, getStandings, tagsFor } from '@/lib/data'
import { todayYmd, addDays } from '@/lib/format'

describe('демо-данные: сквозной расчёт', () => {
  it('на каждый день есть матчи с короткими кэфами', async () => {
    for (let i = -1; i <= 2; i++) {
      const list = await getMatchesByDate(addDays(todayYmd(), i))
      expect(list.length).toBeGreaterThan(10)
      expect(list.some((m) => m.odds?.x12)).toBe(true)
    }
  })
  it('инсайты матча: линия, модель, форма, теги, текст', async () => {
    const list = await getMatchesByDate(addDays(todayYmd(), 1))
    const m = list.find((x) => x.league.id === 39) ?? list[0]
    const ins = await getMatchInsights(m.id)
    expect(ins).not.toBeNull()
    expect(ins!.books.length).toBeGreaterThan(3)
    expect(ins!.model).not.toBeNull()
    expect(ins!.homeForm?.games.length).toBeGreaterThan(3)
    expect(ins!.preview.length).toBeGreaterThan(2)
    expect(ins!.pick).not.toBeNull()
    // после разбора теги матча доступны в ленте без запросов к API
    expect(tagsFor(m).summary?.id).toBe(m.id)
  })
  it('таблица лиги с названиями команд', async () => {
    const st = await getStandings(39, 2026)
    expect(st?.groups[0].rows.length).toBe(20)
    expect(st?.groups[0].rows[0].team).not.toMatch(/Команда #/)
  })
  it('несуществующий матч → null', async () => {
    expect(await getMatchInsights(999)).toBeNull()
  })
})
