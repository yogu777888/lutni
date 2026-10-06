'use client'

import { useEffect, useId, useState } from 'react'
import { artFor, artPic, CIRCLE_BG } from '@/lib/story-art'
import type { CircleKind, StoryGroup } from '@/lib/story-groups'
import { ArtIcon } from './ArtIcon'
import { openStory } from './events'
import { circleQueue, seenCount } from './queue'
import { readSeen, SEEN_EVENT } from './seen'

const SIZE = 68
/** Кольцо 2.5px по радиусу 32: до края 0.75px (сглаживание не обрезается), до обложки — 2.25px воздуха. */
const R = 32
const STROKE = 2.5
const C = 2 * Math.PI * R
/** Просмотренный сегмент: спокойный серый, но заметный — кольцо читается целым кругом. */
const SEEN_STROKE = 'var(--color-mute)'

/**
 * Кольцо из сегментов — по одному на матч кружка. Просмотренные гаснут по порядку, от верха
 * по часовой стрелке (как статусы в мессенджерах), а не вразброс: кольцо показывает, сколько
 * из кружка уже посмотрели, а следующий тап продолжит с первого непросмотренного.
 */
function Ring({ kind, n, seen }: { kind: CircleKind; n: number; seen: number }) {
  const step = C / n
  const gap = n > 1 ? Math.min(4, step / 3) : 0
  // своё имя градиента у каждого кольца: общее имя ломается, если первый кружок скрыт
  const id = `ring-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  // цвет кольца — только «не смотрели» и LIVE (красный); просмотренное — серое той же толщины: иначе кольцо из
  // толстых и тонких дуг выглядит кривым, а слишком бледный серый — недорисованным. «Не смотрели» — градиент
  // лайм → бирюза снизу слева вверх направо, как в Instagram, но цветами сайта: белое владельцу показалось скучным,
  // а тёплый градиент Instagram спорил бы с красным LIVE
  const color = kind === 'live' ? 'var(--color-live)' : `url(#${id})`
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 h-full w-full -rotate-90 overflow-visible" aria-hidden>
      {/* svg повёрнут на −90°, поэтому вектор (0,0) → (1,1) на экране идёт снизу слева вверх направо */}
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--color-acid)" />
          <stop offset="1" stopColor="#2ee6c9" />
        </linearGradient>
      </defs>
      {Array.from({ length: n }, (_, i) => (
        <circle
          key={i}
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke={i < seen ? SEEN_STROKE : color}
          strokeWidth={STROKE}
          strokeDasharray={`${step - gap} ${C - step + gap}`}
          strokeDashoffset={-(i * step + gap / 2)}
        />
      ))}
    </svg>
  )
}

function Caption({ g, dim }: { g: StoryGroup; dim: boolean }) {
  // подпись в одну строку, без решётки и с большой буквы («Кэф упал»): кружок шире подписи, ряд ровный
  return <span className={`block truncate ${dim ? 'text-dim' : 'text-fg'}`}>{g.label}</span>
}

/** Значок темы: объёмная картинка владельца (public/story-icons), если есть, иначе плоский значок Phosphor. */
function Glyph({ k, tone }: { k: string; tone: string }) {
  const pic = artPic(k)
  if (pic) {
    // eslint-disable-next-line @next/next/no-img-element
    // лёгкая тень отделяет белое стекло от светлых пятен эмблем
    return <img src={pic} alt="" aria-hidden decoding="async" className="relative h-10 w-10 drop-shadow-[0_1px_3px_rgb(0_0_0/0.5)]" />
  }
  return <ArtIcon name={artFor(k).icon} className={`relative h-[26px] w-[26px] ${tone}`} />
}

/**
 * Обложка кружка: своя картинка из public/stories/<ключ>.*, иначе — тёмный кружок со значком темы, во всех видах. Цвет
 * дают сами значки: размытые эмблемы клубов под ними владелец убрал — цвет на цвете, золотая звезда и янтарная стрелка
 * тонули в рыжих пятнах.
 */
function CoverArt({ k, cover }: { k: string; cover?: string }) {
  return (
    <span
      className="absolute inset-[5.5px] grid place-items-center overflow-hidden rounded-full"
      style={{ background: cover ? `center / cover no-repeat url("${cover}")` : CIRCLE_BG }}
    >
      {cover ? null : <Glyph k={k} tone="text-fg" />}
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
            className="group flex w-[80px] shrink-0 flex-col items-center focus-visible:outline-none"
          >
            {/* фокус с клавиатуры — белым кругом вокруг кружка, а не рамкой вокруг кружка с подписью */}
            <span
              className="relative block rounded-full transition-transform duration-300 group-hover:-translate-y-0.5 group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-fg group-active:scale-95"
              style={{ width: SIZE, height: SIZE }}
            >
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

    </nav>
  )
}
