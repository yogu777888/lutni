import type { Partner } from '@/config/bookmakers'

/**
 * Знак букмекера — квадратная иконка из `public/bookmakers/<slug>.svg` (прислал владелец: «тут лого всех легальных бк»)
 * с мягким «сквиркл»-углом. Новый букмекер в `config/bookmakers.ts` — положите и его иконку (SVG 64×64 с подложкой).
 */
export function PartnerBadge({ partner, size = 36 }: { partner: Partner; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- маленький SVG, оптимизация next/image не нужна
    <img
      src={`/bookmakers/${partner.slug}.svg`}
      alt=""
      aria-hidden
      width={size}
      height={size}
      loading="lazy"
      // тонкая обводка изнутри — тёмные знаки (Leon, Zenit, Bettery) иначе сливаются с графитовой карточкой
      className="inline-block shrink-0 outline outline-1 -outline-offset-1 outline-white/10"
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.25), background: partner.color }}
    />
  )
}
