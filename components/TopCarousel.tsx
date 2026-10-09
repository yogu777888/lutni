'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { CHIP, StoryChipFace } from './Chips'
import { openStory } from './story/events'

/** Матч слайда — для шапки и кнопки разбора: турнир и разбор — про матч, который сейчас на экране. */
export type MainSlide = { id: number; href: string; live: boolean; caption: string; title: string }
/** Эмблемы команд матча — крупным тиснением на фоне карточки (хозяева слева, гости справа). */
export type Marks = { home: string | null; away: string | null }
/** День в чипе: переход на страницу дня — вся страница (блок, подборки, список) про один и тот же день. */
export type DayLink = { key: string; label: string; href: string; current: boolean; live?: boolean }

function Arrow({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={dir === 'left' ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'} />
    </svg>
  )
}

/** Снизу затемнение — под белый текст. */
const SCRIM = 'hero-scrim absolute inset-0'

/**
 * Фон карточки матча, как живые обои Apple, но монохром: графитовая заливка и четыре графитовых пятна разной
 * светлоты, плюс светлый блик. Пятна плывут каждое своим путём (`drift-a…d`, 19–27 с) — фон переливается. Поверх —
 * эмблемы команд тиснением (`Mark`). Свечения вокруг карточки нет: на голубом фоне оно читалось тяжёлой тенью.
 * Цвета клубов (вид «Афиша») владелец сменил на графит: увидел карточку до того, как цвета догрузились, и выбрал так.
 */
function Paint({ marks, drift = false }: { marks?: Marks; drift?: boolean }) {
  // цвета — CSS-переменные .hero (app/globals.css): светлая версия и прежняя графитовая (?look=dark)
  const home = 'var(--paint-1)'
  const away = 'var(--paint-2)'
  const home2 = 'var(--paint-3)'
  const away2 = 'var(--paint-4)'
  const blob = (c: string) => ({ background: `radial-gradient(closest-side, ${c}, transparent)` })
  return (
    <>
      <div className="absolute inset-0" style={{ background: `linear-gradient(in oklch 100deg, ${home} 8%, ${away} 92%)` }} />
      <div className={`absolute -left-[15%] -top-[40%] h-[140%] w-[70%] rounded-full ${drift ? 'drift-a' : ''}`} style={blob(home)} />
      <div className={`absolute -bottom-[55%] left-[4%] h-[125%] w-[52%] rounded-full opacity-90 ${drift ? 'drift-c' : ''}`} style={blob(home2)} />
      <div className={`absolute -bottom-[40%] -right-[15%] h-[140%] w-[70%] rounded-full ${drift ? 'drift-b' : ''}`} style={blob(away)} />
      <div className={`absolute -top-[55%] right-[4%] h-[125%] w-[52%] rounded-full opacity-90 ${drift ? 'drift-d' : ''}`} style={blob(away2)} />
      <div className={`absolute -top-[30%] left-[25%] h-[110%] w-[50%] rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.13),transparent)] ${drift ? 'drift-b' : ''}`} />
      {marks?.home ? <Mark src={marks.home} side="left" drift={drift} /> : null}
      {marks?.away ? <Mark src={marks.away} side="right" drift={drift} /> : null}
    </>
  )
}

/**
 * Эмблема команды крупно за ней — чуть выше карточки (обрезана сверху и снизу едва-едва), а сбоку
 * наполовину за краем: видна часть, обращённая к центру. Серая, в режиме «мягкий свет» — окрашивается в цвет
 * фона, как тиснение. Контрастный трафарет (серая, контраст ×3): настоящие эмблемы маленькие, при таком
 * увеличении они мутные; контраст делает из этого чёткий оттиск с гладкими краями, как печать. Просто без фильтра
 * видны пиксели, а размытие владелец счёл «плохим фото». Едва покачивается (`drift-mark`, правая —
 * со сдвигом по времени, не в такт левой). Смешивание — у обёртки: она и сдвинута (transform), и смешивается с
 * фоном целиком. На телефоне эмблемы меньше — иначе сходятся в середине, под временем.
 */
function Mark({ src, side, drift }: { src: string; side: 'left' | 'right'; drift: boolean }) {
  return (
    <div
      className={`hero-mark absolute top-1/2 aspect-square h-[56%] -translate-y-1/2 sm:h-[112%] ${
        side === 'left' ? 'left-0 -translate-x-1/2 sm:-translate-x-[38%]' : 'right-0 translate-x-1/2 sm:translate-x-[38%]'
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        aria-hidden
        decoding="async"
        className={`hero-mark-img h-full w-full object-contain ${drift ? `drift-mark ${side === 'right' ? '[animation-delay:-9s]' : ''}` : ''}`}
      />
    </div>
  )
}

/**
 * «Главные матчи» — до пяти важных встреч дня (lib/day-summary.ts, mainMatches). Шапка карточки: слева турнир
 * и тур матча на экране, справа стрелки (на телефоне их нет — свайп), без автопрокрутки, и чип дня; сколько матчей
 * и какой на экране — полоски-точки внизу карточки (на телефоне — в ряду с «Разбором за минуту»).
 * Чип — переход на страницу дня: выбранный день меняет всю страницу согласованно (блок, подборки под ним,
 * список матчей) и уходит в ссылки подборок. Слайды — лента со scroll-snap: без JS видны все матчи дня.
 */
export function TopCarousel({
  slides,
  panels,
  days,
  marks,
  className = '',
}: {
  slides: MainSlide[]
  panels: React.ReactNode[]
  days: DayLink[]
  /** эмблемы команд каждого матча — для тиснения на фоне */
  marks: Marks[]
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

  // полоски-точки: сколько главных матчей и какой на экране, как в баннерах App Store; клик — к этому матчу,
  // при наведении — подсказка с командами
  const dots = (cls: string, hit = 'h-4 px-[3px]') =>
    n > 1 ? (
      <div className={`items-center ${cls}`}>
        {slides.map((s, k) => (
          <button
            key={s.id}
            type="button"
            onClick={() => go(k)}
            title={s.title}
            aria-label={`Матч ${k + 1} из ${n}: ${s.title}`}
            aria-current={k === cur ? 'true' : undefined}
            className={`group/dot grid place-items-center ${hit}`}
          >
            <span className={`block h-1.5 rounded-full transition-all duration-300 ${k === cur ? 'w-[18px] bg-fg' : 'w-1.5 bg-white/35 group-hover/dot:bg-white/70'}`} />
          </button>
        ))}
      </div>
    ) : null
  const arrows = (cls: string) =>
    n > 1 ? (
      <div className={`items-center gap-1.5 ${cls}`}>
        <button type="button" aria-label="Предыдущий матч" disabled={cur === 0} onClick={() => go(cur - 1)} className={`${CHIP} w-8 justify-center text-chalk disabled:pointer-events-none disabled:opacity-35`}>
          <Arrow dir="left" />
        </button>
        <button type="button" aria-label="Следующий матч" disabled={cur === n - 1} onClick={() => go(cur + 1)} className={`${CHIP} w-8 justify-center text-chalk disabled:pointer-events-none disabled:opacity-35`}>
          <Arrow dir="right" />
        </button>
      </div>
    ) : null
  return (
    <article
      aria-label="Главные матчи"
      className={`on-dark hero relative flex min-w-0 flex-col py-[18px] lg:py-7 lg:[@media(min-height:740px)_and_(max-height:799px)]:py-6 lg:[@media(max-height:739px)]:py-4 ${className}`}
    >
      {/* у каждого матча свой фон — графит, поверх медленно плывут пятна и блик (CSS) и эмблемы команд тиснением;
          при листании фоны плавно сменяют друг друга; снизу лёгкое затемнение.
          Фон заходит и под прозрачную рамку карточки — иначе по краю видна тёмная полоска */}
      <div aria-hidden className="pointer-events-none absolute -inset-px overflow-hidden rounded-[inherit]">
        {marks.map((mk, k) => (
          <div key={k} className={`absolute inset-0 transition-opacity duration-700 ${k === cur ? 'opacity-100' : 'opacity-0'}`}>
            <Paint marks={mk} drift />
          </div>
        ))}
        <div className={SCRIM} />
      </div>
      {/* шапка: слева турнир матча на экране, справа стрелки и чип дня (в углу — сверху и справа поровну);
          на компьютере отступы карточки больше — 28px (на окне ниже 800px — 24px, ниже 740px — 20px): так табло не жмётся к краю */}
      <div className="relative flex items-center justify-between gap-3 px-[18px] lg:px-7 lg:[@media(min-height:740px)_and_(max-height:799px)]:px-6 lg:[@media(max-height:739px)]:px-5">
        <p className="min-w-0 truncate text-[13px] text-fg/80">
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
                        <svg viewBox="0 0 24 24" className="h-4 w-4 text-good" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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

      {n > 1 ? (
        <span className="sr-only" aria-live="polite">
          Матч {cur + 1} из {n}
        </span>
      ) : null}

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

      {/* полоски-точки — внизу по центру, в нижнем отступе карточки: высоту карточки не меняют, первый экран влезает
          как раньше. На телефоне — справа от «Разбора за минуту», вместо стрелок (там листают свайпом) */}
      {n > 1 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-px hidden justify-center sm:flex lg:bottom-1.5 lg:[@media(min-height:740px)_and_(max-height:799px)]:bottom-1 lg:[@media(max-height:739px)]:bottom-0.5">
          <div className="pointer-events-auto">{dots('flex')}</div>
        </div>
      ) : null}

      {/* на телефоне и планшете — под лентой: разбор матча на экране, на телефоне рядом — полоски-точки (крупнее, под палец).
          На компьютере кнопка разбора — под табло в самом слайде */}
      <div className="relative mt-4 flex flex-wrap items-center gap-2 px-[18px] lg:hidden">
        {meta ? (
          <button type="button" onClick={(e) => openStory({ id: meta.id, href: meta.href, opener: e.currentTarget })} className={`${CHIP} shrink-0 gap-2 pl-1 pr-3.5`}>
            <StoryChipFace />
          </button>
        ) : null}
        {dots('ml-auto flex shrink-0 sm:hidden', 'h-8 px-[5px]')}
      </div>
    </article>
  )
}
