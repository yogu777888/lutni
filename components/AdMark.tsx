import type { Partner } from '@/config/bookmakers'

/** Маркировка рекламы: «Реклама · рекламодатель · erid». Токен выдаёт партнёрка. */
export function AdMark({ partner, className = '' }: { partner: Partner; className?: string }) {
  const parts = ['Реклама', partner.ad.advertiser, partner.ad.erid ? `erid: ${partner.ad.erid}` : ''].filter(Boolean)
  return <p className={`text-[10px] leading-tight text-mute ${className}`}>{parts.join(' · ')} · 18+</p>
}
