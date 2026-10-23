'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

/**
 * Живые страницы: пока идут матчи, раз в `every` мс тихо перезапрашиваем страницу у сервера (router.refresh) — без
 * перезагрузки, карусель, прокрутка и открытые сторис остаются на месте. Только пока вкладка на экране; вернулись
 * на вкладку — обновляем сразу. Данные кэширует наш слой (lib/data.ts), так что лишних запросов к API нет.
 */
export function LiveRefresh({ every = 60_000 }: { every?: number }) {
  const router = useRouter()
  useEffect(() => {
    let t: number | undefined
    const tick = () => {
      if (document.visibilityState === 'visible') router.refresh()
    }
    const start = () => {
      window.clearInterval(t)
      t = window.setInterval(tick, every)
    }
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        router.refresh()
        start()
      }
    }
    start()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(t)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [router, every])
  return null
}

/**
 * Цифра, которая при изменении мягко «перещёлкивается» сверху и на секунду подсвечивается лаймом (`.tick` в
 * app/globals.css): гол видно, даже если смотрели в другую часть экрана. При первом показе — без анимации.
 */
export function Tick({ v }: { v: number | string }) {
  const prev = useRef(v)
  const [n, setN] = useState(0)
  useEffect(() => {
    if (prev.current !== v) {
      prev.current = v
      setN((x) => x + 1)
    }
  }, [v])
  return (
    <span key={n} className={n ? 'tick inline-block' : 'inline-block'}>
      {v}
    </span>
  )
}
