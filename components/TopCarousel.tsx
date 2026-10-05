'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { CHIP, StoryChipFace } from './Chips'
import { openStory } from './story/events'

/** Матч слайда — для шапки и кнопки разбора: турнир и разбор — про матч, который сейчас на экране. */
export type MainSlide = { id: number; href: string; live: boolean; caption: string }
/** День в чипе: переход на страницу дня — вся страница (блок, подборки, список) про один и тот же день. */
export type DayLink = { key: string; label: string; href: string; current: boolean; live?: boolean }

function Arrow({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={dir === 'left' ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'} />
    </svg>
  )
}

/**
 * «Главные матчи» — до пяти важных встреч дня (lib/day-summary.ts, mainMatches). Шапка карточки: слева турнир
 * и тур матча на экране, справа стрелки «1 из 5» (на телефоне — внизу, и свайп), без автопрокрутки, и чип дня.
 * Чип — переход на страницу дня: выбранный день меняет всю страницу согласованно (блок, подборки под ним,
 * список матчей) и уходит в ссылки подборок. Слайды — лента со scroll-snap: без JS видны все матчи дня.
 */
export function TopCarousel({
  slides,
  panels,
  days,
  backdrops,
  className = '',
}: {
  slides: MainSlide[]
  panels: React.ReactNode[]
  days: DayLink[]
  /** «Афиша»: цвета клубов каждого матча (хозяева слева, гости справа); null — графит */
  backdrops?: ({ home: string; away: string } | null)[]
  className?: string
}) {
  const track = useRef<HTMLDivElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const [cur, setCur] = useState(0)
  const [open, setOpen] = useState(false)
  const n = panels.length
  const meta = slides[cur]
  const current = days.find((d) => d.current)

  const go = (k: number) => {
    const next = Math.max(0, Math.min(n - 1, k))
    const el = track.current
    if (el) el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
    setCur(next)
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
  return (
    <article
      aria-label="Главные матчи"
      className={`relative flex min-w-0 flex-col py-[18px] lg:py-7 lg:[@media(min-height:740px)_and_(max-height:799px)]:py-6 lg:[@media(max-height:739px)]:py-5 ${className}`}
    >
      {backdrops ? (
        // «Афиша»: у каждого матча свой фон — заливка цветами клубов, поверх медленно плывут пятна и блик (CSS),
        // при листании фоны плавно сменяют друг друга; снизу лёгкое затемнение.
        // Фон заходит и под прозрачную рамку карточки — иначе по краю видна тёмная полоска
        <div aria-hidden className="pointer-events-none absolute -inset-px overflow-hidden rounded-[inherit]">
          {backdrops.map((b, k) => (
            <div key={k} className={`absolute inset-0 transition-opacity duration-700 ${k === cur ? 'opacity-100' : 'opacity-0'}`}>
              {/* заливка на всю карточку: цвет хозяев слева плавно переходит в цвет гостей справа */}
              <div className="absolute inset-0" style={{ background: `linear-gradient(in oklch 100deg, ${b?.home ?? 'hsl(40 6% 30%)'} 8%, ${b?.away ?? 'hsl(40 6% 24%)'} 92%)` }} />
              <div
                className="drift-a absolute -left-[15%] -top-[40%] h-[140%] w-[70%] rounded-full"
                style={{ background: `radial-gradient(closest-side, ${b?.home ?? 'hsl(40 6% 30%)'}, transparent)` }}
              />
              <div
                className="drift-b absolute -bottom-[40%] -right-[15%] h-[140%] w-[70%] rounded-full"
                style={{ background: `radial-gradient(closest-side, ${b?.away ?? 'hsl(40 6% 26%)'}, transparent)` }}
              />
              {/* светлый блик медленно плывёт поверх — фон «живой», как баннеры в App Store */}
              <div className="drift-b absolute -top-[30%] left-[25%] h-[110%] w-[50%] rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.13),transparent)]" />
            </div>
          ))}
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgb(11_11_9/0.55),rgb(11_11_9/0.12)_45%,rgb(11_11_9/0.08))]" />
        </div>
      ) : null}
      {backdrops ? (
        // свечение вокруг карточки, как «подсветка» на YouTube: размытая копия той же заливки за краями.
        // Неподвижное (плывёт только фон внутри) и слабое — чтобы не красить кружки и подборки; на телефоне нет
        <div aria-hidden className="pointer-events-none absolute -inset-x-5 -inset-y-4 -z-10 hidden transform-gpu opacity-35 blur-[48px] sm:block">
          {backdrops.map((b, k) => (
            <div
              key={k}
              className={`absolute inset-0 rounded-[40px] transition-opacity duration-700 ${k === cur ? 'opacity-100' : 'opacity-0'}`}
              style={{ background: `linear-gradient(in oklch 100deg, ${b?.home ?? 'hsl(40 6% 30%)'} 8%, ${b?.away ?? 'hsl(40 6% 24%)'} 92%)` }}
            />
          ))}
        </div>
      ) : null}
      {/* шапка: слева турнир матча на экране, справа стрелки и чип дня (в углу — сверху и справа поровну);
          на компьютере отступы карточки больше — 28px (на окне ниже 800px — 24px, ниже 740px — 20px): так табло не жмётся к краю */}
      <div className="relative flex items-center justify-between gap-3 px-[18px] lg:px-7 lg:[@media(min-height:740px)_and_(max-height:799px)]:px-6 lg:[@media(max-height:739px)]:px-5">
        <p className={`min-w-0 truncate text-[13px] ${backdrops ? 'text-fg/80' : 'text-dim'}`}>
          {meta?.live ? <span className="mr-2 inline-block h-1.5 w-1.5 animate-pulse-live rounded-full bg-live align-middle" aria-label="идёт" /> : null}
          {meta?.caption}
        </p>
        <div className="flex shrink-0 items-center gap-3">
          {arrows('hidden sm:flex')}
          {current ? (
            <div ref={menu} className="relative z-20 shrink-0">
              <button type="button" aria-haspopup="true" aria-expanded={open} aria-label={`День: ${current.label}. Выбрать другой`} onClick={() => setOpen((o) => !o)} className={`${CHIP} gap-1.5 pl-3 pr-2`}>
                {current.label}
                <svg viewBox="0 0 24 24" className={`h-4 w-4 text-dim transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {open ? (
                <nav aria-label="День" className="absolute right-0 top-[calc(100%+6px)] min-w-[180px] rounded-[14px] border border-edge bg-panel-2 p-1.5 shadow-[0_16px_40px_rgb(0_0_0/0.5)]">
                  {days.map((d) => (
                    <Link
                      key={d.key}
                      href={d.href}
                      prefetch={false}
                      aria-current={d.current ? 'page' : undefined}
                      onClick={() => setOpen(false)}
                      className={`flex w-full items-center justify-between gap-3 rounded-[10px] px-3 py-2 text-left text-[14px] transition-colors hover:bg-white/[0.06] ${d.current ? 'text-fg' : 'text-chalk'}`}
                    >
                      <span className="flex items-center gap-2">
                        {d.label}
                        {d.live ? <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-live" aria-label="идут матчи" /> : null}
                      </span>
                      {d.current ? (
                        <svg viewBox="0 0 24 24" className="h-4 w-4 text-acid" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      ) : null}
                    </Link>
                  ))}
                </nav>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div
        ref={track}
        className="scrollbar-none relative mt-3 flex flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain lg:[@media(max-height:799px)]:mt-2"
        onScroll={(e) => {
          const el = e.currentTarget
          const k = Math.round(el.scrollLeft / Math.max(1, el.clientWidth))
          if (k !== cur) setCur(k)
        }}
      >
        {panels.map((c, k) => (
          <div key={k} className="flex w-full shrink-0 snap-start px-[18px] lg:px-7 lg:[@media(min-height:740px)_and_(max-height:799px)]:px-6 lg:[@media(max-height:739px)]:px-5">
            {c}
          </div>
        ))}
      </div>

      {/* на телефоне и планшете — под лентой: разбор матча на экране, на телефоне рядом — стрелки.
          На компьютере кнопка разбора — под табло в самом слайде */}
      <div className="relative mt-4 flex flex-wrap items-center gap-2 px-[18px] lg:hidden">
        {meta ? (
          <button type="button" onClick={(e) => openStory({ id: meta.id, href: meta.href, opener: e.currentTarget })} className={`${CHIP} shrink-0 gap-2 pl-1 pr-3.5`}>
            <StoryChipFace />
          </button>
        ) : null}
        {arrows('ml-auto flex shrink-0 sm:hidden')}
      </div>
    </article>
  )
}
