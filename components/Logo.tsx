/**
 * Логотип tag.bet — переплетённая наклонная решётка, без надписи (шапка, подвал). Пока картинкой
 * (public/brand/mark-weave.png — белая на прозрачном), а не вектором: владелец попросил «пока просто картинку».
 * Красим в лайм маской — цвет задаёт CSS. Во вкладке браузера и на картинке для соцсетей — прежняя простая
 * решётка (public/brand/mark.svg, logo-paths.ts): тонкие стыки нового знака на 16 px сливаются.
 * size — высота в px. Название сайта — в подписи ссылки и заголовке вкладки.
 */
const MARK = 'url(/brand/mark-weave.png) center / contain no-repeat'
/** Ширина к высоте у картинки знака (275×256). */
const MARK_ASPECT = 275 / 256

export function LogoMark({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 bg-acid ${className}`}
      style={{ height: size, width: Math.round(size * MARK_ASPECT), mask: MARK, WebkitMask: MARK }}
    />
  )
}
