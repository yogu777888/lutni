'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useLayoutEffect, useState } from 'react'

const key = () => `tb-scroll:${location.pathname}${location.search}`
let back = false
// «←» без истории ведёт на шаг выше (в раздел): это не переход вперёд, а подъём — новая страница заменяет верх стека.
// Иначе после «матч → ← Ла Лига» у лиги стояло «← Барселона — Леванте» (владелец: «из матча назад жму и он показывает
// назад на матч а не на лиги»)
let up = false
const goUp = (router: ReturnType<typeof useRouter>, href: string) => {
  up = true
  router.push(href)
}

/**
 * Где были до этой страницы — для подписи у «←» (владелец: «на кнопке назад в матчах написана лига а переходит на
 * главную» — «да»: подпись показывает, куда вернёт «←», как на iPhone). Стек страниц вкладки: переход вперёд — в
 * конец, «назад» — снимаем верх; в памяти, после полной загрузки пуст — тогда подпись и ссылка — раздел выше из крошек.
 */
type Page = { path: string; label: string }
const stack: Page[] = []
/** Куда ведёт «вперёд»: страницы, с которых ушли «назад» (верх — ближайшая); новый переход вперёд по ссылке их сбрасывает. */
const fwd: Page[] = []

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
  // поднялись на шаг выше, а стек ещё не обновлён (эффект `NavWatch` идёт после подписи) — истории нет
  if (!n || up) return null
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
    // вернулись на страницу под верхней — «назад» (кнопкой или ссылкой в тексте): снимаем верх, а не кладём её второй раз
    if (stack[n - 2]?.path === path) fwd.push(stack.pop()!)
    else if (up && n) {
      stack[n - 1] = { path, label: pageLabel(path) }
      fwd.length = 0
    } else if (stack[n - 1]?.path !== path) {
      // «вперёд» (нашей кнопкой или браузерной) — снимаем её из `fwd`, переход по ссылке — история вперёд кончилась
      if (fwd[fwd.length - 1]?.path === path) fwd.pop()
      else fwd.length = 0
      stack.push({ path, label: pageLabel(path) })
    }
    up = false
    dispatchEvent(new Event('tb-stack'))
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
        else goUp(router, fallback)
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
/** Предыдущая страница с подпиской на обновление стека: на сервере и при гидратации — null (подпись из крошек). */
function usePrev() {
  const path = usePathname()
  const [prev, setPrev] = useState<Page | null>(null)
  const [next, setNext] = useState<Page | null>(null)
  useLayoutEffect(() => {
    setPrev(prevFor(path))
    setNext(nextFor(path))
  }, [path])
  useEffect(() => {
    const on = () => {
      setPrev(prevFor(location.pathname))
      setNext(nextFor(location.pathname))
    }
    addEventListener('tb-stack', on)
    return () => removeEventListener('tb-stack', on)
  }, [])
  return { prev, next }
}

/** Куда ведёт «вперёд». Как и `prevFor`, стек может быть ещё не обновлён (`NavWatch` — после отрисовки): вернулись
 * «назад» — верх стека и есть «вперёд»; пришли «вперёд» — следующая под верхом `fwd`. */
function nextFor(path: string): Page | null {
  const n = stack.length
  const f = fwd.length
  if (up || !n) return null
  if (stack[n - 1].path === path) return fwd[f - 1] ?? null
  if (stack[n - 2]?.path === path) return stack[n - 1]
  if (fwd[f - 1]?.path === path) return fwd[f - 2] ?? null
  return null
}

const SVG = 'h-[18px] w-[18px]'

/**
 * «‹ ›» капсулой слева от заголовка, как в Finder (владелец прислал скриншот Finder: «а может сделать как в эпл такие
 * иконки назад вперед слева от заголовков?» — «давай»): только на компьютере (на телефоне — чип «‹ Лиги»). «‹» — то же,
 * что `BackLabel`; «›» — `history.forward()`, когда до этого вернулись «назад», иначе приглушена. Куда ведут — в подсказке.
 */
export function NavPair({ fallback, className = '' }: { fallback: { href: string; label: string }; className?: string }) {
  const router = useRouter()
  const { prev, next } = usePrev()
  const btn = 'grid h-8 w-9 place-items-center transition-colors'
  const backTip = `Назад: ${prev?.label ?? fallback.label}`
  return (
    <nav aria-label="Навигация" className={`inline-flex h-8 shrink-0 items-center rounded-full bg-white/[0.07] text-dim ${className}`}>
      <a
        href={prev?.path ?? fallback.href}
        title={backTip}
        aria-label={backTip}
        onClick={(e) => {
          if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
          e.preventDefault()
          if (prev && history.length > 1) router.back()
          else goUp(router, fallback.href)
        }}
        className={`${btn} rounded-l-full pl-0.5 hover:bg-white/[0.08] hover:text-fg`}
      >
        <svg viewBox="0 0 24 24" className={SVG} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M14.5 6l-6 6 6 6" />
        </svg>
      </a>
      <span aria-hidden className="h-4 w-px bg-white/10" />
      <button
        type="button"
        disabled={!next}
        title={next ? `Вперёд: ${next.label}` : 'Вперёд'}
        aria-label={next ? `Вперёд: ${next.label}` : 'Вперёд'}
        onClick={() => history.forward()}
        className={`${btn} rounded-r-full pr-0.5 enabled:hover:bg-white/[0.08] enabled:hover:text-fg disabled:text-white/20`}
      >
        <svg viewBox="0 0 24 24" className={SVG} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9.5 6l6 6-6 6" />
        </svg>
      </button>
    </nav>
  )
}

export function BackLabel({
  fallback,
  className = '',
  chip = false,
}: {
  fallback: { href: string; label: string }
  className?: string
  /** «‹ Лиги» чипом — кнопка «назад» в углу первого блока страницы, как в приложениях Apple */
  chip?: boolean
}) {
  const router = useRouter()
  // после гидратации: на сервере стека нет — сначала подпись из крошек; стек обновился (назад, подъём) — пересчитываем
  const { prev } = usePrev()
  return (
    <a
      href={prev?.path ?? fallback.href}
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        if (prev && history.length > 1) router.back()
        else goUp(router, fallback.href)
      }}
      title={chip ? `Назад: ${prev?.label ?? fallback.label}` : undefined}
      className={
        chip
          ? `inline-flex h-8 max-w-full items-center gap-0.5 rounded-full bg-white/[0.07] pl-1.5 pr-3 text-[13px] font-medium text-dim transition-colors hover:bg-white/[0.13] hover:text-fg ${className}`
          : `transition-colors hover:text-fg ${className}`
      }
    >
      {chip ? (
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M14.5 6l-6 6 6 6" />
        </svg>
      ) : null}
      <span className={chip ? 'truncate' : undefined}>{prev?.label ?? fallback.label}</span>
    </a>
  )
}
