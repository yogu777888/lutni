'use client'

import { createContext, useContext, useState } from 'react'

/**
 * Переключатель, как сегменты в iOS («Исход | Голы»): маленькая капсула в строке заголовка блока (`SegTabs` в `aside`
 * у `Section`), панели — внутри блока (`SegPanel`); общее состояние — `SegRoot` вокруг всего раздела. Все панели — в
 * разметке (поисковики видят всё), видна выбранная; без `SegRoot` видна первая (`first`).
 */
const Ctx = createContext<{ on: string; set: (k: string) => void } | null>(null)

export function SegRoot({ initial, children }: { initial: string; children: React.ReactNode }) {
  const [on, set] = useState(initial)
  return <Ctx.Provider value={{ on, set }}>{children}</Ctx.Provider>
}

export function SegTabs({ items, label }: { items: { key: string; label: string }[]; label: string }) {
  const c = useContext(Ctx)
  if (!c) return null
  return (
    <div role="tablist" aria-label={label} className="inline-grid auto-cols-fr grid-flow-col gap-0.5 rounded-ctl bg-white/[0.07] p-0.5">
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          role="tab"
          aria-selected={it.key === c.on}
          onClick={() => c.set(it.key)}
          className={`h-7 rounded-lg px-3 text-[13px] font-semibold transition-colors ${it.key === c.on ? 'bg-white/[0.16] text-fg' : 'text-dim hover:text-fg'}`}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

export function SegPanel({ k, first = false, children }: { k: string; first?: boolean; children: React.ReactNode }) {
  const c = useContext(Ctx)
  return <div hidden={c ? c.on !== k : !first}>{children}</div>
}
