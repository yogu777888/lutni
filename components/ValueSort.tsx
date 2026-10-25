'use client'

import { useLayoutEffect, useState } from 'react'

/**
 * «По преимуществу / По времени» на «Выгодных ставках» — в браузере: страница хранится готовой одной на всех (ISR) и
 * параметров адреса не читает, а строки те же — меняется только порядок. Обёртке `target` ставим `data-vsort="time"`,
 * у строк — `--ot` (место по времени, правило `[data-vsort='time'] [data-ot]` в app/globals.css); выбранный — в адресе
 * `?sort=time`, как раньше (ссылкой можно поделиться).
 */
export function ValueSort({ target }: { target: string }) {
  const [time, setTime] = useState(false)
  const apply = (t: boolean) => {
    setTime(t)
    const el = document.getElementById(target)
    if (el) el.dataset.vsort = t ? 'time' : ''
  }
  useLayoutEffect(() => {
    if (new URLSearchParams(window.location.search).get('sort') === 'time') apply(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const pick = (t: boolean) => {
    apply(t)
    const url = new URL(window.location.href)
    if (t) url.searchParams.set('sort', 'time')
    else url.searchParams.delete('sort')
    window.history.replaceState(window.history.state, '', url)
  }
  return (
    <div role="group" aria-label="Порядок ставок" className="grid grid-cols-2 gap-1 rounded-ctl bg-white/[0.04] p-1 text-[14px] font-medium sm:inline-flex">
      {(
        [
          [false, 'По преимуществу'],
          [true, 'По времени'],
        ] as const
      ).map(([t, label]) => (
        <button
          key={label}
          type="button"
          onClick={() => pick(t)}
          aria-pressed={t === time}
          className={`rounded-md px-3.5 py-1.5 text-center whitespace-nowrap transition-colors ${t === time ? 'bg-white/[0.08] text-fg' : 'text-dim hover:text-fg'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
