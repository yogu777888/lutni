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
export function HeaderRow({
  fallback,
  idle,
  right = null,
  wide = false,
}: {
  fallback: { href: string; label: string }
  idle: React.ReactNode
  right?: React.ReactNode
  /** справа больше одной метки (в матче — минута и звёздочка): середина уже на 24px с обеих сторон, чтобы остаться по центру */
  wide?: boolean
}) {
  return (
    <div className="hdr-over pointer-events-none fixed inset-x-0 top-0 z-[41] h-[52px] lg:hidden">
      <div className="absolute left-4 top-1 sm:left-5 [&>*]:pointer-events-auto">
        <BackLabel fallback={fallback} bar short />
      </div>
      <div className={`pointer-events-auto absolute inset-y-0 flex items-center justify-center ${wide ? 'inset-x-20' : 'inset-x-14'}`}>{idle}</div>
      {/* справа — короткие метки (в матче — минута «59′» и звёздочка «в избранное»), в пределах поля, что держит место под «‹»
          с другой стороны (56px, `wide` — 80px); отступ от края — как у «‹» */}
      {right ? <div className="absolute inset-y-0 right-4 flex items-center gap-0.5 sm:right-5 [&>*]:pointer-events-auto">{right}</div> : null}
    </div>
  )
}
