'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'

export type MenuLink = { label: string; href: string; active: boolean }

/**
 * Кнопка-воронка справа от «Матчи» на телефоне (владелец прислал прототип ChatGPT: «справа сверху кнопка сортировки»):
 * порядок списка и другие дни (вкладки — только «Сегодня · LIVE · Завтра»). Закрывается нажатием мимо, Esc и выбором.
 */
export function MatchesMenu({ orders, days }: { orders: MenuLink[]; days: MenuLink[] }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const down = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', down)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('pointerdown', down)
      document.removeEventListener('keydown', key)
    }
  }, [open])
  const cur = orders.find((o) => o.active)
  const item = (o: MenuLink) => (
    <Link
      key={o.href}
      href={o.href}
      prefetch={false}
      scroll={false}
      role="menuitem"
      aria-current={o.active ? 'true' : undefined}
      onClick={() => setOpen(false)}
      className={`flex items-center justify-between gap-6 px-4 py-2 transition-colors hover:bg-white/[0.06] ${o.active ? 'text-fg' : 'text-dim'}`}
    >
      {o.label}
      {o.active ? <span aria-hidden>✓</span> : null}
    </Link>
  )
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 font-medium text-dim transition-colors hover:text-fg"
      >
        <Icon k="filter" size={16} />
        {cur?.label ?? 'Порядок'}
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-full z-20 mt-2 w-max min-w-48 max-w-[calc(100vw-2rem)] overflow-hidden rounded-tile bg-panel-3 py-1 text-[14px] shadow-lg">
          <p className="px-4 pb-1 pt-2 text-[12px] text-mute">Порядок</p>
          {orders.map(item)}
          {days.length ? (
            <>
              <p className="mt-1 border-t border-edge px-4 pb-1 pt-3 text-[12px] text-mute">Другой день</p>
              {days.map(item)}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
