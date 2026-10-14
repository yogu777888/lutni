'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

/** Были ли переходы внутри сайта без перезагрузки: document.referrer при переходах Next не меняется. В памяти вкладки —
 * после полной загрузки (пришли из Google) снова false. */
let moved = false

const key = () => `tb-scroll:${location.pathname}${location.search}`
let back = false

/**
 * Ставится один раз в каркасе (app/layout.tsx): отмечает переход между страницами сайта и возвращает прокрутку при
 * «назад» — страницы с данными приходят с сервера заново (force-dynamic), и браузер восстанавливал прокрутку раньше,
 * чем появлялся список: возвращались наверх. Позицию храним в sessionStorage по адресу, при «назад» докручиваем,
 * когда страница дорастёт до нужной высоты (до 2 с).
 */
export function NavWatch() {
  const path = usePathname()
  const first = useRef(path)
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
    if (path !== first.current) moved = true
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
 * сайта — как «назад» в браузере (список откроется на том же месте прокрутки); пришли из поиска или по ссылке извне —
 * в `fallback` (иначе «назад» увёл бы обратно в Google). Без JS — обычная ссылка на `fallback`.
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
        let ours = false
        try {
          ours = Boolean(document.referrer) && new URL(document.referrer).origin === location.origin
        } catch {}
        if ((moved || ours) && history.length > 1) router.back()
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
