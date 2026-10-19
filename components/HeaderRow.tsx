'use client'

import { BackLabel } from './BackButton'

/**
 * Шапка вложенной страницы на телефоне и планшете — одной строкой 52px, как навигация в iOS (владелец: «мне не нравится
 * двухэтажный хедер на мобильных» — «да»; потом «давай по такому принципу сделаем хедер на других страницах? без подписей у
 * стрелочек»): вместо надписи tag.bet — «‹» без подписи (куда вернёт — в подсказке и для экранного диктора), по центру —
 * название страницы (`idle`), а когда нужно — другое содержимое на том же месте (`center`, `show`: мини-табло матча, когда
 * счёт ушёл под шапку). Слой поверх шапки (`.hdr-over`, `fixed`): так он есть уже в разметке с сервера и не сдвигает
 * шапку после загрузки; надпись tag.bet скрыта правилом `body:has(.hdr-over) .hdr-logo` в app/globals.css, слой уходит
 * вместе с шапкой при прокрутке вниз. От lg не показывается.
 */
export function HeaderRow({
  fallback,
  idle,
  center = null,
  show = false,
}: {
  fallback: { href: string; label: string }
  /** по центру шапки, пока нет `center`: название страницы */
  idle: React.ReactNode
  /** вместо `idle`, когда `show`: мини-табло матча */
  center?: React.ReactNode
  show?: boolean
}) {
  const on = Boolean(center) && show
  const layer = 'absolute inset-y-0 left-14 right-14 flex items-center justify-center transition-[opacity,transform] duration-200'
  return (
    <div className="hdr-over pointer-events-none fixed inset-x-0 top-0 z-[41] h-[52px] lg:hidden">
      <div className="absolute left-4 top-1 sm:left-5 [&>*]:pointer-events-auto">
        <BackLabel fallback={fallback} bar short />
      </div>
      <div aria-hidden={on} className={`${layer} ${on ? '-translate-y-1 opacity-0' : ''}`}>
        {idle}
      </div>
      {center ? (
        <div aria-hidden={!on} inert={!on} className={`${layer} ${on ? 'pointer-events-auto' : 'translate-y-1 opacity-0'}`}>
          {center}
        </div>
      ) : null}
    </div>
  )
}
