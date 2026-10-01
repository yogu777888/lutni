/** Насколько матч интересен аудитории: для «Сейчас в игре», «Топ дня» и порядка в историях. */
import { countryRank, featuredRank } from '@/config/leagues'
import type { FeedItem } from './data'
import type { TagHit } from './tags'
import type { Match } from './types'

const MINOR = /\b(women|womens|w|u\d{2}|youth|reserves?|ii|b)\b|\bfem/i

/** Женские, молодёжные и дублирующие составы. */
export const isMinor = (m: Match) => MINOR.test(m.league.original) || MINOR.test(m.home.original)

export const isLive = (m: Match) => m.status === 'live' || m.status === 'suspended'

/** Порядок live-матчей: топ-лиги, потом матчи с линией; женские и молодёжные — в конец. Меньше — выше. */
export function liveRank(m: Match): number {
  const r = featuredRank(m.league)
  if (r >= 0) return r
  return (m.odds?.x12 ? 100 : 150) + (isMinor(m) ? 200 : 0) + countryRank(m.league.country)
}

/** Вес тега для «интересности»: деньги и движение линии важнее описательных тегов. */
const TAG_WEIGHT: Record<string, number> = {
  value: 1.6,
  progruz: 1.4,
  'top-match': 1.3,
  andedog: 1,
  seriya: 0.8,
  'tb-2-5': 0.7,
  ravnye: 0.6,
  'obe-zabyut': 0.6,
  krepost: 0.6,
  h2h: 0.6,
  kadry: 0.5,
  'tm-2-5': 0.5,
  favorit: 0.4,
}

const tagValue = (t: TagHit) => (TAG_WEIGHT[t.slug] ?? 0.5) * (0.5 + 0.5 * t.score)

/** Самый «продающий» тег матча — им подписываем матч в «Топ дня». */
export function bestTag(tags: TagHit[]): TagHit | null {
  let best: TagHit | null = null
  for (const t of tags) if (!best || tagValue(t) > tagValue(best)) best = t
  return best
}

/** Интерес к матчу: турнир + теги (value и прогрузы весят больше) + наличие линии. */
export function interest(it: FeedItem): number {
  const m = it.match
  const r = featuredRank(m.league)
  let s = r >= 0 ? 2.2 - 0.08 * Math.min(r, 15) : 0
  if (isMinor(m)) s -= 1.5
  if (m.odds?.x12) s += 0.4
  for (const t of it.tags) s += tagValue(t)
  return s
}
