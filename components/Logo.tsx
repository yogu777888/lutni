import { MARK_ASPECT, MARK_D, MARK_VIEWBOX } from './logo-paths'

/**
 * Логотип tag.bet — одна наклонная лаймовая решётка, без надписи (в шапке, подвале, на иконках).
 * size — высота в px. Название сайта — в подписи ссылки и заголовке вкладки.
 */
export function LogoMark({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox={MARK_VIEWBOX} height={size} width={Math.round(size * MARK_ASPECT)} className={`shrink-0 ${className}`} aria-hidden>
      <path className="fill-acid" d={MARK_D} />
    </svg>
  )
}
