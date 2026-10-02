import type { Partner } from '@/config/bookmakers'
import { goHref, SPONSORED_REL, type Placement } from '@/lib/affiliate'
import { AdMark } from './AdMark'
import { PartnerBadge } from './PartnerBadge'

/** Строка «Где ставить»: знак, название, бонус и оценка; вся строка — ссылка на букмекера. */
export function PartnerCard({ partner, placement }: { partner: Partner; placement: Placement; rank?: number }) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <a
        href={goHref(partner, placement)}
        target="_blank"
        rel={SPONSORED_REL}
        className="group grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3"
      >
        <PartnerBadge partner={partner} size={34} />
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold transition-colors group-hover:text-acid">{partner.name}</span>
          <span className="block truncate text-[12px] text-dim">{partner.bonus}</span>
        </span>
        <span className="num text-[20px] font-bold tracking-tight">{partner.rating.toFixed(1)}</span>
      </a>
      <AdMark partner={partner} className="mt-1 pl-[46px]" />
    </div>
  )
}
