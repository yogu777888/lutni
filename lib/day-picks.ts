/**
 * «Подборки дня» для правой панели каркаса (components/shell/RightPanel.tsx): все истории сегодняшнего дня — «В игре»,
 * «Топ дня», «Скоро», теги — с матчами одной строкой и главной цифрой матча в подборке («−17%», «62%»). Панель
 * в каркасе на всех страницах, поэтому считаем из кэша слоя данных (матчи дня и сводки матчей), без новых запросов.
 * Только для сервера.
 */
import { compactMatch, type CompactMatch } from './compact'
import { getMatchesByDate, tagsFor, type FeedItem } from './data'
import { soonMatches } from './day-summary'
import { todayYmd } from './format'
import { matchHref } from './links'
import { buildStoryGroups, mainCircles, statFor, type StoryGroup } from './story-groups'

export type DayPicks = {
  /** подборки по порядку: «В игре», «Топ дня», «Скоро», теги (главные первыми) */
  groups: StoryGroup[]
  matches: Record<number, CompactMatch>
  /** главная цифра матча в подборке по ключу «подборка:матч» */
  stats: Record<string, string>
  /** сколько всего матчей в подборке (в панели — не больше PER_GROUP) */
  totals: Record<string, number>
}

/** Сколько матчей подборки уходит в панель: остальные — «Все N матчей →» на странице тега. */
const PER_GROUP = 8

export async function dayPicks(): Promise<DayPicks> {
  try {
    const matches = await getMatchesByDate(todayYmd())
    const items: FeedItem[] = matches.map((m) => ({ match: m, ...tagsFor(m) }))
    const groups = mainCircles(buildStoryGroups(items), 99)
    const soon = soonMatches(items, new Set(), PER_GROUP)
    if (soon.length) {
      const at = groups.findIndex((g) => g.key !== 'live' && g.key !== 'top')
      groups.splice(at < 0 ? groups.length : at, 0, {
        key: 'soon',
        label: 'Скоро',
        kind: 'top',
        hint: `Скоро начнутся: ${soon.length}`,
        href: '/matches?sort=time',
        stat: '',
        items: soon.map((it) => ({ id: it.match.id, href: matchHref(it.match), focus: null })),
      })
    }
    const byId = new Map(matches.map((m) => [m.id, m]))
    const out: DayPicks = { groups: [], matches: {}, stats: {}, totals: {} }
    for (const g of groups) {
      // «В игре» — в левой панели («Сейчас в игре»); подборка из одного матча — уже не подборка (владелец согласился)
      if (g.key === 'live' || g.items.length < 2) continue
      // в панель — первые матчи подборки; для очереди сторис весь список не нужен
      const list = g.items.filter((it) => byId.has(it.id)).slice(0, PER_GROUP)
      if (!list.length) continue
      out.groups.push({ ...g, crests: undefined, items: list })
      out.totals[g.key] = g.items.length
      for (const it of list) {
        out.matches[it.id] ??= compactMatch(byId.get(it.id)!)
        const st = it.focus ? statFor(it.focus.slug, it.focus.reason) : ''
        if (/\d/.test(st)) out.stats[`${g.key}:${it.id}`] = st
      }
    }
    return out
  } catch {
    return { groups: [], matches: {}, stats: {}, totals: {} }
  }
}
