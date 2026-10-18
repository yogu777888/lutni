'use client'

import { useEffect, useRef, useState } from 'react'
import { BackButton, BackLabel } from './BackButton'
import type { Crumb } from './Breadcrumbs'

/**
 * Ряд «← Раздел» вложенной страницы на телефоне и планшете — как мини-табло в матче (владелец: «может в лигах кнопку
 * назад сделать как в матчах? и вообще на всех страницах по такому принципу» — «да»): второй ряд шапки во всю ширину,
 * липкий под ней, фон и уход вместе с шапкой — те же правила, что у `.match-top` (`.page-bar` в app/globals.css). Когда
 * крупный заголовок страницы (`[data-page-title]` в `PageHead`) наполовину ушёл под ряд, вместо подписи раздела по центру —
 * название страницы мелко, как на iPhone. От lg ряда нет — «←» в шапке страницы (`PageHead`).
 * Ставится первым на странице (прямо в `main`): иначе липкость кончается вместе с родительским блоком.
 */
export function PageBar({ crumbs, title }: { crumbs: Crumb[]; title: string }) {
  const parent = crumbs[crumbs.length - 2] ?? crumbs[0]
  const ref = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const head = document.querySelector('[data-page-title]')
    let raf = 0
    const check = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const box = ref.current?.getBoundingClientRect()
        const r = head?.getBoundingClientRect()
        setShow(r && box ? (r.top + r.bottom) / 2 < box.bottom : false)
      })
    }
    check()
    const on = setTimeout(() => setReady(true), 300)
    addEventListener('scroll', check, { passive: true })
    addEventListener('resize', check)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(on)
      removeEventListener('scroll', check)
      removeEventListener('resize', check)
    }
  }, [])
  const swap = ready ? 'transition-[opacity,transform] duration-200 ease-out' : ''
  return (
    <div ref={ref} className="page-bar sticky top-[65px] z-30 -mx-4 -mt-4 mb-3 sm:-mt-6 lg:hidden">
      <div className="flex min-h-12 items-center gap-3 px-4 py-1.5">
        <BackButton fallback={parent.href} />
        <div className="relative flex min-w-0 flex-1 items-center self-stretch">
          <div aria-hidden={show} inert={show} className={`min-w-0 flex-1 truncate text-[13px] text-dim ${swap} ${show ? 'pointer-events-none -translate-y-1 opacity-0' : ''}`}>
            <BackLabel fallback={parent} />
          </div>
          <div
            aria-hidden
            className={`absolute inset-0 flex items-center justify-center pr-11 ${swap} ${show ? '' : 'pointer-events-none translate-y-1 opacity-0'}`}
          >
            <span className="truncate text-[15px] font-semibold">{title}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
