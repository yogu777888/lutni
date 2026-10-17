import { describe, expect, it } from 'vitest'
import { getMatchInsights, getMatchesByDate } from '@/lib/data'
import { addDays, todayYmd } from '@/lib/format'
import { buildStory } from '@/lib/story'

describe('сторис матча', () => {
  it('предстоящий матч: вероятности, голы, форма, прогноз и кнопка партнёра', async () => {
    const list = await getMatchesByDate(addDays(todayYmd(), 1))
    const m = list.find((x) => x.league.id === 39) ?? list[0]
    const ins = await getMatchInsights(m.id)
    const story = buildStory(ins!)
    expect(story).not.toBeNull()
    const kinds = story!.slides.map((s) => s.kind)
    expect(kinds[0]).toBe('cover')
    expect(kinds).toEqual(expect.arrayContaining(['odds', 'goals', 'form']))
    // до начала — без «Кто сильнее», точного счёта таблицей и прочего: не больше пяти слайдов
    expect(kinds.length).toBeLessThanOrEqual(5)
    // вероятности 1X2 в сумме — 100%
    const odds = story!.slides.find((s) => s.kind === 'odds')
    if (odds?.kind === 'odds') expect(odds.probs.home + odds.probs.draw + odds.probs.away).toBeCloseTo(1, 5)
    // три самых вероятных счёта — по убыванию
    const g = story!.slides.find((s) => s.kind === 'goals')
    if (g?.kind === 'goals') expect(g.scores.map((x) => x.p)).toEqual([...g.scores.map((x) => x.p)].sort((a, b) => b - a))
    // прогноз — последним слайдом, ссылка партнёра с местом размещения story
    if (ins!.pick) expect(kinds.at(-1)).toBe('pick')
    expect(story!.cta?.href).toMatch(/^\/go\/[a-z-]+\?p=story&m=\d+$/)
    expect(story!.cta?.ad).toMatch(/Реклама/)
    // всё сериализуется в JSON (отдаётся из /api/story)
    expect(JSON.parse(JSON.stringify(story))).toEqual(story)
  })

  it('завершённый матч: голы и статистика, без кнопки ставки', async () => {
    const list = await getMatchesByDate(addDays(todayYmd(), -1))
    const m = list.find((x) => x.status === 'finished' && x.league.id === 39) ?? list.find((x) => x.status === 'finished')!
    const story = buildStory((await getMatchInsights(m.id))!)
    expect(story).not.toBeNull()
    const kinds = story!.slides.map((s) => s.kind)
    expect(kinds).toEqual(expect.arrayContaining(['goalsTimeline', 'stats']))
    expect(kinds).not.toContain('pick')
    // после матча доматчевых слайдов нет — оценка до матча строкой на обложке
    expect(kinds).not.toContain('odds')
    expect(kinds).not.toContain('form')
    expect(story!.cta).toBeNull()
  })
})
