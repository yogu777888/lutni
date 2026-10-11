import Link from 'next/link'

/**
 * Полка, как у Spotify: заголовок слева, тихое «Показать все» справа, под ними ряд карточек, который листается вбок
 * (на компьютере тоже — правый край тает, если карточек больше, чем влезает). Вся главная под первым экраном — полки
 * одного вида, а не плиты разного цвета.
 */
export function Shelf({
  title,
  more,
  note,
  id,
  children,
}: {
  title: React.ReactNode
  /** «Показать все» — ссылка на полный список */
  more?: { href: string; label?: string }
  /** тихая строка под рядом: оговорки, «реклама · 18+» */
  note?: React.ReactNode
  id?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="mt-12 scroll-mt-24 sm:mt-14">
      <div className="flex items-end justify-between gap-4">
        <h2 className="h2 text-[24px] leading-none sm:text-[28px]">{title}</h2>
        {more ? (
          <Link href={more.href} prefetch={false} className="shrink-0 pb-0.5 text-[14px] font-semibold text-dim transition-colors hover:text-fg">
            {more.label ?? 'Показать все'}
          </Link>
        ) : null}
      </div>
      <div className="scrollbar-none -mx-4 mt-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [mask-image:linear-gradient(to_right,#000_calc(100%-32px),transparent)] sm:mx-0 sm:scroll-px-0 sm:px-0">
        {children}
      </div>
      {note ? <p className="mt-3 text-[12.5px] text-mute">{note}</p> : null}
    </section>
  )
}

/** Карточка на полке: одна ширина у всех полок, графит на тон светлее страницы. */
export const SHELF_CARD = 'card flex w-[82%] shrink-0 snap-start flex-col p-5 sm:w-[300px]'
