'use client'

import { useState } from 'react'

/**
 * Переключатель, как сегменты в iOS («Исход | Голы», «Ливерпуль | Арсенал»): одна капсула, выбранный — светлее.
 * Все панели — в разметке (поисковики видят всё), видна выбранная.
 */
export function Segmented({ items, label }: { items: { key: string; label: React.ReactNode; content: React.ReactNode }[]; label: string }) {
  const [on, setOn] = useState(items[0]?.key)
  return (
    <div>
      {items.length > 1 ? (
        <div role="tablist" aria-label={label} className="mb-3 grid auto-cols-fr grid-flow-col gap-0.5 rounded-ctl bg-white/[0.06] p-0.5">
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              role="tab"
              aria-selected={it.key === on}
              onClick={() => setOn(it.key)}
              className={`flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold transition-colors ${
                it.key === on ? 'bg-white/[0.14] text-fg' : 'text-dim hover:text-fg'
              }`}
            >
              {it.label}
            </button>
          ))}
        </div>
      ) : null}
      {items.map((it) => (
        <div key={it.key} role={items.length > 1 ? 'tabpanel' : undefined} hidden={it.key !== on}>
          {it.content}
        </div>
      ))}
    </div>
  )
}
