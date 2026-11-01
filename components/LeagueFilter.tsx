'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/Icon'
import { FILTER_EVENT, MORE_EVENT } from '@/components/MoreCountries'

const fold = (s: string) => s.toLowerCase().replace(/ё/g, 'е')
const norm = (s: string) => fold(s).trim().replace(/\s+/g, ' ')
const WORD = /[\p{L}\p{N}]/u

/**
 * Где запрос совпал с началом слова (владелец: «если я набираю букву о то он показывает россия и выделяет вторую букву о, а
 * поидее он должен искать у кого первая буква такая?») — как поиск по сайту (`lib/search.ts`); −1 — не совпал.
 */
function wordStart(text: string, n: string) {
  const t = fold(text)
  for (let i = t.indexOf(n); i >= 0; i = t.indexOf(n, i + 1)) if (i === 0 || !WORD.test(t[i - 1])) return i
  return -1
}
/** Строка подходит: название (`[data-name]`, без подписей «15 турниров») или `data-q` — оригинал, если он другой. */
const hit = (el: Element | null, n: string) => {
  if (!el) return false
  const name = el.querySelector('[data-name]')?.textContent ?? ''
  return wordStart(name, n) >= 0 || wordStart((el as HTMLElement).dataset.q ?? '', n) >= 0
}

const HL = 'league-q'
/** Сколько турниров показываем в найденном — дальше просим уточнить (на «лига» их сотни). */
const LIMIT = 40

/**
 * Подсветка найденного — CSS Custom Highlight API (`::highlight(league-q)` в `app/globals.css`): разметку React не трогаем,
 * браузер без него просто не подсвечивает. Только начало слова и только первое совпадение в названии.
 */
function paint(nodes: Iterable<HTMLElement>, n: string) {
  const reg = (globalThis.CSS as unknown as { highlights?: Map<string, unknown> } | undefined)?.highlights
  const H = (globalThis as unknown as { Highlight?: new (...r: Range[]) => unknown }).Highlight
  if (!reg || !H) return
  if (!n) return void reg.delete(HL)
  const ranges: Range[] = []
  for (const el of nodes) {
    const t = el.firstChild
    if (!t || t.nodeType !== Node.TEXT_NODE) continue
    const i = wordStart(t.textContent ?? '', n)
    if (i < 0) continue
    const r = new Range()
    r.setStart(t, i)
    r.setEnd(t, i + n.length)
    ranges.push(r)
  }
  reg.set(HL, new H(...ranges))
}

/**
 * Фильтр каталога на «Лигах и турнирах» — в шапке блока «Страны и турниры». Пока что-то введено, список стран прячется, а
 * на его месте — найденное плоским списком (владелец: «если например россия нашлась то не раскрывалась а если лига нашлась
 * то она отдельно была бы а не вместе с карточкой страны и другими лигами? а то результат поиска длинный»): сначала страны —
 * свёрнутыми строками (раскрыть можно), потом турниры — отдельными строками с подписью страны, до `LIMIT`. Строки — копии
 * уже отрисованных (`data-group`, `data-league`): ссылки на все турниры остаются в коде страницы для поисковиков, данные не
 * дублируются; список найденного — свой узел вне React (`data-results`). Ищем с начала слова. Топ-турниры выше не прячем —
 * в них только подсвечиваем.
 */
