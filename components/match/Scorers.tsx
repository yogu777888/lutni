'use client'

import { useLayoutEffect, useRef, useState } from 'react'

/**
 * Авторы голов на табло — строго одной строкой (владелец: «если много авторов голов будет … блок будет ломаться»):
 * сколько влезло, остальные — «+2»; нажатие раскрывает всех. Сколько влезает — по невидимой копии строки во всю ширину.
 */
export function Scorers({ items }: { items: string[] }) {
  const probe = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState(items.length)
  const [open, setOpen] = useState(false)

  useLayoutEffect(() => {
    const el = probe.current
    if (!el) return
    const calc = () => {
      const kids = [...el.children] as HTMLElement[]
      if (!kids.length) return
      const top = kids[0].offsetTop
      let n = kids.filter((k) => k.offsetTop === top).length
      // не влезли все — место под «+N» (~40px) у правого края
      if (n < kids.length) while (n > 1 && kids[n - 1].offsetLeft + kids[n - 1].offsetWidth + 40 > el.clientWidth) n--
      setFit(n)
    }
    calc()
    const ro = new ResizeObserver(calc)
    ro.observe(el)
    return () => ro.disconnect()
  }, [items])

  // «·» — в конце предыдущего, а не в начале следующего: при переносе строка не начинается с точки
  const item = (t: string, i: number, all: string[]) => (
    <span key={i} className="whitespace-nowrap">
      {t}
      {i < all.length - 1 ? <span className="px-1.5 text-mute">·</span> : null}
    </span>
  )
  const rest = items.length - fit
  return (
    <div className="relative mt-0.5 text-[13px] leading-snug text-dim">
      <div ref={probe} aria-hidden className="pointer-events-none invisible absolute inset-x-0 top-0 flex flex-wrap">
        {items.map(item)}
      </div>
      {open || !rest ? (
        <div className={`flex ${open ? 'flex-wrap' : 'overflow-hidden'}`}>{items.map(item)}</div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Все авторы голов: ${items.join(', ')}`}
          title={items.join(' · ')}
          className="flex max-w-full items-center text-left"
        >
          <span className="flex min-w-0 overflow-hidden">{items.slice(0, fit).map(item)}</span>
          <span className="ml-1.5 shrink-0 rounded-full bg-white/[0.08] px-1.5 text-[12px] font-semibold text-fg/85">+{rest}</span>
        </button>
      )}
    </div>
  )
}
