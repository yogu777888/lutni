'use client'

import { useEffect, useState } from 'react'

/**
 * Градиент центральной панели каркаса берёт цвета содержимого, как у Spotify — цвет обложки альбома: на главной —
 * цвета клубов матча на экране «Главных матчей», на странице матча — его клубов. Нет цветов — лайм бренда
 * (значения по умолчанию в app/globals.css). Переход плавный: --tint-a/--tint-b зарегистрированы как цвета (@property).
 */
export function setShellTint(a?: string | null, b?: string | null) {
  const el = document.querySelector<HTMLElement>('.shell-center')
  if (!el) return
  const mix = (c: string) => `color-mix(in oklab, ${c} 30%, transparent)`
  if (a && b) {
    el.style.setProperty('--tint-a', mix(a))
    el.style.setProperty('--tint-b', mix(b))
  } else {
    el.style.removeProperty('--tint-a')
    el.style.removeProperty('--tint-b')
  }
}

type Tint = { home: string; away: string }
const loaded = new Map<number, Tint | null>()

/**
 * Цвета клубов матча: с сервера (`initial`), а если страница их не дождалась (эмблемы с чужого сервера) —
 * догружаем из /api/tint и запоминаем на время сессии.
 */
export function useMatchTint(id: number | undefined, ymd: string | undefined, initial?: Tint | null): Tint | null {
  const [late, setLate] = useState<Tint | null>(() => (id ? loaded.get(id) ?? null : null))
  useEffect(() => {
    if (!id || !ymd || initial) return
    setLate(loaded.get(id) ?? null)
    if (loaded.has(id)) return
    let stop = false
    // сервер ещё считает цвета эмблем — спросим ещё раз чуть позже
    const ask = (left: number) =>
      fetch(`/api/tint?id=${id}&d=${ymd}`)
        .then((r) => r.json())
        .then((d: { tint: Tint | null }) => {
          if (stop) return
          if (d.tint) {
            loaded.set(id, d.tint)
            setLate(d.tint)
          } else if (left > 0) setTimeout(() => !stop && ask(left - 1), 2500)
        })
        .catch(() => {})
    ask(2)
    return () => {
      stop = true
    }
  }, [id, ymd, initial])
  return initial ?? late
}

/** Окрасить градиент панели цветами клубов, пока компонент на странице (страница матча). */
export function ShellTint({ id, ymd, home, away }: { id?: number; ymd?: string; home?: string | null; away?: string | null }) {
  const t = useMatchTint(id, ymd, home && away ? { home, away } : null)
  useEffect(() => {
    setShellTint(t?.home, t?.away)
  }, [t?.home, t?.away])
  useEffect(() => () => setShellTint(null, null), [])
  return null
}

