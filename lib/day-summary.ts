/**
 * «Сводка дня» — виджеты первого экрана главной: матч дня и плитки-подборки — каждая отвечает
 * на один вопрос несколькими матчами: что идёт (или скоро начнётся), кто скорее выиграет, где ждать
 * голов, что выгодно, где упал кэф. Все цифры — из тех же тегов и кэфов, что и в списке матчей,
 * чтобы виджет и строка не расходились.
 */
import { featuredRank } from '@/config/leagues'
import type { FeedItem } from './data'
import { formatTime } from './format'
import { fair1x2 } from './odds'
import { interest, isLive, isMinor, liveRank } from './rank'
import type { League } from './types'

export type ProgruzInfo = { item: FeedItem; side: 'home' | 'away'; from: number; to: number; drop: number }
export type GoalsInfo = {
  count: number
  item: FeedItem
  p: number
  /** матчи с ТБ 2.5 — самые голевые первыми */
  list: { id: number; p: number; title: string }[]
}
/** Состояние матча дня для «точек»: сыгран, идёт, впереди. */
export type DayState = 'done' | 'live' | 'next'
export type FavoriteInfo = { item: FeedItem; side: 'home' | 'away'; p: number }

/** Подборки для плиток: по несколько матчей на вопрос, сильнейшие — первыми. */
export type DayLists = {
  /** идут сейчас: топ-лиги первыми */
  live: FeedItem[]
  /** ближайшие по времени начала */
  upcoming: FeedItem[]
  /** уверенные фавориты (шанс от 60%), без матча дня */
  favorites: FavoriteInfo[]
  /** шанс 3+ голов, без матча дня */
  goals: { item: FeedItem; p: number }[]
  /** выгодные ставки, без матча дня */
  values: FeedItem[]
  /** падение кэфа, без матча дня */
  drops: ProgruzInfo[]
}

export type DaySummary = {
  /** Главный матч дня: топ-турнир + сильные теги. */
  top: FeedItem | null
  /** Карусель «Матча дня»: первым — матч дня, дальше — главный матч каждой другой топ-лиги (до 5). */
  tops: FeedItem[]
  /** Самый большой перевес среди предстоящих матчей. */
  value: FeedItem | null
  progruz: ProgruzInfo | null
  live: FeedItem[]
  liveCount: number
  /** Ближайший матч — когда ничего не идёт. */
  next: FeedItem | null
  goals: GoalsInfo | null
  favorite: FavoriteInfo | null
  total: number
  leagues: number
  /** Главные турниры дня: топ-лиги первыми, потом по числу матчей. */
  topLeagues: { id: number; name: string; count: number; league: League }[]
  lists: DayLists
  /** Матчи дня по времени начала: сыгран / идёт / впереди (перенесённые и отменённые — мимо). */
  timeline: DayState[]
  /** Те же матчи по часам начала (по времени сайта) — для «точек по часам»; пустые часы внутри дня тоже есть. */
  hours: { hour: number; states: DayState[] }[]
}

export type CardKind = 'value' | 'progruz' | 'live' | 'next' | 'goals' | 'favorite' | 'count'

const LIVE_SHOWN = 3
const CARDS = 4
const GOALS_SHOWN = 3
/** Строк в плитке-подборке: на телефоне и невысоком экране видно три, на высоком — четыре. */
const LIST_SHOWN = 4
/** Слайдов в карусели «Матча дня». */
const TOPS_SHOWN = 5

const isOpen = (it: FeedItem) => it.match.status === 'scheduled' || isLive(it.match)
const tag = (it: FeedItem, slug: string) => it.tags.find((t) => t.slug === slug)

/** «Коэффициент на победу «X» упал с 2.40 до 1.97 (−18%)» → сторона, было, стало, падение. */
export function parseProgruz(it: FeedItem): ProgruzInfo | null {
  const t = tag(it, 'progruz')
  if (!t) return null
  const m = /«(.+?)».*?с (\d+(?:\.\d+)?) до (\d+(?:\.\d+)?)/.exec(t.reason)
  if (!m) return null
  const from = Number(m[2])
  const to = Number(m[3])
  if (!(from > to && to > 1)) return null
  return { item: it, side: m[1] === it.match.away.name ? 'away' : 'home', from, to, drop: 1 - to / from }
}

/** Вероятность ТБ 2.5: цифра тега, у старых записей — из объяснения («… — 72%»). */
function overPct(it: FeedItem): number | null {
  const t = tag(it, 'tb-2-5')
  if (t?.p !== undefined) return t.p
  const m = t ? /(\d+)%/.exec(t.reason) : null
  return m ? Number(m[1]) / 100 : null
}

