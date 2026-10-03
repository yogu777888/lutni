import { LOGO_ASPECT, LOGO_VIEWBOX, MARK_ASPECT, MARK_D, MARK_VIEWBOX, TEXT_D } from './logo-paths'

/** Знак tag.bet: прямая лаймовая решётка. size — высота в px. */
export function LogoMark({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox={MARK_VIEWBOX} height={size} width={Math.round(size * MARK_ASPECT)} className={`shrink-0 ${className}`} aria-hidden>
      <path className="fill-acid" d={MARK_D} />
    </svg>
  )
}

/**
 * Логотип целиком, в кривых: решётка + «tag.bet». size — высота в px вместе
 * с хвостом «g»; надпись берёт цвет текста (currentColor).
 */
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
      <path fill="currentColor" d={TEXT_D} />
    </svg>
  )
}

/**
 * Логотип шапки и подвала: главная — лаймовая решётка, «tag.bet» рядом шрифтом сайта
 * и тише («.bet» приглушён). Название нужно рядом, пока решётку не узнают сами по себе.
 */
export function Brand({ size = 30, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center ${className}`} style={{ gap: Math.round(size * 0.32) }} role="img" aria-label="tag.bet">
      <LogoMark size={size} />
      <span className="font-semibold leading-none tracking-[-0.035em] text-fg" style={{ fontSize: Math.round(size * 0.66) }}>
        tag<span className="text-dim">.bet</span>
      </span>
    </span>
  )
}
