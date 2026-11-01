'use client'

import { useEffect, useState } from 'react'
import { Icon } from '@/components/Icon'
import { FILTER_EVENT, MORE_EVENT } from '@/components/MoreCountries'

const fold = (s: string) => s.toLowerCase().replace(/ё/g, 'е')
const norm = (s: string) => fold(s).trim()
/**
 * Что ищем у строки: только название (`[data-name]` — без подписи «15 турниров», «Испания · идут 3 матча»: «1» или «турнир»
 * находили все страны подряд) и `data-q` — оригинальное название, если оно другое.
 */
const hay = (el: Element | null) =>
  el ? norm(`${el.querySelector('[data-name]')?.textContent ?? ''} ${(el as HTMLElement).dataset.q ?? ''}`) : ''
const HL = 'league-q'
/**
 * Подсветка найденного в названиях — CSS Custom Highlight API (`::highlight(league-q)` в `app/globals.css`): разметку React
 * не трогаем, браузер без него просто не подсвечивает. `ё` → `е` и строчные длину строки не меняют — индексы совпадают.
 */
function paint(nodes: Iterable<HTMLElement>, n: string) {
  const reg = (globalThis.CSS as unknown as { highlights?: Map<string, unknown> } | undefined)?.highlights
  const H = (globalThis as unknown as { Highlight?: new (...r: Range[]) => unknown }).Highlight
  if (!reg || !H) return
  if (!n) return void reg.delete(HL)
  const ranges: Range[] = []
  for (const el of nodes) {
    if (el.closest('[hidden]')) continue
    const t = el.firstChild
    if (!t || t.nodeType !== Node.TEXT_NODE) continue
    const text = fold(t.textContent ?? '')
    for (let i = text.indexOf(n); i >= 0; i = text.indexOf(n, i + n.length)) {
      const r = new Range()
      r.setStart(t, i)
      r.setEnd(t, i + n.length)
      ranges.push(r)
    }
  }
  reg.set(HL, new H(...ranges))
}

/**
 * Фильтр каталога на странице «Лиги и турниры» — в шапке блока «Страны и турниры», с воронкой, а не лупой (владелец:
 * «на странице лиги дублируется поиск» — два одинаковых поля с лупой под шапкой сайта; поиск по сайту — в шапке,
 * здесь — сужение списка; топ-турниры не прячет, только подсвечивает). Значок — лупа, а не воронка (владелец: «поиск почемуто
 * с иконкой сортировки … не выделяет что находит»): воронка читалась сортировкой; найденное — подсвечено в названиях. Было: поиск (владелец: «а страница лиги где типа все лиги как?» — 170 стран раскрывашками,
 * на телефоне ~12 000px): фильтрует уже отрисованный список — строки с `data-q` (`data-item` — топ-турнир, `data-group` —
 * страна, `data-league` — турнир в стране), а не получает его заново: ссылки на все турниры остаются в коде страницы для
 * поисковиков, а данные для браузера не дублируются. Пока что-то введено — раскрыты найденные страны и «Ещё N стран».
 */
export function LeagueFilter({ target }: { target: string }) {
  const [q, setQ] = useState('')
  // догруженные страны (`MoreCountries`) — пройти список заново
  const [tick, setTick] = useState(0)
  // и по появлению строк в DOM: ответ серверного действия дорисовывается частями уже после события — догруженные страны
  // оставались неотфильтрованными (на «анг» видно 152 страны); свои правки — атрибуты, на них наблюдатель не срабатывает
  useEffect(() => {
    let raf = 0
    const on = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setTick((t) => t + 1))
    }
    window.addEventListener(MORE_EVENT, on)
    const root = document.getElementById(target)
    const mo = root ? new MutationObserver(on) : null
    if (root) mo?.observe(root, { childList: true, subtree: true })
    return () => {
      window.removeEventListener(MORE_EVENT, on)
      mo?.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [target])
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(FILTER_EVENT, { detail: q.trim() }))
  }, [q])
  useEffect(() => {
    const root = document.getElementById(target)
    if (!root) return
    const n = norm(q)
    let found = 0
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
    const empty = root.querySelector<HTMLElement>('[data-empty]')
    if (empty) {
      // пока остальные страны догружаются, «ничего не нашлось» не пишем — там пишет «Загружаем страны…»
      empty.hidden = !n || found > 0 || Boolean(root.querySelector('[data-pending]'))
      // топ-турниры — отдельным блоком выше, в странах их нет: «Premier League» без подсказки давал «ничего не нашлось»
      const tops = n ? [...document.querySelectorAll<HTMLElement>('[data-top]')].filter((el) => hay(el).includes(n)).map((el) => el.dataset.top) : []
      empty.textContent = tops.length
        ? `${[...new Set(tops)].join(', ')} — в топ-турнирах выше. Среди остальных стран и турниров ничего не нашлось.`
        : 'Ничего не нашлось. Попробуйте название страны или турнира по-английски — например, «Serie B».'
    }
    // подсвечиваем и в топ-турнирах выше: их фильтр не прячет (поле под ними — строки над полем прыгали бы)
    paint(document.querySelectorAll<HTMLElement>('[data-top] [data-name], #' + target + ' [data-name]'), n)
  }, [q, target, tick])
  // ушли со страницы — подсветку убрать (реестр общий на документ)
  useEffect(() => () => paint([], ''), [])
  return (
    <label className="relative block w-full sm:w-60">
      <span className="sr-only">Фильтр: страна или турнир</span>
      <Icon k="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Страна или турнир"
        className="h-9 w-full rounded-ctl bg-white/[0.06] pl-9 pr-3 text-[14px] text-fg outline-none transition-colors placeholder:text-mute focus:bg-white/[0.09] focus-visible:ring-2 focus-visible:ring-fg/40"
      />
    </label>
  )
}
