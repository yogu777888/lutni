'use client'

import { BackLabel } from './BackButton'

/**
 * Свои кнопки страницы в самой шапке на телефоне и планшете — шапка одной строкой 52px, без второго ряда (владелец: «мне
 * не нравится двухэтажный хедер на мобильных, на топовых сайтах такого нет» — «да»): слева от надписи tag.bet — круглая
 * «‹» (куда вернёт — в подсказке), а когда крупный заголовок или табло ушли вверх, по центру шапки — название страницы
 * или мини-табло матча, и надпись tag.bet гаснет (как в Apple Sports). Слой поверх шапки (`.hdr-over`, `fixed`): так он
 * есть уже в разметке с сервера и не сдвигает шапку после загрузки; надпись подвинута правилом
 * `body:has(.hdr-over) .hdr-logo` в app/globals.css, уходит вместе с шапкой при прокрутке вниз. От lg не показывается.
 */
export function HeaderRow({
  fallback,
  center,
  show,
}: {
  fallback: { href: string; label: string }
  /** название страницы или мини-табло */
  center: React.ReactNode
  /** показать `center` (заголовок или табло ушли вверх) */
  show: boolean
}) {
  return (
    <div data-mini={show ? '' : undefined} className="hdr-over pointer-events-none fixed inset-x-0 top-0 z-[41] h-[52px] lg:hidden">
      <div className="pointer-events-auto absolute left-2 top-2 sm:left-3">
        <BackLabel fallback={fallback} round />
      </div>
      <div
        aria-hidden={!show}
        inert={!show}
        className={`absolute inset-y-0 left-12 right-14 flex items-center justify-center transition-[opacity,transform] duration-200 ${show ? 'pointer-events-auto' : 'translate-y-1 opacity-0'}`}
      >
        {center}
      </div>
    </div>
  )
}
