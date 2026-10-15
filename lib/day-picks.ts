/**
 * «Подборки дня» для правой панели каркаса (components/shell/RightPanel.tsx): все истории сегодняшнего дня — «В игре»,
 * «Топ дня», «Скоро», теги — с матчами одной строкой и главной цифрой матча в подборке («−17%», «62%»). Панель
 * в каркасе на всех страницах, поэтому считаем из кэша слоя данных (матчи дня и сводки матчей), без новых запросов.
 * Только для сервера.
 */
import { getPartner } from '@/config/bookmakers'
import { compactMatch, type CompactMatch } from './compact'
import { getMatchesByDate, tagsFor, type FeedItem } from './data'
import { soonMatches } from './day-summary'
import { appNow, formatTime, todayYmd } from './format'
import { matchHref } from './links'
import { isLive } from './rank'
import { buildStoryGroups, mainCircles, statFor, type StoryGroup } from './story-groups'
import { outcomeText } from './verdict'

export type DayPicks = {
  /** подборки по порядку: «В игре», «Топ дня», «Скоро», теги (главные первыми) */
  groups: StoryGroup[]
  matches: Record<number, CompactMatch>
  /** главная цифра матча в подборке по ключу «подборка:матч» */
  stats: Record<string, string>
  /** сколько всего матчей в подборке (в панели — не больше PER_GROUP) */
  totals: Record<string, number>
  /** что с матчами подборки сейчас — подпись под названием, как в левой панели: «8 матчей · 2 в игре» / «с 20:30» */
  states: Record<string, PickState>
  /** «Выгодно сегодня» внизу панели — лучшие выгодные ставки дня по линии PARI (ещё не начались) */
  values: ValueRow[]
}

/** Состояние подборки: идёт матчей, время ближайшего не начавшегося, начинались ли уже. */
/** `inMin` — сколько минут до первого не начавшегося матча (для «через 30 мин» у «Скоро начнутся»), часы — `appNow()` */
export type PickState = { live: number; next: string | null; started: boolean; pending: number; same: boolean; inMin: number | null }

export type ValueRow = {
  id: number
  href: string
  home: string
  away: string
  homeLogo: string | null
  awayLogo: string | null
  /** исход словами: «победа «Реал Сосьедад»» */
  outcome: string
  /** на победу какой команды ставка (вторая строка — «против «X»»), иначе null */
  side: 'home' | 'away' | null
  odd: number
  bookmaker: string
  slug: string
  /** выгода, % */
  ev: number | null
  time: string
}

/** Сколько выгодных ставок в панели. */
const VALUES = 3

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
        label: 'Скоро начнутся',
        kind: 'top',
        hint: `Скоро начнутся: ${soon.length}`,
        href: '/matches?sort=time',
        stat: '',
        items: soon.map((it) => ({ id: it.match.id, href: matchHref(it.match), focus: null })),
      })
    }
    const byId = new Map(matches.map((m) => [m.id, m]))
    const out: DayPicks = { groups: [], matches: {}, stats: {}, totals: {}, values: [], states: {} }
    // «Выгодно сегодня» — только по линии PARI (владелец: «а можно блок выгодно сегодня сделать только про пари?»): кэф PARI
    // выше честной цены (`summary.pari` в lib/data.ts); лучший кэф другого партнёра здесь не в счёт. Все выгодные по всем
    // легальным партнёрам — на /tag/value
    const pari = getPartner('pari')
    out.values = pari
      ? items
          .filter((i) => i.match.status === 'scheduled' && i.summary?.pari)
          .sort((a, b) => b.summary!.pari!.ev - a.summary!.pari!.ev)
          .slice(0, VALUES)
          .map(({ match: m, summary }) => {
            const p = summary!.pari!
            return {
              id: m.id,
              href: matchHref(m),
              home: m.home.name,
              away: m.away.name,
              homeLogo: m.home.logo ?? null,
              awayLogo: m.away.logo ?? null,
              outcome: outcomeText(p.key, m),
              side: p.key === 'home' ? 'home' : p.key === 'away' ? 'away' : null,
              odd: p.odd,
              bookmaker: pari.name,
              slug: pari.slug,
              ev: p.ev,
              time: formatTime(m.ts),
            }
          })
      : []
    for (const g of groups) {
      // «В игре» — в левой панели («Сейчас в игре»); подборка из одного матча — уже не подборка (владелец согласился)
      // «Выгодно» — блоком «Выгодно сегодня» внизу панели (с кэфами и ссылками), подборкой не повторяем
      if (g.key === 'live' || g.items.length < 2 || (g.key === 'value' && out.values.length)) continue
      // в панель — первые матчи подборки; для очереди сторис весь список не нужен
      const list = g.items.filter((it) => byId.has(it.id)).slice(0, PER_GROUP)
      if (!list.length) continue
      out.groups.push({ ...g, crests: undefined, items: list })
      out.totals[g.key] = g.items.length
      const all = g.items.map((it) => byId.get(it.id)).filter((m) => m !== undefined)
      const pre = all.filter((m) => m.status === 'scheduled').map((m) => m.ts)
      out.states[g.key] = {
        live: all.filter(isLive).length,
        next: pre.length ? formatTime(Math.min(...pre)) : null,
        started: all.some((m) => isLive(m) || m.status === 'finished'),
        pending: pre.length,
        same: new Set(pre.map((ts) => formatTime(ts))).size === 1,
        inMin: pre.length ? Math.round((Math.min(...pre) - appNow()) / 60_000) : null,
      }
      for (const it of list) {
        out.matches[it.id] ??= compactMatch(byId.get(it.id)!)
        // у «Топ дня» и «Скоро» у каждого матча своя причина — цифры разного смысла без подписи не читаются; там — только состояние
        const st = it.focus && g.key !== 'top' && g.key !== 'soon' ? statFor(it.focus.slug, it.focus.reason) : ''
        if (/\d/.test(st)) out.stats[`${g.key}:${it.id}`] = st
      }
    }
    // подборки, где впереди ничего нет (все матчи начались или сыграны), — вниз: «Кэф упал · 4 матча, все идут» стояла третьей,
    // хотя падение кэфа — сигнал до матча (владелец согласился); внутри — прежний порядок (sort устойчивый)
    out.groups.sort((a, b) => Number(!out.states[a.key]?.pending) - Number(!out.states[b.key]?.pending))
    return out
  } catch {
    return { groups: [], matches: {}, stats: {}, totals: {}, values: [], states: {} }
  }
}
