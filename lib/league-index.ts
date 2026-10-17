/**
 * Данные страницы «Лиги и турниры» (владелец: «а страница лиги где типа все лиги как?», согласился на шесть правок):
 * топ-турниры с состоянием («идут 2 матча», «сегодня 5 матчей», «сейчас не играется»), страны по-русски в порядке
 * главной, внутри страны — сначала взрослые лиги и кубки, международные — клубные отдельно от сборных.
 */
import { countryRank, featuredRank } from '@/config/leagues'
import { liveText } from '@/components/shell/StateLine'
import { getMatchesByDate, settle } from './data'
import { flagCode, leagueTitle } from './flags'
import { addDays, pluralN, todayYmd } from './format'
import { ruCountry } from './i18n/ru'
import { leagueHref } from './links'
import type { LeagueInfo, Match } from './types'

export type IndexLeague = { id: number; name: string; href: string; q: string }
export type IndexGroup = { key: string; name: string; flag: string | null; leagues: IndexLeague[]; q: string }
export type TopLeague = { id: number; name: string; href: string; flag: string | null; state: string | null; over: boolean; q: string }

/** Строка для поиска на странице (оригинал; русское название поиск берёт из текста строки): без регистра и «ё». */
export const searchText = (...parts: (string | null | undefined)[]) =>
  parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/ё/g, 'е')

const YOUTH = /\bU-?\d{2}\b|youth|junior|juvenil|primavera|reserve|aspirantes|\bsub-?\d{2}\b|academy|\bjong\b|elite league|viareggio|revello/i
const WOMEN = /women|\bw\b|femin|femen|frauen|dames|damen|kvinn|naisten|\bwsl\b|nwsl|ladies|girls|shebelieves|algarve/i
const EXTRA = /play-?offs?|qualification|qualifying|relegation|promotion|pre-olympic/i

/**
 * Место турнира в стране: взрослые лиги и кубки (0), плей-офф и квалификации (1), женские (2), молодёжные (3). Внутри —
 * по номеру в API: у крупных он меньше (Англия: 39 Премьер-лига, 40 Чемпионшип, 41 Первая лига… 45 Кубок Англии); по
 * алфавиту оригинала «Первая лига» стояла после «FA Youth Cup» и женских кубков.
 */
export function leagueTier(original: string): number {
  if (YOUTH.test(original)) return 3
  if (WOMEN.test(original)) return 2
  if (EXTRA.test(original)) return 1
  return 0
}

const CLUBS = /\bclubs?\b|champions league|europa league|conference league|libertadores|sudamericana|recopa|leagues cup|confederation cup|super cup|super shield|champions cup|caribbean club|concacaf league|central american cup|campeones cup|african football league|challenge league|pro league|intercontinental cup|asia trophy|emirates cup|international champions cup|international cup|youth league|europa cup|club challenge/i
const NATIONS = /world cup|nations|confederations cup|euro championship|copa america|copa centroamericana|asian cup|gold cup|friendlies|olympic|qualification|arab cup|arab championship|gulf cup|baltic cup|king'?s cup|caribbean cup|cosafa|cecafa|saff|eaff|cafa|waff|games|asean|finalissima|kirin cup|china cup|algarve|shebelieves|championship|sudamericano|conmebol - u|concacaf (women )?u\d|concacaf u|fifa series|concacaf series|elite league|revello/i

/** Международный турнир — клубный или сборных: сначала признаки клубного («Лига чемпионов», «Суперкубок»), потом сборных. */
export const isNationsCup = (original: string) => !CLUBS.test(original) && NATIONS.test(original)

const isIntl = (l: LeagueInfo) => !l.country || /^world$/i.test(l.country)

/** Сезон закончился: у последнего сезона дата конца уже прошла (ЧМ-2026, Евро-2024). */
function seasonOver(l: LeagueInfo, today: string): boolean {
  if (!l.seasons?.length) return false
  const last = l.seasons.reduce((a, b) => (b.year > a.year ? b : a))
  return Boolean(last.end) && last.end.slice(0, 10) < today
}

