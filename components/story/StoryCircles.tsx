'use client'

import { useEffect, useState } from 'react'
import type { CircleKind, StoryGroup } from '@/lib/story-groups'
import { openStory } from './events'
import { circleQueue, seenCount } from './queue'
import { readSeen, SEEN_EVENT } from './seen'
import { discBackground, StorySymbol, symbolColor } from './StorySymbol'

/**
 * Истории — круглые входы в подборки, в духе iOS: светлый диск (#FFFFFF → #EAF2F8, тонкая граница, мягкая тень), в
 * центре — абстрактный знак категории (StorySymbol), вокруг — тонкое кольцо просмотренности. Диаметр — 76px на
 * компьютере, 68px на телефоне. Подпись и число матчей — под кругом.
 */
const D = 76
/** Кольцо 2px по радиусу 36.5: между кольцом и диском — 3px воздуха. */
const R = 36.5
/** Не смотрели — белое кольцо (на голубом фоне это и есть акцент), LIVE — красное, просмотрено — полупрозрачное. */
const UNSEEN = '#ffffff'
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
      <circle {...c} stroke={done > 0 ? SEEN : color} />
      {done > 0 && done < 100 ? <circle {...c} stroke={color} strokeLinecap="round" strokeDasharray={`${100 - done} ${done}`} strokeDashoffset={-done} /> : null}
    </svg>
  )
}

const MATCH_WORDS = ['матч', 'матча', 'матчей'] as const
const plural = (n: number) => {
  const m10 = n % 10
  const m100 = n % 100
  return MATCH_WORDS[m10 === 1 && m100 !== 11 ? 0 : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 1 : 2]
}

/** Подпись: название в одну строку и тихое число матчей под ним. */
function Caption({ g, dim }: { g: StoryGroup; dim: boolean }) {
  return (
    <>
      <span className={`block truncate text-[12.5px] font-semibold leading-tight ${dim ? 'text-white/70' : 'text-white'}`}>{g.label}</span>
      <span className="mt-0.5 block text-[11px] font-medium leading-tight text-white/75">
        {g.items.length} {plural(g.items.length)}
      </span>
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
export function StoryCircles({ groups, covers = {} }: { groups: StoryGroup[]; covers?: Record<string, string> }) {
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
            title={g.hint}
            aria-label={`${g.label}. ${g.hint}. Смотреть истории`}
            className="group flex w-[88px] shrink-0 flex-col items-center focus-visible:outline-none max-sm:w-[78px]"
          >
            {/* фокус с клавиатуры — белым кругом вокруг кружка */}
            <span className="relative block h-[76px] w-[76px] rounded-full transition-transform duration-300 group-hover:-translate-y-0.5 group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-fg group-active:scale-95 max-sm:h-[68px] max-sm:w-[68px] lg:[@media(max-height:719px)]:h-[64px] lg:[@media(max-height:719px)]:w-[64px]">
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
