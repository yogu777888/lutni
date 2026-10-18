'use client'

import { useEffect, useRef, useState } from 'react'

const KEY = 'tb-cta-closed'

/**
 * Обёртка нижней плашки: пока кнопка в `target` (кнопка ставки в первом блоке) видна целиком, плашка уезжает вниз.
 * Целиком, а не «хоть краем»: у «Лидса» на 390×844 кнопка начиналась на 828px — плашка пряталась, а от кнопки было видно
 * 16px, и на первом экране кнопки не оставалось вовсе. Отдельно от `StickyCta`: та — серверная и получает партнёра
 * целиком (в нём RegExp — в клиентский компонент его не передать).
 *
 * Крестик слева внутри плашки и свайп вниз закрывают плашку до конца сессии — на всех матчах (владелец: «над попапом
 * снизу … сверху справа надо крестик сделать?» — «да»; закрытие на одном матче раздражало бы на следующем); после
 * перезапуска браузера плашка возвращается (sessionStorage).
 */
export function StickyHide({ target, className, children }: { target: string; className: string; children: React.ReactNode }) {
  const [hide, setHide] = useState(false)
  const [closed, setClosed] = useState(false)
  const y0 = useRef<number | null>(null)
  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY)) setClosed(true)
    } catch {}
    const box = document.getElementById(target)
    const el = box?.querySelector('a') ?? box
    if (!el) return
    const io = new IntersectionObserver(([e]) => setHide(e.intersectionRatio > 0.98), { threshold: [0, 1] })
    io.observe(el)
    return () => io.disconnect()
  }, [target])
  const close = () => {
    setClosed(true)
    try {
      sessionStorage.setItem(KEY, '1')
    } catch {}
  }
  const off = hide || closed
  return (
    <div
      aria-hidden={off}
      inert={off}
      // закрыта крестиком — место под неё в конце подвала больше не держим (app/globals.css)
      data-closed={closed || undefined}
      onTouchStart={(e) => (y0.current = e.touches[0].clientY)}
      onTouchEnd={(e) => {
        if (y0.current != null && e.changedTouches[0].clientY - y0.current > 40) close()
        y0.current = null
      }}
      className={`${className} transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none ${off ? 'pointer-events-none translate-y-4 opacity-0' : ''}`}
    >
      {/* крестик — внутри плашки слева, тонкий, без кружка (владелец: «как то она не очень выглядит» — кружок с тенью
          торчал над стеклом отдельной деталью); от «Ставки» справа — далеко, случайно не нажать */}
      <div className="flex items-center gap-1">
        <button type="button" aria-label="Скрыть" title="Скрыть" onClick={close} className="-my-1 -ml-1.5 grid h-9 w-7 shrink-0 place-items-center text-mute transition-colors hover:text-fg">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
