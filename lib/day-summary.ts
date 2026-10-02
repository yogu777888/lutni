/**
 * «Сводка дня» — виджеты первого экрана главной: матч дня, value дня,
 * прогруз дня, live (или ближайший матч), голы, фаворит. Все цифры — из тех же
 * тегов и кэфов, что и в списке матчей, чтобы виджет и строка не расходились.
 */
import { featuredRank } from '@/config/leagues'
import type { FeedItem } from './data'
import { fair1x2 } from './odds'
import { interest, isLive, isMinor, liveRank } from './rank'

export type ProgruzInfo = { item: FeedItem; side: 'home' | 'away'; from: number; to: number; drop: number }
export type GoalsInfo = { count: number; item: FeedItem; p: number }
export type FavoriteInfo = { item: FeedItem; side: 'home' | 'away'; p: number }

export type DaySummary = {
  /** Главный матч дня: топ-турнир + сильные теги. */
  top: FeedItem | null
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
}

export type CardKind = 'value' | 'progruz' | 'live' | 'next' | 'goals' | 'favorite' | 'count'

const LIVE_SHOWN = 3
const CARDS = 4

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

/** Вероятность ТБ 2.5 из объяснения тега («… — 72%»). */
function overPct(it: FeedItem): number | null {
  const t = tag(it, 'tb-2-5')
  const m = t ? /(\d+)%/.exec(t.reason) : null
  return m ? Number(m[1]) / 100 : null
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

export function buildDaySummary(items: FeedItem[], now = Date.now()): DaySummary {
  const open = items.filter(isOpen)
  const scheduled = open.filter((it) => it.match.status === 'scheduled')

  const value = max(
    scheduled.filter((it) => it.summary?.pick?.kind === 'value'),
    (it) => it.summary!.pick!.ev ?? 0,
  )
  const progruz = max(
    open.map(parseProgruz).filter((p): p is ProgruzInfo => p !== null),
    (p) => p.drop,
  )

  // матч дня — другой, чем в value и прогрузе, если есть из чего выбрать
  const used = new Set([value?.match.id, progruz?.item.match.id])
  const pool = open.filter((it) => !isMinor(it.match))
  const top = max(pool.filter((it) => !used.has(it.match.id)), interest) ?? max(pool, interest) ?? max(open, interest)

  const liveAll = open.filter((it) => isLive(it.match)).sort((a, b) => liveRank(a.match) - liveRank(b.match) || a.match.ts - b.match.ts)

  const upcoming = scheduled.filter((it) => it.match.ts >= now)
  const firstTs = Math.min(...upcoming.map((it) => it.match.ts))
  const next = max(
    upcoming.filter((it) => it.match.ts === firstTs),
    interest,
  )

  const tb = open.filter((it) => overPct(it) !== null)
  const goalsBest = max(tb, (it) => overPct(it)! + (featuredRank(it.match.league) >= 0 ? 0.001 : 0))
  const goals = goalsBest ? { count: tb.length, item: goalsBest, p: overPct(goalsBest)! } : null

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

  return {
    top,
    value,
    progruz,
    live: liveAll.slice(0, LIVE_SHOWN),
    liveCount: liveAll.length,
    next,
    goals,
    favorite,
    total: items.length,
    leagues: new Set(items.map((it) => it.match.league.id)).size,
  }
}

/**
 * Какие маленькие виджеты показать (4 штуки): value и прогруз — первыми, дальше — что есть.
 * Фаворит и ближайший матч не повторяют матч, который уже стоит в другом виджете.
 */
export function summaryCards(s: DaySummary): CardKind[] {
  const has: Record<CardKind, boolean> = {
    value: Boolean(s.value),
    progruz: Boolean(s.progruz),
    live: s.liveCount > 0,
    next: s.liveCount === 0 && Boolean(s.next),
    goals: Boolean(s.goals),
    favorite: Boolean(s.favorite),
    count: s.total > 0,
  }
  const matchOf: Partial<Record<CardKind, number>> = {
    value: s.value?.match.id,
    progruz: s.progruz?.item.match.id,
    next: s.next?.match.id,
    favorite: s.favorite?.item.match.id,
  }
  const shown = new Set<number>()
  if (s.top) shown.add(s.top.match.id)
  const out: CardKind[] = []
  for (const k of ['value', 'progruz', 'live', 'next', 'goals', 'favorite', 'count'] as const) {
    if (!has[k] || out.length >= CARDS) continue
    const id = matchOf[k]
    if (id !== undefined && (k === 'next' || k === 'favorite') && shown.has(id)) continue
    out.push(k)
    if (id !== undefined) shown.add(id)
  }
  return out
}
