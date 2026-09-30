import type { Partner } from '@/config/bookmakers'

export function PartnerBadge({ partner, size = 36 }: { partner: Partner; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-xl font-display font-bold ring-1 ring-white/10"
      style={{
        width: size,
        height: size,
        background: partner.color,
        color: partner.textColor,
        fontSize: Math.round(size * (partner.short.length > 1 ? 0.34 : 0.46)),
      }}
    >
      {partner.short}
    </span>
  )
}
