/**
 * «Сводка дня» — первый экран главной: «Главные матчи» (`mainMatches`) и переходы под ними — «Все матчи»,
 * «Ждём голов», «Кэф упал» — с одним примером-цифрой (`navExamples`). Подборки (`lists`) — кандидаты для
 * примеров, сильнейшие первыми. Все цифры — из тех же тегов и кэфов, что и в списке матчей, чтобы виджет
 * и строка не расходились.
 */
import { featuredRank } from '@/config/leagues'
import type { FeedItem } from './data'
import { appNow } from './format'
import { fair1x2, fairTwoWay, totalAt } from './odds'
import { interest, isLive, isMinor } from './rank'

export type ProgruzInfo = { item: FeedItem; side: 'home' | 'away'; from: number; to: number; drop: number }
export type GoalsInfo = { count: number; item: FeedItem; p: number }
export type FavoriteInfo = { item: FeedItem; side: 'home' | 'away'; p: number }

/**
 * Кандидаты для примеров под «Главными матчами»: по несколько матчей на вопрос, сильнейшие — первыми;
 * только ещё не начавшиеся (цифры доматчевые) и без матча дня.
 */
export type DayLists = {
  /** уверенные фавориты (шанс от 60%) */
  favorites: FavoriteInfo[]
  /** шанс 3+ голов */
  goals: { item: FeedItem; p: number }[]
  /** выгодные ставки */
  values: FeedItem[]
  /** падение кэфа */
  drops: ProgruzInfo[]
}

export type DaySummary = {
  /** Матч дня: топ-турнир + сильные теги (его нет в подборках — он первым в «Главных матчах»). */
  top: FeedItem | null
  /** Самый большой перевес среди предстоящих матчей. */
  value: FeedItem | null
  /** Самое большое падение кэфа среди открытых матчей (и идущих). */
  progruz: ProgruzInfo | null
  liveCount: number
  /** Ближайший матч — когда ничего не идёт. */
  next: FeedItem | null
  goals: GoalsInfo | null
  /** Самый голевой открытый матч (и матч дня, и идущий) — запасной пример для «Ждём голов», от 50%. */
  goalsAny: { item: FeedItem; p: number } | null
  favorite: FavoriteInfo | null
  total: number
  leagues: number
  lists: DayLists
}

/** Кандидатов в каждой подборке. */
const LIST_SHOWN = 4
/** Главных матчей в большом блоке. */
const MAINS_SHOWN = 5

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

/**
 * Шанс 3+ голов: цифра тега, а у матчей без тега — из пары кэфов «больше/меньше 2.5» одного снимка линии
 * без маржи. Для плитки «Ждём голов» меньше 50% не берём; в «Главных матчах» — график шанса.
 */
export function goalsChance(it: FeedItem): number | null {
  const tagged = overPct(it)
  if (tagged !== null) return tagged
  const t = totalAt(it.match.odds, 2.5)
  return fairTwoWay(t?.over, t?.under)?.a ?? null
}
const GOALS_MIN = 0.5

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

/** Топ-лиги чуть впереди при близких цифрах: «Бавария» интереснее безвестного клуба с тем же шансом. */
const featuredBonus = (it: FeedItem, w: number) => (featuredRank(it.match.league) >= 0 ? w : 0)

