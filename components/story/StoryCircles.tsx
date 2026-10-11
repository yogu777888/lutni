'use client'

import { useEffect, useState } from 'react'
import type { CircleKind, StoryGroup } from '@/lib/story-groups'
import { openStory } from './events'
import { circleQueue, seenCount } from './queue'
import { readSeen, SEEN_EVENT } from './seen'
import { discBackground, StorySymbol, symbolColor } from './StorySymbol'
import { TeamLogo } from '../TeamLogo'

/**
 * Истории — круглые входы в подборки, в духе iOS: светлый диск (#FFFFFF → #EAF2F8, тонкая граница, мягкая тень), в
 * центре — абстрактный знак категории (StorySymbol), вокруг — тонкое кольцо просмотренности. Диаметр — 58px (на
 * невысоком окне меньше), под кругом — только название: число матчей — в подсказке.
 */
const D = 76
/** Кольцо 2px по радиусу 36.5: между кольцом и диском — 3px воздуха. */
const R = 36.5
/** Не смотрели — белое кольцо (на голубом фоне это и есть акцент), LIVE — красное, просмотрено — полупрозрачное. */
// новые матчи: в тёмной версии — лайм бренда, в голубой — белое (--ring-new в app/globals.css)
const UNSEEN = 'var(--ring-new, #ffffff)'
const LIVE = '#ff5c63'
const SEEN = 'rgb(255 255 255 / 0.38)'

/**
 * Кольцо одним контуром: просмотренная доля — приглушённая, остальное — цветом (от верха по часовой стрелке).
 * Без сегментов на каждый матч: на подборках из 15–30 матчей они превратились бы в рябь.
 */
function Ring({ kind, n, seen }: { kind: CircleKind; n: number; seen: number }) {
  const color = kind === 'live' ? LIVE : UNSEEN
  const done = Math.round((seen / Math.max(1, n)) * 100)
  const c = { cx: D / 2, cy: D / 2, r: R, fill: 'none', strokeWidth: 2, pathLength: 100, vectorEffect: 'non-scaling-stroke' } as const
  return (
    <svg aria-hidden viewBox={`0 0 ${D} ${D}`} className="absolute inset-0 h-full w-full -rotate-90 overflow-visible">
      <circle {...c} style={{ stroke: done > 0 ? SEEN : color }} />
      {done > 0 && done < 100 ? <circle {...c} style={{ stroke: color }} strokeLinecap="round" strokeDasharray={`${100 - done} ${done}`} strokeDashoffset={-done} /> : null}
    </svg>
  )
}

const MATCH_WORDS = ['матч', 'матча', 'матчей'] as const
const plural = (n: number) => {
  const m10 = n % 10
  const m100 = n % 100
  return MATCH_WORDS[m10 === 1 && m100 !== 11 ? 0 : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 1 : 2]
}

/** Подпись: название в одну строку; число матчей — в подсказке кружка. */
function Caption({ g, dim }: { g: StoryGroup; dim: boolean }) {
  return (
    <>
      <span className={`block truncate text-[12px] font-semibold leading-tight ${dim ? 'text-white/70' : 'text-white'}`}>{g.label}</span>
    </>
  )
}

/**
 * Диск, как иконки Apple («Команды», Fitness): мягкий градиент цвета категории — светлее сверху, глубже снизу, —
 * тонкий блик по верхнему краю и белый знак. Своя картинка из public/stories/<ключ>.* — вместо всего этого.
 */
function Disc({ k, cover }: { k: string; cover?: string }) {
  const c = symbolColor(k)
  return (
    <span
      className="story-disc absolute inset-[5px] grid place-items-center overflow-hidden rounded-full"
      style={{
        background: cover
          ? `center / cover no-repeat url("${cover}")`
          : discBackground(c),
      }}
    >
      {cover ? null : <StorySymbol k={k} tone="#ffffff" className="h-[56%] w-[56%] drop-shadow-[0_1px_1.5px_rgb(0_0_0/0.18)]" />}
    </span>
  )
}

/**
 * Кружки историй дня вместо полосы тегов: «В игре», «Топ дня» и по кружку на тег.
 * Это обычные ссылки (на страницу тега / матча) — для поисковиков и без JS;
 * клик открывает сторис матчей кружка, затем следующих кружков.
 */