/** Подпись топ-турнира по матчам сегодня и завтра — из того же кэша, что главная и левая панель. */
function stateOf(id: number, today: Match[], tomorrow: Match[]): string | null {
  const day = today.filter((m) => m.league.id === id)
  const live = day.filter((m) => m.status === 'live').length
  if (live) return liveText(live)
  const ahead = day.filter((m) => m.status === 'scheduled').length
  if (ahead) return day.some((m) => m.status === 'finished') ? `ещё ${pluralN(ahead, ['матч', 'матча', 'матчей'])} сегодня` : `сегодня ${pluralN(ahead, ['матч', 'матча', 'матчей'])}`
  const next = tomorrow.filter((m) => m.league.id === id && m.status === 'scheduled').length
  return next ? `завтра ${pluralN(next, ['матч', 'матча', 'матчей'])}` : null
}

const displayName = (l: LeagueInfo) => (flagCode(l) ? leagueTitle(l.name) : l.name)

export async function leagueIndex(leagues: LeagueInfo[]): Promise<{ top: TopLeague[]; groups: IndexGroup[]; countries: number }> {
  const today = todayYmd()
  const [dayMatches, nextMatches] = await Promise.all([
    settle(getMatchesByDate(today, { priority: 'low' }), [] as Match[]),
    settle(getMatchesByDate(addDays(today, 1), { priority: 'low' }), [] as Match[]),
  ])

  // топ: идущие и предстоящие — по порядку топ-турниров, закончившиеся (ЧМ, Евро) — в конце с «сейчас не играется»
  const top = leagues
    .filter((l) => featuredRank(l) >= 0)
    .sort((a, b) => featuredRank(a) - featuredRank(b))
    .map((l): TopLeague => {
      const state = stateOf(l.id, dayMatches, nextMatches)
      const over = !state && seasonOver(l, today)
      return { id: l.id, name: displayName(l), href: leagueHref(l), flag: flagCode(l), state: over ? 'сейчас не играется' : state, over, q: searchText(l.original, l.country) }
    })
    .sort((a, b) => Number(a.over) - Number(b.over))

  // страны — без топ-турниров (они выше), международные — двумя группами: клубные турниры и сборные
  const byKey = new Map<string, { name: string; flag: string | null; rank: number; en: string; list: LeagueInfo[] }>()
  for (const l of leagues) {
    if (featuredRank(l) >= 0) continue
    const intl = isIntl(l)
    const k = intl ? (isNationsCup(l.original) ? '~nations' : '~clubs') : l.country
    const g =
      byKey.get(k) ??
      (intl
        ? { name: k === '~clubs' ? 'Клубные турниры' : 'Турниры сборных', flag: null, rank: countryRank('world') + (k === '~clubs' ? 0 : 0.5), en: 'international world', list: [] }
        : { name: ruCountry(l.country), flag: flagCode(l), rank: countryRank(l.country), en: l.country, list: [] })
    g.list.push(l)
    byKey.set(k, g)
  }
  const groups = [...byKey.entries()]
    .map(([key, g]) => ({ key, ...g }))
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name, 'ru'))
    .map(
      (g): IndexGroup => ({
        key: g.key,
        name: g.name,
        flag: g.flag,
        q: searchText(g.en),
        leagues: g.list
          .sort((a, b) => leagueTier(a.original) - leagueTier(b.original) || a.id - b.id)
          // в `q` — только оригинал, и только если он отличается: видимое название поиск берёт из текста строки (1249
          // турниров: полная строка поиска у каждого добавляла к странице ~40%)
          .map((l) => {
            const name = displayName(l)
            return { id: l.id, name, href: leagueHref(l), q: l.original !== name ? searchText(l.original) : '' }
          }),
      }),
    )
  return { top, groups, countries: groups.filter((g) => !g.key.startsWith('~')).length }
}
