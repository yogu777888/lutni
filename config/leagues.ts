/**
 * Приоритетные турниры: показываются первыми, для них прогревается кэш
 * и строятся «глубокие» теги. ID — как в SStats (совпадают с API-Football:
 * 39 — АПЛ, 140 — Ла Лига и т.д.). Если ID вдруг не совпадёт, сработает
 * сопоставление по стране и названию.
 *
 * Порядок можно переопределить переменной FEATURED_LEAGUE_IDS="39,140,235".
 */
export type FeaturedLeague = {
  id: number
  country: string
  name: string
  /** Короткое название для чипсов и заголовков. */
  short: string
}

const ALL_FEATURED: FeaturedLeague[] = [
  { id: 2, country: 'World', name: 'UEFA Champions League', short: 'Лига чемпионов' },
  { id: 39, country: 'England', name: 'Premier League', short: 'АПЛ' },
  { id: 140, country: 'Spain', name: 'La Liga', short: 'Ла Лига' },
  { id: 135, country: 'Italy', name: 'Serie A', short: 'Серия A' },
  { id: 78, country: 'Germany', name: 'Bundesliga', short: 'Бундеслига' },
  { id: 61, country: 'France', name: 'Ligue 1', short: 'Лига 1' },
  { id: 235, country: 'Russia', name: 'Premier League', short: 'РПЛ' },
  { id: 3, country: 'World', name: 'UEFA Europa League', short: 'Лига Европы' },
  { id: 848, country: 'World', name: 'UEFA Europa Conference League', short: 'Лига конференций' },
  { id: 1, country: 'World', name: 'World Cup', short: 'ЧМ' },
  { id: 4, country: 'World', name: 'Euro Championship', short: 'Евро' },
  { id: 5, country: 'World', name: 'UEFA Nations League', short: 'Лига наций' },
  { id: 88, country: 'Netherlands', name: 'Eredivisie', short: 'Эредивизи' },
  { id: 94, country: 'Portugal', name: 'Primeira Liga', short: 'Португалия' },
  { id: 203, country: 'Turkey', name: 'Süper Lig', short: 'Турция' },
  { id: 40, country: 'England', name: 'Championship', short: 'Чемпионшип' },
]

function orderFromEnv(list: FeaturedLeague[]): FeaturedLeague[] {
  const raw = process.env.FEATURED_LEAGUE_IDS
  if (!raw) return list
  const ids = raw
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
  const byId = new Map(list.map((l) => [l.id, l]))
  return ids.map((id) => byId.get(id) ?? { id, country: '', name: '', short: '' })
}

export const FEATURED_LEAGUES: FeaturedLeague[] = orderFromEnv(ALL_FEATURED)

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const INTERNATIONAL = new Set(['world', 'europe', 'international', ''])

/** «UEFA Champions League» = «Champions League», «UEFA Europa Conference League» = «Conference League». */
const canon = (name: string) =>
  norm(name)
    .replace(/^uefa /, '')
    .replace(/^fifa /, '')
    .replace('europa conference', 'conference')

function sameCountry(a: string, b: string) {
  const x = norm(a)
  const y = norm(b)
  return x === y || (INTERNATIONAL.has(x) && INTERNATIONAL.has(y))
}

/** Позиция лиги в приоритетном списке или -1: по ID, иначе по названию и стране. */
export function featuredRank(league: { id: number; name: string; country?: string }): number {
  const byId = FEATURED_LEAGUES.findIndex((l) => l.id === league.id)
  if (byId >= 0) return byId
  const n = canon(league.name)
  return FEATURED_LEAGUES.findIndex((l) => l.name && canon(l.name) === n && sameCountry(l.country, league.country ?? ''))
}

export function isFeatured(league: { id: number; name: string; country?: string }): boolean {
  return featuredRank(league) >= 0
}

export function featuredInfo(league: { id: number; name: string; country?: string }) {
  const i = featuredRank(league)
  return i >= 0 ? FEATURED_LEAGUES[i] : undefined
}

/** Порядок стран для «других турниров»: сначала то, что интереснее русскоязычной аудитории. */
const COUNTRY_ORDER = [
  'russia', 'england', 'spain', 'italy', 'germany', 'france', 'world', 'europe', 'international', 'netherlands',
  'portugal', 'turkey', 'belgium', 'scotland', 'ukraine', 'belarus', 'kazakhstan', 'uzbekistan', 'armenia',
  'azerbaijan', 'georgia', 'brazil', 'argentina', 'usa', 'saudi arabia', 'austria', 'switzerland', 'denmark',
  'sweden', 'norway', 'poland', 'czech republic', 'greece', 'croatia', 'serbia',
]

export function countryRank(country: string | undefined): number {
  const i = COUNTRY_ORDER.indexOf(norm(country ?? ''))
  return i < 0 ? COUNTRY_ORDER.length : i
}
