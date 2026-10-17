'use client'

import { useEffect, useState } from 'react'

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').trim()
/** Что ищем у строки: видимый текст (по-русски) и `data-q` — оригинальное название, если оно другое. */
const hay = (el: Element | null) => (el ? norm(`${el.textContent ?? ''} ${(el as HTMLElement).dataset.q ?? ''}`) : '')

/**
 * Поиск на странице «Лиги и турниры» (владелец: «а страница лиги где типа все лиги как?» — 170 стран раскрывашками,
 * на телефоне ~12 000px): фильтрует уже отрисованный список — строки с `data-q` (`data-item` — топ-турнир, `data-group` —
 * страна, `data-league` — турнир в стране), а не получает его заново: ссылки на все турниры остаются в коде страницы для
 * поисковиков, а данные для браузера не дублируются. Пока что-то введено — раскрыты найденные страны и «Ещё N стран».
 */
export function LeagueFilter({ target }: { target: string }) {
  const [q, setQ] = useState('')
  useEffect(() => {
    const root = document.getElementById(target)
    if (!root) return
    const n = norm(q)
    let found = 0
    for (const el of root.querySelectorAll<HTMLElement>('[data-item]')) {
      el.hidden = Boolean(n) && !hay(el).includes(n)
      if (!el.hidden) found++
    }
    for (const g of root.querySelectorAll<HTMLElement>('[data-group]')) {
      // совпала страна — показываем все её турниры, иначе — только совпавшие
      const summary = g.querySelector('summary')
      const country = Boolean(n) && `${hay(summary)} ${g.dataset.q ?? ''}`.includes(n)
      let any = false
      for (const li of g.querySelectorAll<HTMLElement>('[data-league]')) {
        li.hidden = Boolean(n) && !country && !hay(li).includes(n)
        any ||= !li.hidden
      }
      g.hidden = Boolean(n) && !country && !any
      if (!g.hidden) found++
      const d = g.querySelector('details')
      if (d) d.open = Boolean(n) && !g.hidden
    }
    for (const d of root.querySelectorAll<HTMLDetailsElement>('details[data-more]')) {
      d.open = Boolean(n)
      const s = d.querySelector('summary')
      if (s) s.hidden = Boolean(n)
    }
    for (const s of root.querySelectorAll<HTMLElement>('[data-section]')) {
      s.hidden = Boolean(n) && !s.querySelector('[data-item]:not([hidden]), [data-group]:not([hidden])')
    }
    const empty = root.querySelector<HTMLElement>('[data-empty]')
    if (empty) empty.hidden = !n || found > 0
  }, [q, target])
  return (
    <label className="relative mt-1 block max-w-md">
      <span className="sr-only">Найти страну или турнир</span>
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Найти страну или турнир"
        className="h-10 w-full rounded-ctl bg-white/[0.06] pl-9 pr-3 text-[14px] text-fg outline-none transition-colors placeholder:text-mute focus:bg-white/[0.09] focus-visible:ring-2 focus-visible:ring-fg/40"
      />
    </label>
  )
}
