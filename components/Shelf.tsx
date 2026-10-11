import Link from 'next/link'

/**
 * Полка, как у Spotify: заголовок слева, тихое «Показать все» справа, под ними ряд карточек, который листается вбок
 * (на компьютере тоже — правый край тает, если карточек больше, чем влезает). Вся главная под первым экраном — полки
 * одного вида, а не плиты разного цвета.
 */
export function Shelf({
  title,
  icon,
  more,
  note,
  id,
  rows,
  children,
}: {
  title: React.ReactNode
  /** знак слева от заголовка (полки историй — тот же кружок, что был у истории) */
  icon?: React.ReactNode
  /** «Показать все» — ссылка на полный список */
  more?: { href: string; label?: string }
  /** тихая строка под рядом: оговорки, «реклама · 18+» */
  note?: React.ReactNode
  id?: string
  /** две строки карточек, листаются вбок вместе (компактные карточки «Скоро начнутся») */
  rows?: 2
  children: React.ReactNode
}) {
  return (
    <section id={id} className="mt-12 scroll-mt-24 sm:mt-14">
      <div className="flex items-end justify-between gap-4">
        <h2 className="h2 flex items-center gap-2.5 text-[24px] leading-none sm:text-[28px]">
          {icon}
          {title}
        </h2>
        {more ? (
          <Link href={more.href} prefetch={false} className="shrink-0 pb-0.5 text-[14px] font-semibold text-dim transition-colors hover:text-fg">
            {more.label ?? 'Показать все'}
          </Link>
        ) : null}
      </div>
      <div className={`scrollbar-none -mx-4 mt-4 ${rows ? 'grid auto-cols-[80%] grid-flow-col grid-rows-2 sm:auto-cols-[330px]' : 'flex'} snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [mask-image:linear-gradient(to_right,#000_calc(100%-32px),transparent)] sm:mx-0 sm:scroll-px-0 sm:px-0`}>
        {children}
      </div>
      {note ? <p className="mt-3 text-[12.5px] text-mute">{note}</p> : null}
    </section>
  )
}

/** Карточка на полке без ширины: графит на тон светлее страницы. Ширина — по виду полки (`SHELF_W`). */
export const SHELF_BASE = 'card relative flex shrink-0 snap-start flex-col overflow-hidden'

/**
 * Ширины карточек: у полок разный вид, как у Spotify (крупные плакаты, обычные обложки, компактные строки), — чтобы
 * главная не была рядом одинаковых карточек (владелец: «блоки игр в подборках все одинаково выглядят»).
 */
export const SHELF_W = {
  /** «Топ дня» — крупный плакат */
  poster: 'w-[86%] sm:w-[440px]',
  /** обычная карточка: «В игре», «Выгодно сегодня», полки тегов */
  card: 'w-[82%] sm:w-[300px]',
  /** компактная строка в два ряда — «Скоро начнутся» (ширину колонки задаёт сетка полки `rows`) */
  row: 'w-full',
}

/** Обычная карточка полки. */
export const SHELF_CARD = `${SHELF_BASE} ${SHELF_W.card} p-5`
