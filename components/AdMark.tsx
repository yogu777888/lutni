import type { Partner } from '@/config/bookmakers'

/**
 * Маркировка рекламы: «Реклама · рекламодатель · erid» (токен выдаёт партнёрка).
 * Пометка должна быть заметной — поэтому не мельче 11px и нормальный контраст.
 */
export function AdMark({ partner, className = '' }: { partner: Partner; className?: string }) {
  const rest = [partner.ad.advertiser, partner.ad.erid ? `erid: ${partner.ad.erid}` : '', '18+'].filter(Boolean)
  return (
    <p className={`text-[11px] leading-snug text-mute ${className}`}>
      <span className="text-dim">Реклама</span> · {rest.join(' · ')}
    </p>
  )
}
