'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useLayoutEffect, useState } from 'react'

const key = () => `tb-scroll:${location.pathname}${location.search}`
let back = false

/**
 * Где были до этой страницы — для подписи у «←» (владелец: «на кнопке назад в матчах написана лига а переходит на
 * главную» — «да»: подпись показывает, куда вернёт «←», как на iPhone). Стек страниц вкладки: переход вперёд — в
 * конец, «назад» — снимаем верх; в памяти, после полной загрузки пуст — тогда подпись и ссылка — раздел выше из крошек.
 */
type Page = { path: string; label: string }
const stack: Page[] = []

/** Подпись страницы для «← …»: разделы — словом меню, остальное — заголовком страницы (h1), длинное — «Назад». */
function pageLabel(path: string): string {
  if (path === '/' || path === '/matches' || /^\/matches\/[^/]+\/all$/.test(path)) return 'Матчи'
  const fixed: Record<string, string> = { '/leagues': 'Лиги', '/tags': 'Подборки', '/bookmakers': 'Букмекеры', '/tag/value': 'Выгодно' }
  if (fixed[path]) return fixed[path]
  const h1 = (document.querySelector('main h1, h1')?.textContent ?? '').trim()
  // у матча h1 — для поисковиков: «Прогноз на матч X — Y», «X — Y: результат матча» — оставляем пару
  const t = h1.replace(/^Прогноз на матч\s+/, '').replace(/:\s*(результат матча|матч онлайн)$/, '')
  return t && t.length <= 32 ? t : 'Назад'
}

/** Предыдущая страница для текущего адреса. Стек обновляет `NavWatch` после отрисовки, поэтому на новой странице его верх —
 * ещё та, откуда пришли; при «назад» верх — страница, с которой ушли, а нужная — на две ниже. */
function prevFor(path: string): Page | null {
  const n = stack.length
  if (!n) return null
  if (stack[n - 1].path === path) return stack[n - 2] ?? null
  if (stack[n - 2]?.path === path) return stack[n - 3] ?? null
  return stack[n - 1]
}

/**
 * Ставится один раз в каркасе (app/layout.tsx): отмечает переход между страницами сайта и возвращает прокрутку при
 * «назад» — страницы с данными приходят с сервера заново (force-dynamic), и браузер восстанавливал прокрутку раньше,
 * чем появлялся список: возвращались наверх. Позицию храним в sessionStorage по адресу, при «назад» докручиваем,
 * когда страница дорастёт до нужной высоты (до 2 с).
 */
export function NavWatch() {
  const path = usePathname()
  useEffect(() => {
    let t = 0
    // после клика (переход) секунду не пишем: Next прокручивает новую страницу наверх, пока адрес ещё старый, —
    // иначе позиция списка затёрлась бы нулём
    let lock = 0
    const put = (k: string, y: number) => {
      try {
        sessionStorage.setItem(k, String(Math.round(y)))
      } catch {}
    }
    const save = () => {
      if (Date.now() < lock) return
      const k = key()
      const y = scrollY
      clearTimeout(t)
      t = window.setTimeout(() => put(k, y), 120)
    }
    const click = () => {
      clearTimeout(t)
      put(key(), scrollY)
      lock = Date.now() + 1000
    }
    const pop = () => {
      back = true
      lock = Date.now() + 1000
    }
    addEventListener('scroll', save, { passive: true })
    addEventListener('click', click, true)
    addEventListener('popstate', pop)
    return () => {
      removeEventListener('scroll', save)
      removeEventListener('click', click, true)
      removeEventListener('popstate', pop)
    }
  }, [])
  useEffect(() => {
    const n = stack.length
    if (back && stack[n - 2]?.path === path) stack.pop()
    else if (stack[n - 1]?.path !== path) stack.push({ path, label: pageLabel(path) })
    if (!back) return
    back = false
    let y = 0
    try {
      y = Number(sessionStorage.getItem(key()) || 0)
    } catch {}
    if (!y) return
    const until = Date.now() + 2000
    const go = () => {
      if (document.documentElement.scrollHeight - innerHeight >= y - 2) scrollTo(0, y)
      else if (Date.now() < until) requestAnimationFrame(go)
      else scrollTo(0, y)
    }
    requestAnimationFrame(go)
  }, [path])
  return null
}

/**
 * «← Назад» на странице матча (владелец: «не надо ли на верхний блок сделать кнопку типа назад?»): пришли с нашего
 * сайта (есть страница в стеке) — как «назад» в браузере (список откроется на том же месте прокрутки); пришли из поиска
 * или по ссылке извне — в `fallback` (иначе «назад» увёл бы обратно в Google). Без JS — обычная ссылка на `fallback`.
 */
export function BackButton({ fallback, className = '' }: { fallback: string; className?: string }) {
  const router = useRouter()
  return (
    <a
      href={fallback}
      aria-label="Назад"
      title="Назад"
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        if (prevFor(location.pathname) && history.length > 1) router.back()
        else router.push(fallback)
      }}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.06] text-dim transition-colors hover:bg-white/[0.12] hover:text-fg ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M15 5l-7 7 7 7" />
      </svg>
    </a>
  )
}

/**
 * Подпись рядом с «←» — куда «←» вернёт: пришли с сайта — предыдущая страница («← Матчи», «← Ла Лига»), иначе — раздел
 * выше из крошек (`fallback`). Нажатие — то же, что «←». Для поисковиков в крошках — полная цепочка (BreadcrumbList).
 */
export function BackLabel({ fallback, className = '' }: { fallback: { href: string; label: string }; className?: string }) {
  const router = useRouter()
  const path = usePathname()
  const [prev, setPrev] = useState<Page | null>(null)
  // после гидратации: на сервере стека нет — сначала подпись из крошек, без расхождения разметки
  useLayoutEffect(() => setPrev(prevFor(path)), [path])
  return (
    <a
      href={prev?.path ?? fallback.href}
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        if (prev && history.length > 1) router.back()
        else router.push(fallback.href)
      }}
      className={`transition-colors hover:text-fg ${className}`}
    >
      {prev?.label ?? fallback.label}
    </a>
  )
}
