'use client'

import { useId, useLayoutEffect, useState, type ReactNode } from 'react'

export type TabItem = { key: string; label: string; content: ReactNode }

/**
 * Переключатель в стиле iOS: капсула (главный — на всю ширину колонки, внутри карточки — `small`, не шире 24rem), выбранный — белый с тёмным текстом, как выбранный день в ряду дней. Все вкладки
 * — в разметке с сервера (поисковики видят страницу целиком), невыбранные скрыты `hidden`. С `param` выбранная
 * вкладка пишется в адрес (`?tab=stats`, без новой записи в историю) — ссылкой можно поделиться, а обновление идущего
 * матча (`router.refresh`) остаётся на ней. Выбранную из адреса читаем в браузере до показа (`useLayoutEffect`):
 * страница матча хранится готовой одной на всех (ISR), сервер параметров адреса не видит.
 */
export function Tabs({
  items,
  initial,
  param,
  small = false,
  className = '',
  barClassName = '',
  panelClassName = '',
}: {
  items: TabItem[]
  initial?: string
  param?: string
  /** внутри карточки — ниже и тише (таймы в «Статистике», команды в «Составах») */
  small?: boolean
  className?: string
  barClassName?: string
  panelClassName?: string
}) {
  const uid = useId()
  const [cur, setCur] = useState(items.some((t) => t.key === initial) ? initial! : items[0]?.key)
  useLayoutEffect(() => {
    if (!param || initial) return
    const k = new URLSearchParams(window.location.search).get(param)
    if (k && items.some((t) => t.key === k)) setCur(k)
    // только при появлении: дальше вкладку выбирает человек
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const pick = (key: string) => {
    setCur(key)
    if (!param) return
    const url = new URL(window.location.href)
    if (key === items[0].key) url.searchParams.delete(param)
    else url.searchParams.set(param, key)
    window.history.replaceState(window.history.state, '', url)
  }
  if (items.length < 2) return <div className={className}>{items[0]?.content}</div>
  return (
    <div className={className}>
      <div
        role="tablist"
        className={`flex gap-1 rounded-full bg-white/[0.07] p-1 ${small ? 'max-w-sm' : ''} ${barClassName}`}
      >
        {items.map((t) => {
          const on = t.key === cur
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`${uid}-t-${t.key}`}
              aria-selected={on}
              aria-controls={`${uid}-p-${t.key}`}
              onClick={() => pick(t.key)}
              className={`min-w-0 flex-auto truncate rounded-full px-2.5 font-semibold transition-colors ${small ? 'h-8 text-[13px]' : 'h-9 text-[14px] max-[400px]:px-2 max-[400px]:text-[13px]'} ${
                on ? 'bg-fg text-ink' : 'text-dim hover:text-fg'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>
      {items.map((t) => (
        <div key={t.key} role="tabpanel" id={`${uid}-p-${t.key}`} aria-labelledby={`${uid}-t-${t.key}`} hidden={t.key !== cur} className={panelClassName}>
          {t.content}
        </div>
      ))}
    </div>
  )
}