export function StoryCircles({
  groups,
  covers = {},
  layout = 'circles',
}: {
  groups: StoryGroup[]
  covers?: Record<string, string>
  /** cards — карточки в ряд внизу первого экрана (кружок со знаком, название, эмблемы матчей и число матчей) */
  layout?: 'circles' | 'cards'
}) {
  const [seen, setSeen] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    const update = () => setSeen(readSeen())
    update()
    window.addEventListener(SEEN_EVENT, update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener(SEEN_EVENT, update)
      window.removeEventListener('storage', update)
    }
  }, [])

  if (!groups.length) return null

  const open = (gi: number, e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    // очередь: матчи этого кружка, потом следующих; начинаем с первого непросмотренного в этом кружке
    const { queue, startId } = circleQueue(groups, gi, seen, covers)
    openStory({ id: startId, href: groups[gi].href, opener: e.currentTarget, queue })
  }

  if (layout === 'cards') {
    return (
      <nav aria-label="Истории дня" className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 py-0.5 [mask-image:linear-gradient(to_right,#000_calc(100%-32px),transparent)] sm:mx-0 sm:px-0">
        {groups.map((g, gi) => {
          const n = seenCount(g, seen)
          const done = n === g.items.length
          return (
            <a
              key={g.key}
              href={g.href}
              onClick={(e) => open(gi, e)}
              title={g.hint.includes(':') ? g.hint : `${g.hint}: ${g.items.length} ${plural(g.items.length)}`}
              aria-label={`${g.label}. ${g.hint}. Смотреть истории`}
              className="group flex w-[184px] shrink-0 items-center gap-3 rounded-card border border-edge px-3 py-3 transition-colors hover:bg-white/[0.04] lg:py-[clamp(8px,1.8vh,14px)]"
            >
              <span className="relative block h-12 w-12 shrink-0 rounded-full transition-transform duration-300 group-hover:scale-105 group-active:scale-95">
                <Ring kind={g.kind} n={g.items.length} seen={n} />
                <Disc k={g.key} cover={covers[g.key]} />
              </span>
              <span className={`min-w-0 ${done ? 'opacity-60' : ''}`}>
                <span className="block truncate text-[15px] font-semibold leading-tight">{g.label}</span>
                <span className="mt-1 flex items-center gap-1.5 text-[12.5px] leading-none text-dim">
                  {g.crests?.length ? (
                    <span className="flex -space-x-1">
                      {g.crests.slice(0, 2).map((c) => (
                        <TeamLogo key={c.name} name={c.name} src={c.logo} size={16} />
                      ))}
                    </span>
                  ) : null}
                  {g.items.length} {plural(g.items.length)}
                </span>
              </span>
            </a>
          )
        })}
      </nav>
    )
  }

  return (
    <nav aria-label="Истории дня" className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 pt-1.5 [mask-image:linear-gradient(to_right,#000_calc(100%-40px),transparent)] sm:mx-0 sm:px-0 sm:[mask-image:none]">
      {groups.map((g, gi) => {
        const n = seenCount(g, seen)
        const done = n === g.items.length
        return (
          <a
            key={g.key}
            href={g.href}
            onClick={(e) => open(gi, e)}
            title={g.hint.includes(':') ? g.hint : `${g.hint}: ${g.items.length} ${plural(g.items.length)}`}
            aria-label={`${g.label}. ${g.hint}. Смотреть истории`}
            className="group flex w-[80px] shrink-0 flex-col items-center focus-visible:outline-none"
          >
            {/* фокус с клавиатуры — белым кругом вокруг кружка */}
            <span className={`relative block rounded-full transition-transform duration-300 group-hover:-translate-y-0.5 group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-fg group-active:scale-95 h-[58px] w-[58px] lg:h-[clamp(46px,calc(14vh_-_50px),58px)] lg:w-[clamp(46px,calc(14vh_-_50px),58px)]`}>
              <Ring kind={g.kind} n={g.items.length} seen={n} />
              <Disc k={g.key} cover={covers[g.key]} />
            </span>
            <span className="mt-1.5 w-full px-0.5 text-center">
              <Caption g={g} dim={done} />
            </span>
          </a>
        )
      })}

    </nav>
  )
}
