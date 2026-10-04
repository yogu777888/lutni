'use client'

import { useEffect, useRef, useState } from 'react'
import { CHIP, StoryChipFace, ValueChip } from './Chips'
import { openStory } from './story/events'

/** Матч слайда — для кнопок под лентой: они относятся к матчу, который сейчас на экране. */
export type MainSlide = { id: number; href: string; live: boolean; bet: { label: string; odd: number | null } | null }
/** День в блоке: «Вчера» — итоги, «Сегодня», «Завтра» — анонс. */
export type MainDay = { key: string; label: string; slides: MainSlide[] }

function Arrow({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={dir === 'left' ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'} />
    </svg>
  )
}

/**
 * «Главные матчи» — до пяти важных встреч дня (lib/day-summary.ts, mainMatches). Подписи над карточкой нет:
 * она и так понятна (владелец оставил подпись только над «Цифрами дня»). В правом верхнем углу карточки —
 * стрелки «1 из 5» (на телефоне — и свайп), без автопрокрутки, и чип дня: он меняет только этот блок —
 * заглянуть во вчера (итоги) и в завтра (анонс); истории, переходы под блоком и список матчей остаются про
 * день страницы. Слайды — лента со scroll-snap: без JS видны все матчи дня.
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
  const arrows = (cls: string) =>
    n > 1 ? (
      <div className={`items-center gap-1.5 ${cls}`}>
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
    ) : null
  const controls = n > 1 || days.length > 1
  return (
    <article aria-label="Главные матчи" className={`relative flex min-w-0 flex-col py-[18px] ${className}`}>
      {controls ? (
        // в правом верхнем углу — стрелки и чип дня (сверху и справа поровну); день не со страницы — подписан на чипе
        <div className="flex items-center justify-end gap-3 px-[18px]">
          {arrows('flex')}
          {days.length > 1 ? (
            <div ref={menu} className="relative z-20 shrink-0">
              <button type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={`День главных матчей: ${current?.label ?? ''}`} onClick={() => setOpen((o) => !o)} className={`${CHIP} gap-1.5 pl-3 pr-2`}>
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
      ) : null}

      <div
        key={current?.key}
        ref={track}
        className={`scrollbar-none flex flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain ${controls ? 'mt-3 lg:[@media(max-height:739px)]:mt-2' : ''}`}
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

      {/* на телефоне и планшете — под лентой: «Выгодно» и разбор матча, который на экране.
          На компьютере эти кнопки — под табло в самом слайде */}
      <div className="mt-4 flex flex-wrap items-center gap-2 px-[18px] lg:hidden">
        {meta?.bet ? (
          <div className="flex w-full min-w-0">
            <ValueChip label={meta.bet.label} odd={meta.bet.odd} />
          </div>
        ) : null}
        {meta ? (
          <button type="button" onClick={(e) => openStory({ id: meta.id, href: meta.href, opener: e.currentTarget })} className={`${CHIP} shrink-0 gap-2 pl-1 pr-3.5`}>
            <StoryChipFace />
          </button>
        ) : null}
      </div>
    </article>
  )
}
