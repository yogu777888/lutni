'use client'

import { useEffect, useState } from 'react'

/**
 * Обёртка нижней плашки: пока кнопка в `target` (кнопка ставки в первом блоке) видна целиком, плашка уезжает вниз.
 * Целиком, а не «хоть краем»: у «Лидса» на 390×844 кнопка начиналась на 828px — плашка пряталась, а от кнопки было видно
 * 16px, и на первом экране кнопки не оставалось вовсе. Отдельно от `StickyCta`: та — серверная и получает партнёра
 * целиком (в нём RegExp — в клиентский компонент его не передать).
 */
export function StickyHide({ target, className, children }: { target: string; className: string; children: React.ReactNode }) {
  const [hide, setHide] = useState(false)
  useEffect(() => {
    const box = document.getElementById(target)
    const el = box?.querySelector('a') ?? box
    if (!el) return
    const io = new IntersectionObserver(([e]) => setHide(e.intersectionRatio > 0.98), { threshold: [0, 1] })
    io.observe(el)
    return () => io.disconnect()
  }, [target])
  return (
    <div aria-hidden={hide} inert={hide} className={`${className} transition-transform duration-200 ease-out motion-reduce:transition-none ${hide ? 'translate-y-full' : ''}`}>
      {children}
    </div>
  )
}
