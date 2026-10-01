import Link from 'next/link'
import type { Partner } from '@/config/bookmakers'
import { goHref, type Placement } from '@/lib/affiliate'
import { AdMark } from './AdMark'
import { CtaLink } from './CtaLink'
import { PartnerBadge } from './PartnerBadge'

/** Строка букмекера в боковой колонке: знак, название, рейтинг и кнопка. */
export function PartnerCard({ partner, placement, rank }: { partner: Partner; placement: Placement; rank?: number }) {
  return (
    <div className="py-3.5 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        {rank ? <span className="num w-3 text-center text-[12px] font-medium text-mute">{rank}</span> : null}
        <PartnerBadge partner={partner} size={34} />
        <div className="min-w-0 flex-1">
          <Link href={`/bookmakers/${partner.slug}`} prefetch={false} className="block truncate text-[14px] font-semibold transition-opacity hover:opacity-75">
            {partner.name}
          </Link>
          <div className="num mt-0.5 whitespace-nowrap text-[12px] text-dim">★ {partner.rating.toFixed(1)}</div>
        </div>
        <CtaLink href={goHref(partner, placement)} variant="light" className="px-3.5 py-1.5 text-[13px]">
          Перейти
        </CtaLink>
      </div>
      <AdMark partner={partner} className={rank ? 'mt-1.5 pl-6' : 'mt-1.5'} />
    </div>
  )
}
