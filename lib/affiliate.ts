import type { Partner } from '@/config/bookmakers'

/**
 * Места размещения партнёрских ссылок. Попадают в subid, чтобы в кабинете
 * партнёрки было видно, какой блок сайта приносит регистрации и депозиты.
 */
export type Placement =
  | 'header'
  | 'banner'
  | 'sidebar'
  | 'sticky'
  | 'pick'
  | 'odds-table'
  | 'value'
  | 'tag'
  | 'bookmakers'
  | 'review'
  | 'match-cta'

/** Внутренняя ссылка на редирект: /go/fonbet?p=pick&m=123 */
export function goHref(partner: Pick<Partner, 'slug'> | string, placement: Placement, matchId?: number): string {
  const slug = typeof partner === 'string' ? partner : partner.slug
  const params = new URLSearchParams({ p: placement })
  if (matchId) params.set('m', String(matchId))
  return `/go/${slug}?${params}`
}

/** Итоговая партнёрская ссылка: подставляем {subid}, {placement}, {match}. */
export function resolveAffiliateUrl(partner: Partner, placement: string, matchId?: string): string {
  const subid = [placement, matchId].filter(Boolean).join('_')
  return partner.url
    .replaceAll('{subid}', encodeURIComponent(subid))
    .replaceAll('{placement}', encodeURIComponent(placement))
    .replaceAll('{match}', encodeURIComponent(matchId ?? ''))
}

/** rel для партнёрских ссылок (требование поисковиков к рекламным ссылкам). */
export const SPONSORED_REL = 'sponsored nofollow noopener'
