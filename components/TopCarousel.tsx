'use client'

import { Children, useCallback, useEffect, useRef, useState } from 'react'

const AUTO_MS = 7000

/**
 * «Матч дня» каруселью: по слайду на главный матч каждой топ-лиги. Слайды — обычная лента
 * с прокруткой и привязкой (на телефоне листаются пальцем; без JS видны все, поисковикам — тоже),
 * точки справа сверху — где мы и переход к слайду. Сама листается раз в 7 секунд, но замирает,
 * пока курсор на карточке, и насовсем — после того как человек сам выбрал слайд;
 * при «уменьшить движение» в системе не листается вовсе.
 */
export function TopCarousel({ heads, className = '', children }: { heads: { league: string; live: boolean }[]; className?: string; children: React.ReactNode }) {
  const track = useRef<HTMLDivElement>(null)
  const [cur, setCur] = useState(0)
  const [hold, setHold] = useState(false)
  const [manual, setManual] = useState(false)
  const n = Children.count(children)

  const go = useCallback((k: number) => {
    const el = track.current
    if (el) el.scrollTo({ left: k * el.clientWidth, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (n < 2 || hold || manual || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = window.setTimeout(() => go((cur + 1) % n), AUTO_MS)
    return () => window.clearTimeout(t)
  }, [cur, hold, manual, n, go])

  const head = heads[cur] ?? heads[0]
  return (
    <article
      className={`relative flex min-w-0 flex-col py-5 transition-colors duration-300 hover:border-edge-2 ${className}`}
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={() => setHold(false)}
      onTouchStart={() => setManual(true)}
    >
      <div className="flex items-center justify-between gap-3 px-5 sm:px-6">
        <p className="min-w-0 truncate text-[13px] font-medium text-chalk" aria-live="polite">
          {head?.live ? <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse-live rounded-full bg-live align-middle" /> : null}
          Матч дня <span className="text-mute">· {head?.league}</span>
        </p>
        {n > 1 ? (
          <div className="relative z-10 -mr-1.5 flex shrink-0 items-center" role="tablist" aria-label="Матчи дня в разных лигах">
            {heads.map((h, k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={k === cur}
                aria-label={`${h.league}: матч дня`}
                title={h.league}
                onClick={() => {
                  setManual(true)
                  go(k)
                }}
                className="group/dot grid h-7 place-items-center px-1.5"
              >
                <span
                  className={`block h-1.5 rounded-full transition-all duration-300 ${k === cur ? 'w-5 bg-fg' : 'w-1.5 bg-white/25 group-hover/dot:bg-white/50'}`}
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div
        ref={track}
        className="scrollbar-none mt-3.5 flex flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
        onScroll={(e) => {
          const el = e.currentTarget
          const k = Math.round(el.scrollLeft / Math.max(1, el.clientWidth))
          if (k !== cur) setCur(k)
        }}
      >
        {Children.map(children, (c, k) => (
          <div className="flex w-full shrink-0 snap-start px-5 sm:px-6">
            {c}
          </div>
        ))}
      </div>
    </article>
  )
}
