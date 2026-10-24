'use client'

import { BackLabel } from './BackButton'

/**
 * Шапка вложенной страницы на телефоне и планшете — одной строкой 52px, как навигация в iOS (владелец: «мне не нравится
 * двухэтажный хедер на мобильных» — «да»; потом «давай по такому принципу сделаем хедер на других страницах? без подписей у
 * стрелочек»): вместо надписи tag.bet — «‹» без подписи (куда вернёт — в подсказке и для экранного диктора), по центру —
 * название страницы (`idle`; в матче — команды, а когда крупный счёт ушёл под шапку, между ними появляется счёт — `MatchBar`). Слой поверх шапки (`.hdr-over`, `fixed`): так он есть уже в разметке с сервера и не сдвигает
 * шапку после загрузки; надпись tag.bet скрыта правилом `body:has(.hdr-over) .hdr-logo` в app/globals.css, слой уходит
 * вместе с шапкой при прокрутке вниз. От lg не показывается.
 */
export function HeaderRow({ fallback, idle, right = null }: { fallback: { href: string; label: string }; idle: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="hdr-over pointer-events-none fixed inset-x-0 top-0 z-[41] h-[52px] lg:hidden">
      <div className="absolute left-4 top-1 sm:left-5 [&>*]:pointer-events-auto">
        <BackLabel fallback={fallback} bar short />
      </div>
      <div className="pointer-events-auto absolute inset-y-0 left-14 right-14 flex items-center justify-center">{idle}</div>
      {/* справа — короткая метка (в матче — минута «● 59′»), в пределах 56px, что держит место под «‹» с другой стороны */}
      {right ? <div className="absolute inset-y-0 right-3 flex items-center sm:right-4">{right}</div> : null}
    </div>
  )
}
