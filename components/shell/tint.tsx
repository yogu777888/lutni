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
  const mix = (c: string) => `color-mix(in oklab, ${c} 42%, transparent)`
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

/**
 * Цвета для карточек на полках: если страница их не дождалась, карточки без цвета собираются в одну очередь
 * (50 мс) и спрашивают /api/tint?ids=… одним запросом на день.
 */
const queue = new Map<string, { ids: Set<number>; waiters: ((t: Record<number, Tint>) => void)[] }>()
function askBatch(ymd: string, id: number): Promise<Record<number, Tint>> {
  let q = queue.get(ymd)
  if (!q) {
    q = { ids: new Set(), waiters: [] }
    queue.set(ymd, q)
    setTimeout(() => {
      const cur = queue.get(ymd)!
      queue.delete(ymd)
      fetch(`/api/tint?d=${ymd}&ids=${[...cur.ids].join(',')}`)
        .then((r) => r.json())
        .then((d: { tints?: Record<number, Tint> }) => cur.waiters.forEach((w) => w(d.tints ?? {})))
        .catch(() => cur.waiters.forEach((w) => w({})))
    }, 50)
  }
  q.ids.add(id)
  return new Promise((res) => q!.waiters.push(res))
}

export function useCardTint(id: number, ymd: string, initial?: Tint | null): Tint | null {
  const [late, setLate] = useState<Tint | null>(() => loaded.get(id) ?? null)
  useEffect(() => {
    if (initial || loaded.has(id)) return
    let stop = false
    askBatch(ymd, id).then((t) => {
      if (t[id]) loaded.set(id, t[id])
      if (!stop && t[id]) setLate(t[id])
    })
    return () => {
      stop = true
    }
  }, [id, ymd, initial])
  return initial ?? late
}

/** Окраска карточки цветами клубов (хозяева — сверху слева, гости — снизу справа). */
export function CardTint({ id, ymd, initial }: { id: number; ymd: string; initial?: Tint | null }) {
  const t = useCardTint(id, ymd, initial)
  if (!t) return null
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 animate-[fade-in_0.6s_ease]"
      style={{
        background: `linear-gradient(135deg, color-mix(in oklab, ${t.home} 30%, transparent), transparent 55%), linear-gradient(315deg, color-mix(in oklab, ${t.away} 30%, transparent), transparent 55%)`,
      }}
    />
  )
}
