'use client'

import { useEffect, useRef, useState } from 'react'
import { openStory } from './story/events'

/** Матч слайда — для кнопок под лентой: они относятся к матчу, который сейчас на экране. */
export type MainSlide = { id: number; href: string; live: boolean; bet: { label: string; odd: number | null } | null }
/** День в блоке: «Вчера» — итоги, «Сегодня», «Завтра» — анонс. */
export type MainDay = { key: string; label: string; slides: MainSlide[] }

/** Кнопки и чипы внутри блока — одна система: 32px, углы 10px, мягкая заливка без обводки. */
const CHIP = 'inline-flex h-8 items-center rounded-[10px] bg-white/[0.07] text-[13px] font-medium text-fg transition-colors hover:bg-white/[0.11]'

function Arrow({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={dir === 'left' ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'} />
    </svg>
  )
}

/**
 * «Главные матчи» — до пяти важных встреч дня (lib/day-summary.ts, mainMatches): листаются стрелками
 * «1 из 4» внизу (на телефоне — и свайпом), без автопрокрутки. Чип дня справа сверху меняет только этот
 * блок — заглянуть во вчера (итоги) и в завтра (анонс); истории, кнопки под блоком и список матчей
 * остаются про день страницы. Слайды — лента со scroll-snap: без JS видны все матчи дня.
 */
export function TopCarousel({
  days,
  panels,
  initial = 0,
  className = '',
}: {
  days: MainDay[]
  panels: React.ReactNode[][]
  initial?: number
  className?: string
}) {
  const track = useRef<HTMLDivElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const [day, setDay] = useState(initial)
  const [cur, setCur] = useState(0)
  const [open, setOpen] = useState(false)
  const slides = panels[day] ?? []
  const n = slides.length
  const meta = days[day]?.slides[cur]

  const go = (k: number) => {
    const next = Math.max(0, Math.min(n - 1, k))
    const el = track.current
    if (el) el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
    setCur(next)
  }

  const pickDay = (d: number) => {
    setDay(d)
    setCur(0)
    setOpen(false)
    track.current?.scrollTo({ left: 0 })
  }

  // меню дня закрывается кликом мимо и Esc
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

  const current = days[day]
  return (
    <article className={`relative flex min-w-0 flex-col py-[18px] ${className}`}>
      <div className="flex items-center justify-between gap-3 px-[18px]">
        <p className="min-w-0 truncate text-[15px] font-semibold text-fg">
          {meta?.live ? <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse-live rounded-full bg-live align-middle" /> : null}
          Главные матчи
          {/* другой день блока — в заголовке, чтобы не казалось, что переключилась вся страница */}
          {day !== initial && current ? <span className="font-normal text-mute"> · {current.label.toLowerCase()}</span> : null}
        </p>
        {days.length > 1 ? (
          <div ref={menu} className="relative z-20 shrink-0">
            <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={`${CHIP} gap-1.5 pl-3 pr-2`}>
              {current?.label}
              <svg viewBox="0 0 24 24" className={`h-4 w-4 text-dim transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {open ? (
              <div role="listbox" aria-label="День главных матчей" className="absolute right-0 top-[calc(100%+6px)] min-w-[180px] rounded-[14px] border border-edge bg-panel-2 p-1.5 shadow-[0_16px_40px_rgb(0_0_0/0.5)]">
                {days.map((d, k) => (
                  <button
                    key={d.key}
                    type="button"
                    role="option"
                    aria-selected={k === day}
                    onClick={() => pickDay(k)}
                    className={`flex w-full items-center justify-between gap-3 rounded-[10px] px-3 py-2 text-left text-[14px] transition-colors hover:bg-white/[0.06] ${k === day ? 'text-fg' : 'text-chalk'}`}
                  >
                    <span className="flex items-center gap-2">
                      {d.label}
                      {d.slides.some((s) => s.live) ? <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-live" aria-label="идут матчи" /> : null}
                    </span>
                    {k === day ? (
                      <svg viewBox="0 0 24 24" className="h-4 w-4 text-acid" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div
        key={current?.key}
        ref={track}
        className="scrollbar-none mt-3 flex flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain lg:[@media(max-height:739px)]:mt-2"
        onScroll={(e) => {
          const el = e.currentTarget
          const k = Math.round(el.scrollLeft / Math.max(1, el.clientWidth))
          if (k !== cur) setCur(k)
        }}
      >
        {slides.map((c, k) => (
          <div key={k} className="flex w-full shrink-0 snap-start px-[18px]">
            {c}
          </div>
        ))}
      </div>

      {/* под лентой: разбор текущего матча и «Выгодно» слева, стрелки — справа; на телефоне «Выгодно» — строкой выше */}
      <div className="mt-4 flex flex-wrap items-center gap-2 px-[18px] lg:[@media(max-height:739px)]:mt-3">
        {meta ? (
          <button
            type="button"
            onClick={(e) => openStory({ id: meta.id, href: meta.href, opener: e.currentTarget })}
            className={`${CHIP} order-2 shrink-0 gap-2 pl-1 pr-3.5 sm:order-1`}
          >
            <span className="grid h-6 w-6 place-items-center rounded-[7px] bg-acid text-acid-ink" aria-hidden>
              <svg viewBox="0 0 12 12" className="ml-px h-2.5 w-2.5" fill="currentColor">
                <path d="M3 1.5v9l7.5-4.5z" />
              </svg>
            </span>
            Разбор за минуту
          </button>
        ) : null}
        {meta?.bet ? (
          <div className="order-1 flex w-full min-w-0 sm:order-2 sm:w-auto">
            <span className="inline-flex h-8 min-w-0 items-center gap-1.5 rounded-[10px] bg-acid/[0.12] px-3 text-[13px] font-semibold text-acid">
              <span className="truncate">{meta.bet.label}</span>
              {meta.bet.odd ? <span className="num shrink-0">· {meta.bet.odd.toFixed(2)}</span> : null}
            </span>
          </div>
        ) : null}
        {n > 1 ? (
          <div className="order-3 ml-auto flex shrink-0 items-center gap-1.5">
            <button type="button" aria-label="Предыдущий матч" disabled={cur === 0} onClick={() => go(cur - 1)} className={`${CHIP} w-8 justify-center text-chalk disabled:pointer-events-none disabled:opacity-35`}>
              <Arrow dir="left" />
            </button>
            <span className="num min-w-[52px] text-center text-[13px] text-dim" aria-live="polite">
              {cur + 1} из {n}
            </span>
            <button type="button" aria-label="Следующий матч" disabled={cur === n - 1} onClick={() => go(cur + 1)} className={`${CHIP} w-8 justify-center text-chalk disabled:pointer-events-none disabled:opacity-35`}>
              <Arrow dir="right" />
            </button>
          </div>
        ) : null}
      </div>
    </article>
  )
}
