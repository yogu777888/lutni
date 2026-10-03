import { describe, expect, it } from 'vitest'
import { getMatchesByDate, tagsFor, type FeedItem } from '@/lib/data'
import { addDays, todayYmd } from '@/lib/format'
import { buildStoryGroups, mainCircles, statFor, type StoryGroup } from '@/lib/story-groups'
import type { Match } from '@/lib/types'

const team = (id: number, name: string) => ({ id, name, original: name, logo: null, country: 'England' })
function item(id: number, status: Match['status'], tags: FeedItem['tags'] = [], leagueId = 39): FeedItem {
  const match: Match = {
    id,
    ts: Date.now() + id * 60_000,
    status,
    statusCode: status === 'live' ? 3 : 1,
    statusLabel: '',
    elapsed: status === 'live' ? 30 : null,
    home: team(id * 10, `Home ${id}`),
    away: team(id * 10 + 1, `Away ${id}`),
    score: null,
    scoreFT: null,
    scoreHT: null,
    league: { id: leagueId, name: 'Англия. Премьер-лига', original: 'Premier League', country: 'England', countryCode: 'GB' },
    season: null,
    round: null,
    odds: null,
  }
  return { match, tags, summary: null }
}

describe('кружки историй', () => {
  it('порядок: «В игре», «Топ дня», value и прогрузы раньше остальных тегов', () => {
    const groups = buildStoryGroups([
      item(1, 'live'),
      item(2, 'scheduled', [{ slug: 'tb-2-5', score: 0.9, reason: 'много голов' }]),
      item(3, 'scheduled', [{ slug: 'tb-2-5', score: 0.5, reason: 'голы' }, { slug: 'progruz', score: 0.6, reason: 'упал кэф' }]),
      item(4, 'scheduled', [{ slug: 'value', score: 0.4, reason: 'перевес' }]),
      item(5, 'finished', [{ slug: 'value', score: 1, reason: 'прошлое' }]),
    ])
    expect(groups.map((g) => g.key)).toEqual(['live', 'top', 'value', 'progruz', 'tb-2-5'])
    // завершённые матчи в кружки не попадают
    expect(groups.flatMap((g) => g.items.map((i) => i.id))).not.toContain(5)
    // в теге — его матчи, «почему» — причина этого тега
    const tb = groups.find((g) => g.key === 'tb-2-5')!
    expect(tb.href).toBe('/tag/tb-2-5')
    expect(tb.items.every((i) => i.focus?.slug === 'tb-2-5')).toBe(true)
    // «Топ дня» — только предстоящие, подпись — самый весомый тег матча
    const top = groups.find((g) => g.key === 'top')!
    expect(top.items.map((i) => i.id)).not.toContain(1)
    expect(top.items.find((i) => i.id === 3)?.focus?.slug).toBe('progruz')
  })

  it('на «табло» кружка — главная цифра самого сильного матча', () => {
    const groups = buildStoryGroups([
      item(1, 'scheduled', [{ slug: 'progruz', score: 0.9, reason: 'Коэффициент на победу «A» упал с 2.40 до 1.97 (−18%)' }]),
      item(2, 'scheduled', [{ slug: 'progruz', score: 0.4, reason: 'Коэффициент на победу «B» упал с 2.00 до 1.80 (−10%)' }]),
      item(3, 'scheduled', [{ slug: 'value', score: 0.8, reason: 'П2 за 3.15 (Марафон) при справедливом 2.84: перевес +10.8%' }]),
      item(4, 'live'),
    ])
    expect(groups.find((g) => g.key === 'progruz')?.stat).toBe('−18%')
    expect(groups.find((g) => g.key === 'value')?.stat).toBe('+11%')
    expect(groups.find((g) => g.key === 'live')?.stat).toBe('1')
    expect(groups.find((g) => g.key === 'top')?.stat).toBe('#')
    // сильнейший матч — первым в кружке
    expect(groups.find((g) => g.key === 'progruz')?.items[0].id).toBe(1)
  })

  it('цифры для остальных тегов достаются из объяснений', () => {
    expect(statFor('tb-2-5', 'Вероятность тотала больше 2.5 — 61%')).toBe('61%')
    expect(statFor('favorit', 'Шансы «Наполи» на победу — 78%')).toBe('78%')
    expect(statFor('seriya', 'Команда «X» выиграла 5 матчей подряд')).toBe('5')
    expect(statFor('kadry', 'Команда «X» не досчитается 4 игроков')).toBe('−4')
    expect(statFor('h2h', 'В 6 из 8 последних очных встреч было больше 2.5 голов')).toBe('6/8')
    expect(statFor('top-match', 'Встреча команд с 1-го и 3-го места')).toBe('1·3')
    expect(statFor('ravnye', 'Шансы почти равны')).toBe('≈')
  })

  it('демо-день: кружки собираются, в теге не больше 10 матчей', async () => {
    // завтрашний день: все матчи впереди, и тест не зависит от того, во сколько его запустили
    const list = await getMatchesByDate(addDays(todayYmd(), 1))
    const groups = buildStoryGroups(list.map((m) => ({ match: m, ...tagsFor(m) })))
    expect(groups.length).toBeGreaterThan(3)
    for (const g of groups) {
      expect(g.items.length).toBeGreaterThan(0)
      expect(g.items.length).toBeLessThanOrEqual(10)
      expect(new Set(g.items.map((i) => i.id)).size).toBe(g.items.length)
    }
  })
})

describe('обложки историй', () => {
  it('у каждого тега, «В игре», «Топ дня» и «Все теги» — свой арт с иконкой', async () => {
    const { artFor, hasArt } = await import('@/lib/story-art')
    const { TAGS } = await import('@/lib/tags')
    for (const key of [...TAGS.map((t) => t.slug), 'live', 'top', 'all']) {
      expect(hasArt(key), key).toBe(true)
      expect(artFor(key).icon).toBeTruthy()
    }
    // неизвестный ключ — запасной арт, а не ошибка
    expect(artFor('нет-такого').icon).toBe('hash')
  })
})

describe('кружки на главной', () => {
  it('«В игре», «Топ дня» и до пяти самых полезных тегов — остальные по «Все теги»', () => {
    const g = (key: string, kind: StoryGroup['kind']): StoryGroup => ({ key, label: key, kind, hint: '', href: '', stat: '', items: [] })
    const groups = [
      g('live', 'live'),
      g('top', 'top'),
      g('kadry', 'neutral'),
      g('h2h', 'neutral'),
      g('value', 'accent'),
      g('progruz', 'hot'),
      g('tb-2-5', 'neutral'),
      g('seriya', 'neutral'),
      g('favorit', 'neutral'),
      g('obe-zabyut', 'neutral'),
    ]
    expect(mainCircles(groups).map((x) => x.key)).toEqual(['live', 'top', 'value', 'progruz', 'tb-2-5', 'favorit', 'obe-zabyut'])
    expect(mainCircles(groups.slice(4, 6)).map((x) => x.key)).toEqual(['value', 'progruz'])
  })
})
