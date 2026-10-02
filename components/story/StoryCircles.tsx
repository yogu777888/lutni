'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { artBackground, artFor } from '@/lib/story-art'
import type { CircleKind, StoryGroup } from '@/lib/story-groups'
import { LogoMark } from '../Logo'
import { ArtIcon } from './ArtIcon'
import { openStory, type StoryQueueItem } from './events'
import { readSeen, SEEN_EVENT } from './seen'

const SIZE = 80
const R = 37
const C = 2 * Math.PI * R

/** Кольцо из сегментов — по одному на матч; просмотренные — серые (как статусы в мессенджерах). */
function Ring({ kind, seen }: { kind: CircleKind; seen: boolean[] }) {
  const n = seen.length
  const step = C / n
  const gap = n > 1 ? Math.min(4, step / 3) : 0
  const color = kind === 'live' ? 'var(--color-live)' : kind === 'hot' ? 'var(--color-hot)' : 'var(--color-acid)'
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
      {seen.map((s, i) => (
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
      ))}
    </svg>
  )
}

function Caption({ g, dim }: { g: StoryGroup; dim: boolean }) {
  const text = dim ? 'text-dim' : 'text-fg'
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
      className="art-grain absolute inset-[6px] grid place-items-center overflow-hidden rounded-full ring-1 ring-inset ring-white/10"
      style={{ background: cover ? `center / cover no-repeat url("${cover}")` : artBackground(art) }}
    >
      {cover ? null : (children ?? <ArtIcon name={art.icon} className="relative z-[1] h-[30px] w-[30px] text-white [filter:drop-shadow(0_2px_6px_rgb(0_0_0/0.4))]" />)}
    </span>
  )
}

/**
 * Кружки историй дня вместо полосы тегов: «В игре», «Топ дня» и по кружку на тег.
 * Это обычные ссылки (на страницу тега / матча) — для поисковиков и без JS;
 * клик открывает сторис матчей кружка, затем следующих кружков.
 */
export function StoryCircles({ groups, covers = {} }: { groups: StoryGroup[]; covers?: Record<string, string> }) {
  const [seen, setSeen] = useState<Set<number>>(() => new Set())

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
    // очередь: матчи этого кружка, потом следующих; один матч — один раз
    const queue: StoryQueueItem[] = []
    const ids = new Set<number>()
    for (const g of groups.slice(gi)) {
      for (const it of g.items) {
        if (ids.has(it.id)) continue
        ids.add(it.id)
        queue.push({ id: it.id, href: it.href, group: { key: g.key, label: g.label, kind: g.kind, cover: covers[g.key] }, focus: it.focus })
      }
    }
    const g = groups[gi]
    // как в соцсетях: начинаем с первого непросмотренного матча кружка
    const start = g.items.find((it) => !seen.has(it.id)) ?? g.items[0]
    openStory({ id: start.id, href: g.href, opener: e.currentTarget, queue })
  }

  return (
    <nav aria-label="Истории дня" className="scrollbar-none -mx-5 flex gap-3 overflow-x-auto px-5 pb-1 pt-0.5 [mask-image:linear-gradient(to_right,#000_calc(100%-40px),transparent)] sm:mx-0 sm:px-0">
      {groups.map((g, gi) => {
        const marks = g.items.map((it) => seen.has(it.id))
        const done = marks.every(Boolean)
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
              <Ring kind={g.kind} seen={marks} />
              <CoverArt k={g.key} cover={covers[g.key]} />
              {g.kind === 'live' ? (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-[5px] bg-live px-1.5 text-[9px] font-bold leading-[15px] tracking-wide text-white ring-2 ring-ink">
                  LIVE
                </span>
              ) : null}
            </span>
            <span className="mt-2 w-full text-center text-[13px] font-medium leading-tight">
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
            <LogoMark size={24} className="relative z-[1]" />
          </CoverArt>
        </span>
        <span className="mt-2 w-full truncate text-center text-[13px] font-medium leading-tight text-dim">Все теги</span>
      </Link>
    </nav>
  )
}
