'use client'

import { useEffect, useState } from 'react'
import { HeaderRow } from './HeaderRow'

/**
 * «Назад» и название вложенной страницы на телефоне и планшете — в самой шапке (`HeaderRow`): слева круглая «‹», по центру
 * название — только когда крупный заголовок (`[data-bar-title]` в `PageHead`) ушёл под шапку, как «большой заголовок» iOS.
 * Был второй ряд под шапкой «‹ Лиги» (владелец: «мне не нравится двухэтажный хедер на мобильных»). От lg — капсула «‹ ›».
 */
export function TopBar({ fallback, title }: { fallback: { href: string; label: string }; title: string }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    let raf = 0
    const check = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const h = document.querySelector('[data-bar-title]')?.getBoundingClientRect()
        // 52px — низ шапки на телефоне
        setShow(h ? (h.top + h.bottom) / 2 < 52 : false)
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
  return <HeaderRow fallback={fallback} show={show} center={<p className="truncate text-[16px] font-semibold">{title}</p>} />
}
