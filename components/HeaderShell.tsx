'use client'

import { useEffect, useState } from 'react'

/**
 * Шапка без полосы: наверху страницы логотип и капсулы стоят прямо на фоне,
 * а как только страницу прокрутили — появляется стекло с линией снизу,
 * чтобы текст не ехал под меню. От xl (каркас с панелями) шапка сплошная всегда и без перехода: фон появлялся только
 * после того, как скрипт замечал прокрутку, да ещё за 0,3 с — первые мгновения центр проезжал под прозрачной шапкой
 * (владелец: «при прокрутке центр на секунду заходит на хедер»).
 */
export function HeaderShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    let raf = 0
    const update = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setScrolled(window.scrollY > 6))
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => {
      window.removeEventListener('scroll', update)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <header
      data-scrolled={scrolled ? '' : undefined}
      className="site-header sticky top-0 z-40 border-b border-transparent transition-[background-color,border-color] duration-300 data-[scrolled]:border-edge data-[scrolled]:bg-ink/75 data-[scrolled]:backdrop-blur-[14px] xl:bg-[#090c10] xl:transition-none xl:data-[scrolled]:border-transparent xl:data-[scrolled]:bg-[#090c10] xl:data-[scrolled]:backdrop-blur-none"
    >
      {children}
    </header>
  )
}
