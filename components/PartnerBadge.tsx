import type { Partner } from '@/config/bookmakers'

/** Знак букмекера: фирменный цвет, мягкий «сквиркл»-угол. */
export function PartnerBadge({ partner, size = 36 }: { partner: Partner; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center font-extrabold"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.25),
        background: partner.color,
        color: partner.textColor,
        fontSize: Math.round(size * (partner.short.length > 1 ? 0.34 : 0.44)),
      }}
    >
      {partner.short}
    </span>
  )
}