/** Вес матча для «Матча дня»: громкость турнира важнее тегов. */
export function prestige(it: FeedItem): number {
  const r = featuredRank(it.match.league)
  return interest(it) + (r >= 0 ? Math.max(0, 12 - r) * 0.35 : 0)
}

const max = <T>(xs: T[], score: (x: T) => number): T | null => {
  let best: T | null = null
  let bs = -Infinity
  for (const x of xs) {
    const s = score(x)
    if (s > bs) [best, bs] = [x, s]
  }
  return best
}

function topLeagues(items: FeedItem[]) {
  const by = new Map<number, { id: number; name: string; count: number; rank: number; league: League }>()
  for (const { match: m } of items) {
    const g = by.get(m.league.id) ?? { id: m.league.id, name: m.league.name, count: 0, rank: featuredRank(m.league), league: m.league }
    g.count++
    by.set(m.league.id, g)
  }
  return [...by.values()]
    .sort((a, b) => (a.rank < 0 ? 1e3 : a.rank) - (b.rank < 0 ? 1e3 : b.rank) || b.count - a.count)
    .slice(0, LIST_SHOWN)
    .map(({ id, name, count, league }) => ({ id, name, count, league }))
}

/** Топ-лиги чуть впереди при близких цифрах: «Бавария» интереснее безвестного клуба с тем же шансом. */
const featuredBonus = (it: FeedItem, w: number) => (featuredRank(it.match.league) >= 0 ? w : 0)

export function buildDaySummary(items: FeedItem[], now = Date.now()): DaySummary {
  const open = items.filter(isOpen)
  const scheduled = open.filter((it) => it.match.status === 'scheduled')
  const dated = [...items]
    .sort((a, b) => a.match.ts - b.match.ts)
    .flatMap(({ match: m }) => {
      const state: DayState | null = isLive(m) ? 'live' : m.status === 'finished' ? 'done' : m.status === 'scheduled' ? 'next' : null
      return state ? [{ state, hour: Number(formatTime(m.ts).slice(0, 2)) }] : []
    })

  const value = max(
    scheduled.filter((it) => it.summary?.pick?.kind === 'value'),
    (it) => it.summary!.pick!.ev ?? 0,
  )
  const progruz = max(
    open.map(parseProgruz).filter((p): p is ProgruzInfo => p !== null),
    (p) => p.drop,
  )

  // матч дня — самый громкий: сначала турнир (ЛЧ, АПЛ, Ла Лига…), потом теги;
  // и другой, чем в value и прогрузе, если есть из чего выбрать
  const used = new Set([value?.match.id, progruz?.item.match.id])
  const pool = open.filter((it) => !isMinor(it.match))
  const top = max(pool.filter((it) => !used.has(it.match.id)), prestige) ?? max(pool, prestige) ?? max(open, prestige)
  // по одному матчу дня на каждую топ-лигу — самый громкий в ней; лига матча дня — уже первая
  const byLeague = new Map<number, FeedItem>()
  for (const it of pool) {
    if (featuredRank(it.match.league) < 0 || it.match.league.id === top?.match.league.id) continue
    const cur = byLeague.get(it.match.league.id)
    if (!cur || prestige(it) > prestige(cur)) byLeague.set(it.match.league.id, it)
  }
  const tops = top ? [top, ...[...byLeague.values()].sort((a, b) => prestige(b) - prestige(a))].slice(0, TOPS_SHOWN) : []

  const liveAll = open.filter((it) => isLive(it.match)).sort((a, b) => liveRank(a.match) - liveRank(b.match) || a.match.ts - b.match.ts)

  const upcoming = scheduled.filter((it) => it.match.ts >= now)
  const firstTs = Math.min(...upcoming.map((it) => it.match.ts))
  const next = max(
    upcoming.filter((it) => it.match.ts === firstTs),
    interest,
  )

  const tb = open.filter((it) => overPct(it) !== null)
  const goalsBest = max(tb, (it) => overPct(it)! + (featuredRank(it.match.league) >= 0 ? 0.001 : 0))
  const goals = goalsBest
    ? {
        count: tb.length,
        item: goalsBest,
        p: overPct(goalsBest)!,
        list: [...tb]
          .sort((a, b) => overPct(b)! - overPct(a)! || a.match.ts - b.match.ts)
          .slice(0, GOALS_SHOWN)
          .map((it) => ({ id: it.match.id, p: overPct(it)!, title: `${it.match.home.name} — ${it.match.away.name}` })),
      }
    : null

  // фаворит дня — самый уверенный исход в «взрослом» матче; топ-турниры важнее
  const favs = scheduled
    .filter((it) => !isMinor(it.match))
    .flatMap((it) => {
      const f = fair1x2(it.match.odds?.x12)
      if (!f) return []
      const side = f.home >= f.away ? ('home' as const) : ('away' as const)
      return [{ item: it, side, p: f[side] }]
    })
  const favorite = max(favs, (f) => f.p + (featuredRank(f.item.match.league) >= 0 ? 1 : 0))

  // подборки для плиток: матч дня в них не повторяем — он и так крупно слева
  const notTop = (it: FeedItem) => it.match.id !== top?.match.id
  const upcomingList = [...upcoming].sort(
    (a, b) => Number(isMinor(a.match)) - Number(isMinor(b.match)) || a.match.ts - b.match.ts || interest(b) - interest(a),
  )
  const lists: DayLists = {
    live: liveAll.slice(0, LIST_SHOWN),
    // сначала «взрослые» матчи по времени, молодёжные и женские — если больше нечего показать
    upcoming: upcomingList.slice(0, LIST_SHOWN),
    favorites: favs
      .filter((f) => f.p >= FAVORITE_MIN && notTop(f.item))
      .sort((a, b) => b.p + featuredBonus(b.item, 0.1) - (a.p + featuredBonus(a.item, 0.1)))
      .slice(0, LIST_SHOWN),
    goals: tb
      .filter(notTop)
      .map((it) => ({ item: it, p: overPct(it)! }))
      .sort((a, b) => b.p + featuredBonus(b.item, 0.03) - (a.p + featuredBonus(a.item, 0.03)) || a.item.match.ts - b.item.match.ts)
      .slice(0, LIST_SHOWN),
    values: scheduled
      .filter((it) => it.summary?.pick?.kind === 'value' && notTop(it))
      .sort((a, b) => (b.summary!.pick!.ev ?? 0) - (a.summary!.pick!.ev ?? 0))
      .slice(0, LIST_SHOWN),
    drops: open
      .filter(notTop)
      .map(parseProgruz)
      .filter((p): p is ProgruzInfo => p !== null)
      .sort((a, b) => b.drop - a.drop)
      .slice(0, LIST_SHOWN),
  }

  return {
    top,
    tops,
    value,
    progruz,
    live: liveAll.slice(0, LIVE_SHOWN),
    liveCount: liveAll.length,
    next,
    goals,
    favorite,
    total: items.length,
    leagues: new Set(items.map((it) => it.match.league.id)).size,
    topLeagues: topLeagues(items),
    lists,
    timeline: dated.map((d) => d.state),
    hours: byHour(dated),
  }
}

