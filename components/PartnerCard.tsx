import Link from 'next/link'
import type { Partner } from '@/config/bookmakers'
import { goHref, type Placement } from '@/lib/affiliate'
import { AdMark } from './AdMark'
import { CtaLink } from './CtaLink'
import { PartnerBadge } from './PartnerBadge'
import { Stars } from './Stars'

export function PartnerCard({ partner, placement, rank }: { partner: Partner; placement: Placement; rank?: number }) {
  return (
    <div className="rounded-2xl bg-panel-2 p-3 ring-1 ring-inset ring-edge">
      <div className="flex items-center gap-3">
        {rank ? <span className="num w-4 text-center text-xs font-bold text-mute">{rank}</span> : null}
        <PartnerBadge partner={partner} size={40} />
        <div className="min-w-0 flex-1">
          <Link href={`/bookmakers/${partner.slug}`} prefetch={false} className="block truncate font-bold hover:text-acid">
            {partner.name}
          </Link>
          <div className="flex items-center gap-1.5">
            <Stars value={partner.rating} />
            <span className="num text-xs text-dim">{partner.rating.toFixed(1)}</span>
          </div>
        </div>
        <CtaLink href={goHref(partner, placement)} className="px-3 py-2 text-[13px]">
          Играть
        </CtaLink>
      </div>
      <p className="mt-2 text-xs font-semibold text-acid">{partner.bonus}</p>
      <AdMark partner={partner} className="mt-1" />
    </div>
  )
}
