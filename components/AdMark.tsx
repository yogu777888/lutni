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

/** Одна пометка на блок со ссылками к разным букмекерам: рекламодатели через «;», 18+ — один раз. */
export function AdMarks({ partners, className = '' }: { partners: Partner[]; className?: string }) {
  if (!partners.length) return null
  if (partners.length === 1) return <AdMark partner={partners[0]} className={className} />
  const who = partners.map((p) => [p.ad.advertiser, p.ad.erid ? `erid: ${p.ad.erid}` : ''].filter(Boolean).join(', ')).filter(Boolean)
  return (
    <p className={`text-[11px] leading-snug text-mute ${className}`}>
      <span className="text-dim">Реклама</span> · {[...who, '18+'].join(' · ')}
    </p>
  )
}
