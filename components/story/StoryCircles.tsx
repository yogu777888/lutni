'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { CircleKind, StoryGroup } from '@/lib/story-groups'
import { LogoMark } from '../Logo'
import { TeamLogo } from '../TeamLogo'
import { openStory, type StoryQueueItem } from './events'
import { readSeen, SEEN_EVENT } from './seen'

const SIZE = 76
const R = 35
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
          stroke={s ? 'rgb(255 255 255 / 0.16)' : color}
          strokeWidth={s ? 1.5 : 2.25}
          strokeDasharray={`${step - gap} ${C - step + gap}`}
          strokeDashoffset={-(i * step + gap / 2)}
        />
      ))}
    </svg>
  )
}

function Caption({ g, dim }: { g: StoryGroup; dim: boolean }) {
  const text = dim ? 'text-mute' : 'text-fg/90'
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
 * Кружки историй дня вместо полосы тегов: «В игре», «Топ дня» и по кружку на тег.
 * Это обычные ссылки (на страницу тега / матча) — для поисковиков и без JS;
 * клик открывает сторис матчей кружка, затем следующих кружков.
 */
export function StoryCircles({ groups }: { groups: StoryGroup[] }) {
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
        queue.push({ id: it.id, href: it.href, group: { key: g.key, label: g.label, kind: g.kind }, focus: it.focus })
      }
    }
    const g = groups[gi]
    // как в соцсетях: начинаем с первого непросмотренного матча кружка
    const start = g.items.find((it) => !seen.has(it.id)) ?? g.items[0]
    openStory({ id: start.id, href: g.href, opener: e.currentTarget, queue })
  }

  return (
    <nav aria-label="Истории дня" className="scrollbar-none -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 pt-0.5 sm:mx-0 sm:px-0">
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
            className="group flex w-[76px] shrink-0 flex-col items-center rounded-xl outline-offset-2"
          >
            <span className="relative block transition-transform duration-200 group-hover:scale-[1.04] group-active:scale-95" style={{ width: SIZE, height: SIZE }}>
              <Ring kind={g.kind} seen={marks} />
              <span className={`absolute inset-[6px] overflow-hidden rounded-full bg-panel ring-1 ring-inset ring-white/[0.06] ${done ? 'opacity-55' : ''}`}>
                <span className="absolute left-[7px] top-[8px]">
                  <TeamLogo name={g.cover.home.name} src={g.cover.home.logo} size={30} />
                </span>
                <span className="absolute bottom-[6px] right-[5px] rounded-full bg-panel p-[2px]">
                  <TeamLogo name={g.cover.away.name} src={g.cover.away.logo} size={30} />
                </span>
              </span>
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

      <Link href="/tags" prefetch={false} className="group flex w-[76px] shrink-0 flex-col items-center rounded-xl" title="Все теги и что они значат">
        <span className="relative block transition-transform duration-200 group-hover:scale-[1.04]" style={{ width: SIZE, height: SIZE }}>
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 h-full w-full" aria-hidden>
            <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="rgb(255 255 255 / 0.16)" strokeWidth="1.5" strokeDasharray="3 4" />
          </svg>
          <span className="absolute inset-[6px] flex items-center justify-center rounded-full bg-panel">
            <LogoMark size={26} />
          </span>
        </span>
        <span className="mt-1.5 w-full truncate text-center text-[12px] font-medium leading-tight text-mute">Все теги</span>
      </Link>
    </nav>
  )
}
