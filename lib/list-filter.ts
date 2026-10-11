import { featuredRank } from '@/config/leagues'
import type { FeedItem } from './data'
import { isLive } from './rank'

/**
 * «Своя подборка» — фильтр страницы «Матчи» из адреса (собирает правая панель каркаса, components/shell/RightPanel):
 * `?st=live|ahead|done` — что показывать, `?lg=39,140` — турниры, `?top=1` — только топ-турниры,
 * `?tag=value,progruz` — теги (хотя бы один). Пустой фильтр — весь день.
 */
export type ListFilter = { st?: 'live' | 'ahead' | 'done'; lg: number[]; top: boolean; tags: string[] }

const list = (v: string | undefined) => (v ?? '').split(',').map((x) => x.trim()).filter(Boolean)

export function parseListFilter(q: Record<string, string | string[] | undefined>): ListFilter {
  const one = (k: string) => (Array.isArray(q[k]) ? q[k][0] : q[k]) as string | undefined
  const st = one('st')
  return {
    st: st === 'live' || st === 'ahead' || st === 'done' ? st : undefined,
    lg: list(one('lg')).map(Number).filter((n) => Number.isSafeInteger(n) && n > 0).slice(0, 30),
    top: one('top') === '1',
    tags: list(one('tag')).filter((s) => /^[a-z0-9-]{2,24}$/.test(s)).slice(0, 15),
  }
}

export const isEmptyFilter = (f: ListFilter) => !f.st && !f.lg.length && !f.top && !f.tags.length

export function applyListFilter(items: FeedItem[], f: ListFilter): FeedItem[] {
  if (isEmptyFilter(f)) return items
  const lg = new Set(f.lg)
  return items.filter(({ match: m, tags }) => {
    if (f.st === 'live' && !isLive(m)) return false
    if (f.st === 'ahead' && m.status !== 'scheduled') return false
    if (f.st === 'done' && m.status !== 'finished') return false
    if (lg.size && !lg.has(m.league.id)) return false
    if (f.top && featuredRank(m.league) < 0) return false
    if (f.tags.length && !tags.some((t) => f.tags.includes(t.slug))) return false
    return true
  })
}

/** Фильтр обратно в адрес (без пустых): «st=live&tag=value,progruz». */
export function filterQuery(f: ListFilter): string {
  const q = new URLSearchParams()
  if (f.st) q.set('st', f.st)
  if (f.top) q.set('top', '1')
  if (f.lg.length) q.set('lg', f.lg.join(','))
  if (f.tags.length) q.set('tag', f.tags.join(','))
  return q.toString().replace(/%2C/g, ',')
}
