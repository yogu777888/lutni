/**
 * Логотип tag.bet — решётка из четырёх «Т» владельца, без надписи (шапка, подвал). Вектор public/brand/mark.svg —
 * обводка картинки владельца как есть (форму не меняем); тот же знак — во вкладке (app/icon.svg), в иконке для
 * телефона, аватаре и картинке для соцсетей (там он лаймовый — цвет бренда). На сайте красим маской в тёплый белый,
 * как кнопки и текст: владелец выбрал белый, когда кнопки стали белыми — лайм на экране держат кольца историй.
 * size — высота в px. Название сайта — в подписи ссылки и заголовке вкладки.
 */
const MARK = 'url(/brand/mark.svg) center / contain no-repeat'
/** Ширина к высоте у знака (571×565). */
const MARK_ASPECT = 571 / 565

export function LogoMark({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 bg-fg ${className}`}
      style={{ height: size, width: Math.round(size * MARK_ASPECT), mask: MARK, WebkitMask: MARK }}
    />
  )
}
