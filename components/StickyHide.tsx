'use client'

import { useEffect, useRef, useState } from 'react'

const KEY = 'tb-cta-closed'

/**
 * Обёртка нижней плашки: пока кнопка в `target` (кнопка ставки в первом блоке) видна целиком, плашка уезжает вниз.
 * Целиком, а не «хоть краем»: у «Лидса» на 390×844 кнопка начиналась на 828px — плашка пряталась, а от кнопки было видно
 * 16px, и на первом экране кнопки не оставалось вовсе. Отдельно от `StickyCta`: та — серверная и получает партнёра
 * целиком (в нём RegExp — в клиентский компонент его не передать).
 *
 * Крестик в правом верхнем углу и свайп вниз закрывают плашку до конца сессии — на всех матчах (владелец: «над попапом
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
      onTouchStart={(e) => (y0.current = e.touches[0].clientY)}
      onTouchEnd={(e) => {
        if (y0.current != null && e.changedTouches[0].clientY - y0.current > 40) close()
        y0.current = null
      }}
      className={`${className} transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none ${off ? 'pointer-events-none translate-y-4 opacity-0' : ''}`}
    >
      {children}
      {/* кружок 24px наполовину над краем плашки; нажимается 36px вокруг — до кнопки «Ставка» не достаёт */}
      <button
        type="button"
        aria-label="Скрыть"
        title="Скрыть"
        onClick={close}
        className="absolute -right-2 -top-[18px] grid h-9 w-9 place-items-center"
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-[#2a333d] text-dim shadow-[0_2px_8px_rgb(0_0_0/0.4),inset_0_0_0_1px_rgb(255_255_255/0.1)]">
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </span>
      </button>
    </div>
  )
}
