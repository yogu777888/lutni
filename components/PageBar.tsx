'use client'

import { useEffect, useRef, useState } from 'react'
import { BackButton } from './BackButton'

/**
 * Верхняя панель вложенной страницы — та же, что у матча (`MatchBar`), на всех ширинах (владелец: «на компе блок где назад
 * отдельно от страницы в матче а на странице лиги он в блоке?», «как то странно что по разному сделано мозг напрягается»
 * — «да»): закреплена под шапкой, «←» и подпись, куда вернёт (`children` — `Breadcrumbs parentOnly`); когда крупный
 * заголовок страницы (`[data-page-title]` в `PageHead`) наполовину ушёл под панель — на том же месте название страницы,
 * как в матче — счёт. Классы и правила — те же `.match-top` / `.match-top-in` (фон, уход вместе с шапкой на телефоне,
 * плашка от xl). Ставится первой на странице (прямо в `main`): иначе липкость кончается вместе с родительским блоком.
 */
export function PageBar({ back, title, children }: { back: string; title: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  const [stuck, setStuck] = useState(false)
  const [ready, setReady] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const head = document.querySelector('[data-page-title]')
    let raf = 0
    const check = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const el = ref.current
        const box = el?.getBoundingClientRect()
        const r = head?.getBoundingClientRect()
        setShow(r && box ? (r.top + r.bottom) / 2 < box.bottom : false)
        setStuck(el && box ? Math.abs(box.top - parseFloat(getComputedStyle(el).top)) < 1 : false)
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
    <div
      ref={ref}
      className={`match-top page-enter sticky top-[65px] z-30 mb-3 max-lg:-mx-4 max-lg:-mt-4 sm:max-lg:-mt-6 lg:mb-4 lg:-mt-1.5 lg:pt-1.5 xl:top-[72px] xl:mb-2 xl:mt-0 xl:pt-0 ${
        stuck ? 'lg:bg-[#090c10]' : ''
      }`}
    >
      <div className="match-top-in flex min-h-12 items-center gap-3 px-4 py-1.5 lg:min-h-[57.5px] lg:rounded-card lg:py-2 lg:bg-panel-3 lg:shadow-[0_10px_30px_rgb(0_0_0/0.45)]">
        <BackButton fallback={back} />
        <div className="relative flex min-w-0 flex-1 items-center self-stretch">
          <div aria-hidden={show} inert={show} className={`min-w-0 flex-1 ${swap} ${show ? 'pointer-events-none -translate-y-1 opacity-0' : 'opacity-100'}`}>
            {children}
          </div>
          {/* название страницы — на месте подписи; на телефоне по центру экрана (отступ справа шириной «←»), как счёт в матче */}
          <div
            aria-hidden
            className={`absolute inset-0 flex items-center justify-center max-md:pr-11 md:justify-start ${swap} ${show ? 'opacity-100' : 'pointer-events-none translate-y-1 opacity-0'}`}
          >
            <span className="truncate text-[15px] font-semibold">{title}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
