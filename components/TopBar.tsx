'use client'

import { useEffect, useRef, useState } from 'react'
import { BackLabel } from './BackButton'

/**
 * Полоса под шапкой на телефоне и планшете, как навигация в iOS (владелец прислал «Оформление» в Настройках iPhone: «а
 * как тебе идея под хедером сделать как на айфоне кнопку назад и по центру надпись?» — «давай»): слева «‹ Лиги», по
 * центру — название страницы, но только когда крупный заголовок (`[data-bar-title]` в `PageHead`) ушёл под полосу, —
 * как «большой заголовок» iOS: наверху он в блоке, и дважды на одном экране не стоит. Второй ряд шапки (`.hdr-sub`, как
 * дни на главной): наверху на фоне, при прокрутке — сплошной фон и черта, уходит вместе с шапкой. От lg — капсула «‹ ›».
 */
export function TopBar({ fallback, title }: { fallback: { href: string; label: string }; title: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)
  useEffect(() => {
    let raf = 0
    const check = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const h = document.querySelector('[data-bar-title]')?.getBoundingClientRect()
        const box = ref.current?.getBoundingClientRect()
        setShow(h && box ? (h.top + h.bottom) / 2 < box.bottom : false)
      })
    }
    check()
    addEventListener('scroll', check, { passive: true })
    addEventListener('resize', check)
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('scroll', check)
      removeEventListener('resize', check)
    }
  }, [])
  return (
    <div ref={ref} className="hdr-sub sticky top-[65px] z-30 -mx-4 -mt-4 mb-2 sm:-mt-6 lg:hidden">
      <div className="grid h-12 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-4">
        <div className="min-w-0">
          <BackLabel fallback={fallback} bar />
        </div>
        <p
          aria-hidden={!show}
          className={`max-w-[56vw] truncate text-center text-[16px] font-semibold transition-[opacity,transform] duration-200 ${show ? '' : 'translate-y-1 opacity-0'}`}
        >
          {title}
        </p>
        <span />
      </div>
    </div>
  )
}
