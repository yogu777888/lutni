'use client'

import { useEffect } from 'react'

/**
 * Градиент центральной панели каркаса берёт цвета содержимого, как у Spotify — цвет обложки альбома: на главной —
 * цвета клубов матча на экране «Главных матчей», на странице матча — его клубов. Нет цветов — лайм бренда
 * (значения по умолчанию в app/globals.css). Переход плавный: --tint-a/--tint-b зарегистрированы как цвета (@property).
 */
export function setShellTint(a?: string | null, b?: string | null) {
  const el = document.querySelector<HTMLElement>('.shell-center')
  if (!el) return
  const mix = (c: string) => `color-mix(in oklab, ${c} 42%, transparent)`
  if (a && b) {
    el.style.setProperty('--tint-a', mix(a))
    el.style.setProperty('--tint-b', mix(b))
  } else {
    el.style.removeProperty('--tint-a')
    el.style.removeProperty('--tint-b')
  }
}

/** Окрасить градиент панели цветами клубов, пока компонент на странице (страница матча). */
export function ShellTint({ home, away }: { home?: string | null; away?: string | null }) {
  useEffect(() => {
    setShellTint(home, away)
    return () => setShellTint(null, null)
  }, [home, away])
  return null
}