export function LeagueFilter({ target, rows }: { target: string; rows: string }) {
  const [q, setQ] = useState('')
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  // догруженные страны (`MoreCountries`) — пройти список заново; и по появлению строк в DOM: ответ серверного действия
  // дорисовывается частями уже после события; наши правки — атрибуты и свой узел вне списка, на них наблюдатель не смотрит
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let raf = 0
    const on = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setTick((t) => t + 1))
    }
    window.addEventListener(MORE_EVENT, on)
    const card = document.getElementById(target)?.querySelector('.card')
    const mo = new MutationObserver(on)
    for (const el of card?.querySelectorAll('[data-list], details[data-more]') ?? []) mo.observe(el, { childList: true, subtree: true })
    return () => {
      window.removeEventListener(MORE_EVENT, on)
      mo.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [target])
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(FILTER_EVENT, { detail: q.trim() }))
  }, [q])

  // свой узел для найденного — вне React; ссылки в нём — переходом внутри сайта, а не перезагрузкой
  const box = useRef<HTMLUListElement | null>(null)
  useEffect(() => {
    const card = document.getElementById(target)?.querySelector('.card')
    if (!card) return
    const ul = document.createElement('ul')
    ul.dataset.results = ''
    ul.hidden = true
    ul.className = `${rows} [&>li:first-child]:border-t-0`
    card.prepend(ul)
    box.current = ul
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element).closest('a')
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
      e.preventDefault()
      router.push(a.getAttribute('href') ?? '/')
    }
    ul.addEventListener('click', onClick)
    return () => {
      ul.removeEventListener('click', onClick)
      ul.remove()
      box.current = null
    }
  }, [target, rows, router])

  useEffect(() => {
    const root = document.getElementById(target)
    const ul = box.current
    if (!root || !ul) return
    const n = norm(q)
    const list = root.querySelector<HTMLElement>('[data-list]')
    const more = root.querySelector<HTMLElement>('details[data-more]')
    if (list) list.hidden = Boolean(n)
    if (more) more.hidden = Boolean(n)
    ul.hidden = !n
    ul.replaceChildren()
    let found = 0
    if (n) {
      const groups = [...root.querySelectorAll<HTMLElement>('[data-list] [data-group], details[data-more] [data-group]')]
      // страны — свёрнутыми строками, как в списке
      for (const g of groups) {
        if (!hit(g.querySelector('summary'), n) && wordStart(g.dataset.q ?? '', n) < 0) continue
        const c = g.cloneNode(true) as HTMLElement
        c.querySelector('details')?.removeAttribute('open')
        ul.append(c)
        found++
      }
      // турниры — отдельно от страны, с её названием подписью
      let leagues = 0
      let over = 0
      for (const g of groups)
        for (const li of g.querySelectorAll<HTMLElement>('[data-league]')) {
          if (!hit(li, n)) continue
          if (leagues >= LIMIT) {
            over++
            continue
          }
          const c = li.cloneNode(true) as HTMLElement
          c.classList.add('border-t', 'border-edge')
          c.querySelector('[data-sub]')?.removeAttribute('hidden')
          ul.append(c)
          leagues++
          found++
        }
      if (over) {
        const li = document.createElement('li')
        li.className = 'border-t border-edge px-4 py-3.5 text-[14px] text-dim sm:px-5'
        li.textContent = `И ещё ${over} — уточните запрос.`
        ul.append(li)
      }
    }
    const empty = root.querySelector<HTMLElement>('[data-empty]')
    if (empty) {
      // пока остальные страны догружаются, «ничего не нашлось» не пишем — там пишет «Загружаем страны…»
      const pending = Boolean(root.querySelector('[data-pending]'))
      empty.hidden = !n || found > 0
      // топ-турниры — отдельным блоком выше, в странах их нет: «Premier League» без подсказки давал «ничего не нашлось»
      const tops = n ? [...document.querySelectorAll<HTMLElement>('[data-top]')].filter((el) => hit(el, n)).map((el) => el.dataset.top) : []
      empty.textContent = pending
        ? 'Загружаем остальные страны…'
        : tops.length
          ? `${[...new Set(tops)].join(', ')} — в топ-турнирах выше. Среди остальных стран и турниров ничего не нашлось.`
          : 'Ничего не нашлось. Попробуйте название страны или турнира по-английски — например, «Serie B».'
    }
    paint([...document.querySelectorAll<HTMLElement>('[data-top] [data-name]'), ...ul.querySelectorAll<HTMLElement>('[data-name]')], n)
  }, [q, target, tick])
  // ушли со страницы — подсветку убрать (реестр общий на документ)
  useEffect(() => () => paint([], ''), [])

  // на телефоне — во всю ширину, 44px и 16px (мельче — Safari на iPhone увеличивает страницу при вводе), с крестиком
  return (
    <label className="relative block w-full sm:w-60">
      <span className="sr-only">Найти страну или турнир</span>
      <Icon k="search" className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-mute sm:h-4 sm:w-4" />
      <input
        ref={input}
        type="text"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && setQ('')}
        placeholder="Страна или турнир"
        className="h-11 w-full rounded-ctl bg-white/[0.08] pl-10 pr-10 text-[16px] text-fg outline-none transition-colors placeholder:text-mute focus:bg-white/[0.11] focus-visible:ring-2 focus-visible:ring-fg/40 sm:h-9 sm:pl-9 sm:pr-8 sm:text-[14px]"
      />
      {q ? (
        <button
          type="button"
          aria-label="Очистить"
          onClick={() => {
            setQ('')
            input.current?.focus()
          }}
          className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center text-mute transition-colors hover:text-fg sm:h-8 sm:w-8"
        >
          <Icon k="close" className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
        </button>
      ) : null}
    </label>
  )
}
