import type { Partner } from '@/config/bookmakers'

/**
 * Маркировка рекламы: «Реклама · рекламодатель · erid» (токен выдаёт партнёрка).
 * Пометка должна быть заметной — поэтому не мельче 11px и нормальный контраст.
 */
/** Та же пометка одной строкой — для подсказок, где места под строку нет («Бонус» в шапке). */
export function adLine(partner: Partner) {
  return ['Реклама', partner.ad.advertiser, partner.ad.erid ? `erid: ${partner.ad.erid}` : '', '18+'].filter(Boolean).join(' · ')
}

/** Сведения о рекламе для подсказки у пометки «Реклама»: рекламодатель (нет юрлица в env — имя партнёра) и erid. */
export function adInfo(partner: Partner) {
  return ['Реклама', `рекламодатель: ${partner.ad.advertiser || partner.name}`, partner.ad.erid ? `erid: ${partner.ad.erid}` : '', '18+'].filter(Boolean).join(' · ')
}

export function AdMark({ partner, className = '' }: { partner: Partner; className?: string }) {
  const rest = [partner.ad.advertiser, partner.ad.erid ? `erid: ${partner.ad.erid}` : '', '18+'].filter(Boolean)
  return (
    <p className={`text-[11px] leading-snug text-mute ${className}`}>
      <span className="text-dim">Реклама</span> · {rest.join(' · ')}
    </p>
  )
}
