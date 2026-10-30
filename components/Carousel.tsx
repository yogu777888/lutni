'use client'

import { Children, useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Лента карточек вбок со снапом и точками под ней (владелец: «Матч в фокусе» и «Интересно сегодня» листаются, как в
 * прототипе ChatGPT): на телефоне карточка 88% ширины и край следующей, от sm — `(100% − 10px) / 2,15`; справа лента
 * до края экрана. Точки — какая карточка у левого края; нажатие — к ней. Одна карточка — во всю ширину, без точек.
 */
export function Carousel({ children, label }: { children: ReactNode; label: string }) {
  const items = Children.toArray(children)
  const ref = useRef<HTMLDivElement>(null)
  const [at, setAt] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el || items.length < 2) return
    const on = () => {
      const kids = [...el.children] as HTMLElement[]
      // в конце ленты последняя карточка может не дойти до левого края — тогда выбрана она
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 2) return setAt(kids.length - 1)
      let best = 0
      kids.forEach((k, i) => {
        if (Math.abs(k.offsetLeft - el.scrollLeft - 16) < Math.abs(kids[best].offsetLeft - el.scrollLeft - 16)) best = i
      })
      setAt(best)
    }
    el.addEventListener('scroll', on, { passive: true })
    return () => el.removeEventListener('scroll', on)
  }, [items.length])

  if (items.length < 2) return <>{children}</>
  const go = (i: number) => {
    const el = ref.current
    const k = el?.children[i] as HTMLElement | undefined
    if (el && k) el.scrollTo({ left: k.offsetLeft - 16, behavior: 'smooth' })
  }
  return (
    <div>
      <div
        ref={ref}
        className="scrollbar-none relative -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2.5 overflow-x-auto px-4 [&>*]:shrink-0 [&>*]:basis-[88%] [&>*]:snap-start sm:[&>*]:basis-[calc((100%-10px)/2.15)]"
      >
        {items}
      </div>
      <div className="mt-3 flex justify-center gap-1" role="tablist" aria-label={label}>
        {items.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === at}
            aria-label={`${i + 1} из ${items.length}`}
            onClick={() => go(i)}
            // место нажатия 24px, сама точка 6px
            className="grid h-6 w-5 place-items-center"
          >
            <span className={`h-1.5 w-1.5 rounded-full transition-colors ${i === at ? 'bg-fg' : 'bg-white/25'}`} />
          </button>
        ))}
      </div>
    </div>
  )
}