export function buildDaySummary(items: FeedItem[], now = appNow()): DaySummary {
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

  // матч дня — самый громкий: сначала турнир (ЛЧ, АПЛ, Ла Лига…), потом теги;
  // и другой, чем в value и прогрузе, если есть из чего выбрать
  const used = new Set([value?.match.id, progruz?.item.match.id])
  const pool = open.filter((it) => !isMinor(it.match))
  const top = max(pool.filter((it) => !used.has(it.match.id)), prestige) ?? max(pool, prestige) ?? max(open, prestige)

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

  // кандидаты для плиток: только ещё не начавшиеся и без матча дня — он и так крупно сверху
  const notTop = (it: FeedItem) => it.match.id !== top?.match.id
  const lists: DayLists = {
    favorites: favs
      .filter((f) => f.p >= FAVORITE_MIN && notTop(f.item))
      .sort((a, b) => b.p + featuredBonus(b.item, 0.1) - (a.p + featuredBonus(a.item, 0.1)))
      .slice(0, LIST_SHOWN),
    goals: scheduled
      .filter(notTop)
      .map((it) => ({ item: it, p: goalsChance(it) ?? 0 }))
      .filter((g) => g.p >= GOALS_MIN)
      .sort((a, b) => b.p + featuredBonus(b.item, 0.03) - (a.p + featuredBonus(a.item, 0.03)) || a.item.match.ts - b.item.match.ts)
      .slice(0, LIST_SHOWN),
    values: scheduled
      .filter((it) => it.summary?.pick?.kind === 'value' && notTop(it))
      .sort((a, b) => (b.summary!.pick!.ev ?? 0) - (a.summary!.pick!.ev ?? 0))
      .slice(0, LIST_SHOWN),
    drops: scheduled
      .filter(notTop)
      .map(parseProgruz)
      .filter((p): p is ProgruzInfo => p !== null)
      .sort((a, b) => b.drop - a.drop)
      .slice(0, LIST_SHOWN),
  }

  const goalsAny = max(
    open.map((it) => ({ item: it, p: goalsChance(it) ?? 0 })).filter((g) => g.p >= GOALS_MIN),
    (g) => g.p + featuredBonus(g.item, 0.03),
  )

  return {
    top,
    value,
    progruz,
    goalsAny,
    liveCount: open.filter((it) => isLive(it.match)).length,
    next,
    goals,
    favorite,
    total: items.length,
    leagues: new Set(items.map((it) => it.match.league.id)).size,
    lists,
  }
}

/** Фаворит дня — только по-настоящему уверенный исход. */
const FAVORITE_MIN = 0.6

/**
 * Главные матчи дня для большого блока (листаются стрелками «1 из 4»): по важности турнира и команд
 * (`prestige`), сначала по одному на лигу, потом добор; вероятность победы и падение кэфа сами по себе
 * главный матч не определяют. Идущие и предстоящие важнее сыгранных: сыгранные — только когда впереди
 * ничего нет (вчера, поздний вечер). Молодёжные, женские, перенесённые и отменённые — мимо.
 */
export function mainMatches(items: FeedItem[], limit = MAINS_SHOWN): FeedItem[] {
  const pool = items.filter((it) => !isMinor(it.match) && (isOpen(it) || it.match.status === 'finished'))
  const open = pool.filter(isOpen)
  const base = (open.length ? open : pool).sort((a, b) => prestige(b) - prestige(a) || a.match.ts - b.match.ts)
  const leagues = new Set<number>()
  const first: FeedItem[] = []
  const rest: FeedItem[] = []
  for (const it of base) {
    if (leagues.has(it.match.league.id)) rest.push(it)
    else {
      leagues.add(it.match.league.id)
      first.push(it)
    }
  }
  return [...first, ...rest].slice(0, limit)
}

/** Примеры для переходов: по одному матчу на вопрос — цифра и матч, к которому она относится. */
export type DayStats = {
  favorite: FavoriteInfo | null
  goals: { item: FeedItem; p: number } | null
  drop: ProgruzInfo | null
  value: FeedItem | null
}

/**
 * Какой матч показать в каждой плитке: самый сильный по своему вопросу (кандидаты уже отсортированы,
 * доматчевые и без матча дня); по возможности разные матчи в разных плитках, но если другого
 * подходящего нет — лучше повтор, чем пустая плитка.
 */
export function dayStats(s: DaySummary): DayStats {
  const used = new Set<number>()
  const first = <T>(xs: T[], item: (x: T) => FeedItem): T | null => {
    const hit = xs.find((x) => !used.has(item(x).match.id)) ?? xs[0] ?? null
    if (hit) used.add(item(hit).match.id)
    return hit
  }
  const l = s.lists
  return {
    favorite: first(l.favorites, (f) => f.item),
    goals: first(l.goals, (g) => g.item),
    drop: first(l.drops, (d) => d.item),
    value: first(l.values, (v) => v),
  }
}

/**
 * Примеры для переходов под «Главными матчами»: где ждать голов и где упал кэф. Сначала — ещё не
 * начавшиеся матчи (без матча дня, по возможности разные — как в `dayStats`); если таких нет — любой
 * открытый матч дня, и идущий тоже: падение кэфа с открытия линии до начала — уже факт.
 */
export function navExamples(s: DaySummary): { goals: { item: FeedItem; p: number } | null; drop: ProgruzInfo | null } {
  const st = dayStats(s)
  return {
    goals: st.goals ?? s.goalsAny,
    drop: st.drop ?? s.progruz,
  }
}
