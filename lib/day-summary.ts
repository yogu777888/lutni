/**
 * «Главное за день» — виджеты первого экрана главной. Каждый отвечает на один
 * вопрос посетителя: что поставить (ставки дня), что идёт сейчас (live или
 * ближайшие матчи), куда идут деньги (прогрузы). Цифры — из тех же тегов и
 * прогнозов, что и в списке матчей, чтобы виджет и строка не расходились.
 */
import { featuredRank } from '@/config/leagues'
import type { FeedItem } from './data'
import { fair1x2 } from './odds'
import { bestTag, interest, isLive, isMinor, liveRank } from './rank'
import type { TagHit } from './tags'

export type ProgruzInfo = { item: FeedItem; side: 'home' | 'away'; from: number; to: number; drop: number }

/**
 * Ставка дня. kind: value — кэф выше честного, probability — уверенный исход по модели,
 * favorite — запасной вариант по коротким кэфам, пока матчи не разобраны.
 */
export type DayPick = {
  item: FeedItem
  label: string
  prob: number
  odd: number | null
  fair: number
  ev: number | null
  kind: 'value' | 'probability' | 'favorite'
  partnerSlug: string | null
  bookmaker: string | null
  /** почему этот матч — самый весомый тег и его объяснение */
  why: TagHit | null
}

export type DaySummary = {
  picks: DayPick[]
  live: FeedItem[]
  liveCount: number
  /** ближайшие матчи — когда ничего не идёт */
  upcoming: FeedItem[]
  drops: ProgruzInfo[]
  total: number
}

const PICKS = 5
const ROWS = 4
const DROPS = 3
/** Короче этого кэфа «ставка» неинтересна: риск есть, выигрыша почти нет. */
const MIN_ODD = 1.4

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

/** Вес матча: громкость турнира важнее тегов. */
export function prestige(it: FeedItem): number {
  const r = featuredRank(it.match.league)
  return interest(it) + (r >= 0 ? Math.max(0, 12 - r) * 0.35 : 0)
}

const SIDE = { home: 'П1', draw: 'Х', away: 'П2' } as const

/** Ставки дня: сначала value по размеру перевеса, потом уверенные исходы модели; без разбора — фавориты громких матчей. */
export function buildPicks(scheduled: FeedItem[]): DayPick[] {
  const fromModel: DayPick[] = scheduled.flatMap((it) => {
    const p = it.summary?.pick
    if (!p || (p.odd !== null && p.odd < MIN_ODD)) return []
    return [
      {
        item: it,
        label: p.label,
        prob: p.prob,
        odd: p.odd,
        fair: 1 / p.prob,
        ev: p.ev,
        kind: p.kind,
        partnerSlug: p.partnerSlug,
        bookmaker: p.bookmaker,
        // у value-ставки перевес уже на кнопке — «почему» берём из другого тега
        why: bestTag(p.kind === 'value' ? it.tags.filter((t) => t.slug !== 'value') : it.tags),
      },
    ]
  })
  const value = fromModel.filter((p) => p.kind === 'value').sort((a, b) => (b.ev ?? 0) - (a.ev ?? 0))
  const sure = fromModel.filter((p) => p.kind !== 'value').sort((a, b) => b.prob - a.prob)
  const picks = [...value, ...sure].slice(0, PICKS)
  if (picks.length >= 3) return picks

  // матчи ещё не разобраны — показываем фаворитов громких матчей по коротким кэфам
  const used = new Set(picks.map((p) => p.item.match.id))
  const favs = scheduled
    .filter((it) => !used.has(it.match.id) && !isMinor(it.match))
    .flatMap((it): DayPick[] => {
      const f = fair1x2(it.match.odds?.x12)
      const x = it.match.odds?.x12
      if (!f || !x) return []
      const side = f.home >= f.away ? ('home' as const) : ('away' as const)
      const odd = x[side]?.value ?? null
      if (!odd || odd < MIN_ODD - 0.1 || f[side] < 0.45) return []
      return [
        {
          item: it,
          label: SIDE[side],
          prob: f[side],
          odd,
          fair: 1 / f[side],
          ev: odd * f[side] - 1,
          kind: 'favorite',
          partnerSlug: null,
          bookmaker: null,
          why: bestTag(it.tags),
        },
      ]
    })
    .sort((a, b) => prestige(b.item) - prestige(a.item))
  return [...picks, ...favs].slice(0, PICKS)
}

export function buildDaySummary(items: FeedItem[], now = Date.now()): DaySummary {
  const open = items.filter(isOpen)
  const scheduled = open.filter((it) => it.match.status === 'scheduled')

  const live = open.filter((it) => isLive(it.match)).sort((a, b) => liveRank(a.match) - liveRank(b.match) || a.match.ts - b.match.ts)

  // ближайшие: что начнётся первым; среди одновременных — громкие турниры раньше
  const upcoming = scheduled
    .filter((it) => it.match.ts >= now)
    .sort((a, b) => a.match.ts - b.match.ts || prestige(b) - prestige(a))
    .slice(0, ROWS)

  const drops = open
    .map(parseProgruz)
    .filter((p): p is ProgruzInfo => p !== null)
    .sort((a, b) => b.drop - a.drop)
    .slice(0, DROPS)

  return {
    picks: buildPicks(scheduled),
    live: live.slice(0, ROWS),
    liveCount: live.length,
    upcoming,
    drops,
    total: items.length,
  }
}

/** Сила перевеса — яркостью лайма: ≥8% — полный, ≥5,5% — приглушённый, меньше — только цифра. */
export function edgeTone(ev: number | null): 'hot' | 'lime' | 'soft' | 'none' {
  if (ev === null || ev <= 0) return 'none'
  if (ev >= 0.08) return 'hot'
  if (ev >= 0.055) return 'lime'
  return 'soft'
}
