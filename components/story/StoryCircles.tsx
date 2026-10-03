'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { artFor, CIRCLE_BG } from '@/lib/story-art'
import type { CircleKind, StoryGroup } from '@/lib/story-groups'
import { LogoMark } from '../Logo'
import { ArtIcon } from './ArtIcon'
import { openStory } from './events'
import { circleQueue, seenCount } from './queue'
import { readSeen, SEEN_EVENT } from './seen'

const SIZE = 68
const R = 31.5
const C = 2 * Math.PI * R

/**
 * Кольцо из сегментов — по одному на матч кружка. Просмотренные гаснут по порядку, от верха
 * по часовой стрелке (как статусы в мессенджерах), а не вразброс: кольцо показывает, сколько
 * из кружка уже посмотрели, а следующий тап продолжит с первого непросмотренного.
 */
function Ring({ kind, n, seen }: { kind: CircleKind; n: number; seen: number }) {
  const step = C / n
  const gap = n > 1 ? Math.min(4, step / 3) : 0
  // цвет кольца — только «не смотрели» (лайм) и LIVE (красный); просмотренное — серое
  const color = kind === 'live' ? 'var(--color-live)' : 'var(--color-acid)'
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
      {Array.from({ length: n }, (_, i) => {
        const s = i < seen
        return (
          <circle
            key={i}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke={s ? 'rgb(255 255 255 / 0.14)' : color}
            strokeWidth={s ? 1.5 : 2.5}
            strokeDasharray={`${step - gap} ${C - step + gap}`}
            strokeDashoffset={-(i * step + gap / 2)}
          />
        )
      })}
    </svg>
  )
}

function Caption({ g, dim }: { g: StoryGroup; dim: boolean }) {
  const text = dim ? 'text-dim' : 'text-fg'
  // подпись в одну строку: кружок шире подписи «#идут деньги», ряд ровный
  if (g.label.startsWith('#')) {
    return (
      <span className={`block truncate ${text}`}>
        <span className="text-mute">#</span>
        {g.label.slice(1)}
      </span>
    )
  }
  return <span className={`block truncate ${text}`}>{g.label}</span>
}

/**
 * Обложка кружка: своя картинка из public/stories/<ключ>.* или арт тега —
 * свечение на тёмной основе, зерно и белая иконка (lib/story-art.ts).
 */
function CoverArt({ k, cover, children }: { k: string; cover?: string; children?: React.ReactNode }) {
  const art = artFor(k)
  return (
    <span
      className="art-grain absolute inset-[5px] grid place-items-center overflow-hidden rounded-full ring-1 ring-inset ring-white/10"
      style={{ background: cover ? `center / cover no-repeat url("${cover}")` : CIRCLE_BG }}
    >
      {cover ? null : (children ?? <ArtIcon name={art.icon} className="relative z-[1] h-[26px] w-[26px] text-white [filter:drop-shadow(0_2px_6px_rgb(0_0_0/0.4))]" />)}
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
    <nav aria-label="Истории дня" className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 pt-0.5 [mask-image:linear-gradient(to_right,#000_calc(100%-40px),transparent)] sm:mx-0 sm:px-0 sm:[mask-image:none]">
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
            className="group flex w-[80px] shrink-0 flex-col items-center rounded-xl outline-offset-2"
          >
            <span className="relative block transition-transform duration-300 group-hover:-translate-y-0.5 group-active:scale-95" style={{ width: SIZE, height: SIZE }}>
              <Ring kind={g.kind} n={g.items.length} seen={n} />
              <CoverArt k={g.key} cover={covers[g.key]} />
              {g.kind === 'live' ? (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-[5px] bg-live px-1.5 text-[9px] font-bold leading-[15px] tracking-wide text-white ring-2 ring-ink">
                  LIVE
                </span>
              ) : null}
            </span>
            <span className="mt-1.5 w-full text-center text-[12px] font-medium leading-tight">
              <Caption g={g} dim={done} />
            </span>
          </a>
        )
      })}

      <Link href="/tags" prefetch={false} className="group flex w-[80px] shrink-0 flex-col items-center rounded-xl" title="Все теги и что они значат">
        <span className="relative block transition-transform duration-300 group-hover:-translate-y-0.5" style={{ width: SIZE, height: SIZE }}>
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 h-full w-full" aria-hidden>
            <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="rgb(255 255 255 / 0.16)" strokeWidth="1.5" />
          </svg>
          <CoverArt k="all" cover={covers.all}>
            <LogoMark size={21} className="relative z-[1]" />
          </CoverArt>
        </span>
        <span className="mt-1.5 w-full truncate text-center text-[12px] font-medium leading-tight text-dim">Все теги</span>
      </Link>
    </nav>
  )
}
