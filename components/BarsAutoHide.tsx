'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

/** Сколько пикселей прокрутки в одну сторону нужно, чтобы панели ушли или вернулись (случайные дёргания пальцем — не в счёт). */
const STEP = 10
/** У самого верха страницы панели видны всегда. */
const TOP = 80

/**
 * Ниже lg шапка и нижнее меню (`TabBar`) уходят при прокрутке вниз и возвращаются при прокрутке вверх — вместе и по одному
 * правилу (владелец: «сделай чтоб просто и хедер и нижнее меню сворачивались при прокрутке вниз одинаково»). Состояние —
 * `html[data-bars-hidden]`, само движение — CSS в конце app/globals.css (шапка, ряд дней, мини-табло матча, меню, плашка
 * ставки). У верха и в самом конце страницы панели видны; при смене страницы — снова видны.
 */
export function BarsAutoHide() {
  const path = usePathname()
  useEffect(() => {
    const root = document.documentElement
    const mq = window.matchMedia('(max-width: 1023.98px)')
    let last = window.scrollY
    let run = 0
    let hidden = false
    const set = (h: boolean) => {
      if (h === hidden) return
      hidden = h
      if (h) root.setAttribute('data-bars-hidden', '')
      else root.removeAttribute('data-bars-hidden')
    }
    set(false)
    const onScroll = () => {
      const y = window.scrollY
      const d = y - last
      last = y
      if (!mq.matches || y < TOP || y + window.innerHeight >= document.documentElement.scrollHeight - 4) {
        run = 0
        set(false)
        return
      }
      // копим путь в одну сторону; сменили направление — считаем заново
      run = Math.sign(d) === Math.sign(run) ? run + d : d
      if (run > STEP) set(true)
      else if (run < -STEP) set(false)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    mq.addEventListener('change', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      mq.removeEventListener('change', onScroll)
      root.removeAttribute('data-bars-hidden')
    }
  }, [path])
  return null
}
