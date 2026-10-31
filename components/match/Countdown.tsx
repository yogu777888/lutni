'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { pluralN } from '@/lib/format'

const pad = (n: number) => String(n).padStart(2, '0')

/** «через 1:29:45» (меньше часа — «через 29:45»), от суток — «через 2 дня 5 ч»; время вышло — «вот-вот начнётся». */
export function countdownText(ms: number): string {
  if (ms <= 0) return 'вот-вот начнётся'
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86_400)
  const h = Math.floor((s % 86_400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d) return `через ${pluralN(d, ['день', 'дня', 'дней'])}${h ? ` ${h} ч` : ''}`
  return `через ${h ? `${h}:${pad(m)}` : m}:${pad(s % 60)}`
}

/**
 * Обратный отсчёт до начала матча на табло (владелец: «я почти на всех сайтах видел что до начала матча еще есть обратный
 * отсчет»): тикает каждую секунду. Первая отрисовка — по часам сервера (`now`), чтобы разметка с сервера и в браузере
 * совпала; дальше — часы браузера со сдвигом часов сайта (`skew`: в демо часы стоят на 4 октября 2026-го, на хостинге — 0).
 * Время вышло — раз в минуту тихо перезапрашиваем страницу (матч начался — табло сменится на счёт, отсчёт уйдёт сам).
 */
export function Countdown({ ts, now, skew, className = '' }: { ts: number; now: number; skew: number; className?: string }) {
  const router = useRouter()
  const [t, setT] = useState(now)
  useEffect(() => {
    const tick = () => setT(Date.now() + skew)
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [skew])
  const left = ts - t
  const over = left <= 0
  useEffect(() => {
    if (!over) return
    router.refresh()
    const id = window.setInterval(() => document.visibilityState === 'visible' && router.refresh(), 60_000)
    return () => window.clearInterval(id)
  }, [over, router])
  return (
    <span className={`num tabular-nums ${className}`} role="timer" aria-live="off">
      {countdownText(left)}
    </span>
  )
}
