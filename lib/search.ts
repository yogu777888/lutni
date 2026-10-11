/**
 * Поиск по сайту (кнопка-лупа в шапке, components/Search.tsx): матчи команды на ближайшие дни и турниры. По русским
 * и оригинальным названиям, без учёта регистра и «ё»; слово запроса — начало слова в названии («спар» → «Спартак»).
 */
import type { LeagueInfo, Match } from './types'

export const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')

/** Все слова запроса — начала каких-то слов в тексте. */
export function hits(text: string, q: string): boolean {
  const words = norm(text).split(/[^\p{L}\p{N}]+/u)
  return norm(q)
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => words.some((x) => x.startsWith(w)))
}

export function searchMatches(ms: Match[], q: string, max = 8): Match[] {
  return ms
    .filter((m) => [m.home.name, m.home.original, m.away.name, m.away.original].some((n) => hits(n, q)) || hits(`${m.home.name} ${m.away.name}`, q))
    .sort((a, b) => a.ts - b.ts)
    .slice(0, max)
}

export function searchLeagues(ls: LeagueInfo[], q: string, max = 5): LeagueInfo[] {
  return ls.filter((l) => hits(l.name, q) || hits(l.original, q) || hits(l.country, q)).slice(0, max)
}