function byHour(dated: { hour: number; state: DayState }[]) {
  if (!dated.length) return []
  const first = dated[0].hour
  const last = dated[dated.length - 1].hour
  const out = Array.from({ length: last - first + 1 }, (_, i) => ({ hour: first + i, states: [] as DayState[] }))
  for (const d of dated) out[d.hour - first].states.push(d.state)
  return out
}

/** Фаворит дня — только по-настоящему уверенный исход. */
const FAVORITE_MIN = 0.6

/**
 * Какие плитки-подборки показать (до 4) и в каком порядке — по вопросам посетителя:
 * что идёт сейчас (или скоро начнётся) → кто скорее выиграет → где ждать голов → что выгодно.
 * Сначала — подборки хотя бы из трёх матчей (короткая подборка в высокой плитке выглядит пустой);
 * не хватило — добираем подборками из двух: падение кэфа, турниры дня. Плитка «Сейчас» добирает
 * ближайшими матчами, если идущих мало.
 */
export function summaryCards(s: DaySummary): CardKind[] {
  const l = s.lists
  const rows: Record<CardKind, number> = {
    live: s.liveCount > 0 ? l.live.length + l.upcoming.length : 0,
    next: l.upcoming.length,
    favorite: l.favorites.length,
    goals: l.goals.length,
    value: l.values.length,
    progruz: l.drops.length,
    count: s.topLeagues.length,
  }
  const order: CardKind[] = [s.liveCount > 0 ? 'live' : 'next', 'favorite', 'goals', 'value', 'progruz', 'count']
  const pick = order.filter((k) => rows[k] >= 3).slice(0, CARDS)
  for (const k of order) if (pick.length < CARDS && rows[k] === 2) pick.push(k)
  return order.filter((k) => pick.includes(k))
}
