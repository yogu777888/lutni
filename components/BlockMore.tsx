import Link from 'next/link'

/**
 * «Все … →» внизу блока-списка — одно правило на сайте (владелец: «а то что у другие матчи и выгодно сегодня кнопка
 * все… снизу это правильно?»): нижней строкой под тонкой чертой во всю ширину карточки, 13px серым, при наведении белым.
 * Правый угол шапки у таких блоков занят пометкой «Реклама» или подписью, о чём список. `panel` — в боковой панели без
 * полей карточки: черта и отступ сверху, без своих боковых полей.
 */
export function BlockMore({ href, children, panel = false, className = '' }: { href: string; children: React.ReactNode; panel?: boolean; className?: string }) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={`block border-t border-edge text-[13px] font-medium text-dim transition-colors hover:text-fg ${panel ? 'mt-3 pt-3' : 'px-4 py-3 sm:px-5'} ${className}`}
    >
      {children} →
    </Link>
  )
}
