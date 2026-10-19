'use client'

import { BackLabel } from './BackButton'

/**
 * Свои кнопки страницы в самой шапке на телефоне и планшете — шапка одной строкой 52px, без второго ряда (владелец: «мне
 * не нравится двухэтажный хедер на мобильных, на топовых сайтах такого нет» — «да»): вместо надписи tag.bet — «‹ Лиги»,
 * как кнопка «назад» в iOS (владелец: «а может на мобилках там где в хедере появляется кнопка назад убирать лого?»), а
 * когда крупный заголовок или табло ушли вверх, по центру шапки — название страницы или мини-табло матча, у «‹» подпись
 * сворачивается (как в Apple Sports). Слой поверх шапки (`.hdr-over`, `fixed`): так он есть уже в разметке с сервера и
 * не сдвигает шапку после загрузки; надпись tag.bet скрыта правилом `body:has(.hdr-over) .hdr-logo` в app/globals.css,
 * слой уходит вместе с шапкой при прокрутке вниз. От lg не показывается.
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
      {/* «‹ Лиги» с подписью, как кнопка «назад» в iOS; по центру появилось название или мини-табло — только «‹» */}
      <div className="absolute left-4 top-1 w-[60vw] sm:left-5 [&>*]:pointer-events-auto">
        <BackLabel fallback={fallback} bar short={show} />
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
