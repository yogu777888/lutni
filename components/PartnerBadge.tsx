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
      // тонкая обводка — тёмные знаки (Leon, Zenit, Bettery) иначе сливаются с графитовой карточкой; тенью, а не `outline`:
      // Safari на iPhone рисовал outline квадратом поверх скругления — белый квадрат вокруг знака (владелец: «иконки бк
      // … как будто квадрат белый на них»); заливки цветом букмекера нет — она проступала жёлтой каймой по краю скругления
      className="inline-block shrink-0"
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.25), boxShadow: '0 0 0 1px rgb(255 255 255 / 0.1)' }}
    />
  )
}
