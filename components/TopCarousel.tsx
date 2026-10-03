'use client'

import { Children, useCallback, useEffect, useRef, useState } from 'react'

/**
 * «Матч дня» по топ-лигам: по слайду на главный матч каждой лиги. Лига выбирается чипом
 * «Ла Лига ▾» в шапке — сразу видно, что лиги можно переключать и какие они. Сама карточка
 * не листается: выбрал АПЛ — АПЛ и остаётся. Слайды — лента с прокруткой и привязкой:
 * на телефоне листаются пальцем (чип следует за лентой), без JS видны все, поисковикам — тоже.
 */
export function TopCarousel({ heads, className = '', children }: { heads: { league: string; live: boolean }[]; className?: string; children: React.ReactNode }) {
  const track = useRef<HTMLDivElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const [cur, setCur] = useState(0)
  const [open, setOpen] = useState(false)
  const n = Children.count(children)

  const go = useCallback((k: number) => {
    const el = track.current
    if (el) el.scrollTo({ left: k * el.clientWidth, behavior: 'smooth' })
    setCur(k)
  }, [])

  // меню закрывается кликом мимо и Esc
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!menu.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const head = heads[cur] ?? heads[0]
  return (
    <article className={`relative flex min-w-0 flex-col py-[18px] transition-colors duration-300 hover:border-edge-2 ${className}`}>
      <div className="flex items-center justify-between gap-3 px-[18px]">
        <p className="min-w-0 truncate text-[13px] font-medium text-chalk">
          {head?.live ? <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse-live rounded-full bg-live align-middle" /> : null}
          Матч дня
        </p>
        {n > 1 ? (
          <div ref={menu} className="relative z-20 shrink-0">
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
              className="inline-flex h-7 items-center gap-1.5 rounded-[9px] bg-white/[0.07] pl-3 pr-2 text-[13px] font-medium text-fg transition-colors hover:bg-white/[0.11]"
            >
              {head?.league}
              <svg viewBox="0 0 24 24" className={`h-4 w-4 text-dim transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {open ? (
              <div role="listbox" aria-label="Лига" className="absolute right-0 top-[calc(100%+6px)] min-w-[180px] rounded-[14px] border border-edge bg-panel-2 p-1.5 shadow-[0_16px_40px_rgb(0_0_0/0.5)]">
                {heads.map((h, k) => (
                  <button
                    key={k}
                    type="button"
                    role="option"
                    aria-selected={k === cur}
                    onClick={() => {
                      go(k)
                      setOpen(false)
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-[9px] px-3 py-2 text-left text-[14px] transition-colors hover:bg-white/[0.06] ${k === cur ? 'text-fg' : 'text-chalk'}`}
                  >
                    <span className="flex items-center gap-2">
                      {h.league}
                      {h.live ? <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-live" aria-label="идёт" /> : null}
                    </span>
                    {k === cur ? (
                      <svg viewBox="0 0 24 24" className="h-4 w-4 text-acid" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <span className="text-[13px] text-mute">{head?.league}</span>
        )}
      </div>
      <div
        ref={track}
        className="scrollbar-none mt-3 flex flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
        onScroll={(e) => {
          const el = e.currentTarget
          const k = Math.round(el.scrollLeft / Math.max(1, el.clientWidth))
          if (k !== cur) setCur(k)
        }}
      >
        {Children.map(children, (c) => <div className="flex w-full shrink-0 snap-start px-[18px]">{c}</div>)}
      </div>
    </article>
  )
}
