import { LOGO_ASPECT, LOGO_VIEWBOX, MARK_ASPECT, MARK_D, MARK_VIEWBOX, TEXT_D, TEXT_TRANSFORM } from './logo-paths'

/** Знак tag.bet: переплетённая решётка (каждая перекладина проходит «под» второй вертикалью). */
export function LogoMark({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox={MARK_VIEWBOX} height={size} width={Math.round(size * MARK_ASPECT)} className={`shrink-0 ${className}`} aria-hidden>
      <path className="fill-acid" d={MARK_D} />
    </svg>
  )
}

/** Логотип целиком, в кривых. size — высота в px; надпись берёт цвет текста (currentColor). */
export function Logo({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      height={size}
      width={Math.round(size * LOGO_ASPECT)}
      className={`shrink-0 ${className}`}
      role="img"
      aria-label="tag.bet"
    >
      <path className="fill-acid" d={MARK_D} />
      <path fill="currentColor" transform={TEXT_TRANSFORM} d={TEXT_D} />
    </svg>
  )
}
