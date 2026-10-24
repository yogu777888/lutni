'use client'

import { useState } from 'react'

/** Нижняя строка списка «Показать ещё (2)» / «Свернуть» — та же сетка, что у строк `MatchTags` (поля 12px, текст
 *  с колонки названий, шеврон — в колонке стрелок). Скрытые строки — в разметке с сервера (`hidden`, `data-more`),
 *  раскрывает их `data-open` у списка. */
export function MoreRows({ count }: { count: number }) {
  const [open, setOpen] = useState(false)
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        onClick={(e) => {
          e.currentTarget.closest('ul')?.toggleAttribute('data-open', !open)
          setOpen(!open)
        }}
        className="group flex min-h-12 w-full items-center gap-3 rounded-tile px-3 py-3 text-left text-[14px] font-medium text-fg/80 transition-colors hover:bg-white/[0.04] hover:text-fg"
      >
        <span className="w-8 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1">{open ? 'Свернуть' : `Показать ещё (${count})`}</span>
        <svg viewBox="0 0 16 16" aria-hidden className="h-4 w-4 shrink-0 text-mute transition-colors group-hover:text-fg">
          <path d={open ? 'M3.5 10 8 5.5 12.5 10' : 'M3.5 6 8 10.5 12.5 6'} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </li>
  )
}
