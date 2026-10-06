'use client'

import { useEffect, useState } from 'react'
import { artFor, artPic, CIRCLE_BG } from '@/lib/story-art'
import type { CircleArt, CircleKind, StoryGroup } from '@/lib/story-groups'
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
function Ring({ kind, n, seen, light }: { kind: CircleKind; n: number; seen: number; light: boolean }) {
  const step = C / n
  const gap = n > 1 ? Math.min(4, step / 3) : 0
  // цвет кольца — только «не смотрели» и LIVE (красный); просмотренное — серое той же толщины: иначе кольцо из
  // толстых и тонких дуг выглядит кривым, а слишком бледный серый — недорисованным. «Не смотрели» — лайм, а при
  // цветных обложках «Афиши» — белое: лайм у нас «выгодно» и главные кнопки, на цветном он спорит с ними
  const color = kind === 'live' ? 'var(--color-live)' : light ? 'var(--color-fg)' : 'var(--color-acid)'
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 h-full w-full -rotate-90 overflow-visible" aria-hidden>
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

/**
 * Эмблема клуба на обложке кружка — увеличенная и сильно размытая: от неё остаются только цвета клуба, как фон из
 * обложки альбома в Apple Music. Детали не нужны, поэтому маленькие эмблемы из API здесь не выглядят мутными.
 * Приглушена (яркость 65%, 85%): светлые эмблемы иначе дают светлое пятно, и белый значок на нём теряется.
 */
function Smear({ src, side }: { src: string; side: 'left' | 'right' }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden
      decoding="async"
      className={`absolute top-1/2 h-[95%] w-[95%] -translate-y-1/2 object-contain opacity-85 blur-[7px] brightness-[0.65] saturate-[1.7] ${side === 'left' ? '-left-[20%]' : '-right-[20%]'}`}
    />
  )
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
 * Обложка кружка: своя картинка из public/stories/<ключ>.*; в «Афише» и «Эмблемах» — значок темы поверх сильно
 * размытых эмблем матча этой истории (цвета клубов: хозяева слева, гости справа) — видно и тему, и что кружок
 * «живой», как история; иначе — плоский кружок со значком (lib/story-art.ts).
 */
function CoverArt({ k, cover, match, children }: { k: string; cover?: string; match?: CircleArt; children?: React.ReactNode }) {
  if (!cover && match) {
    // без цветов клубов («Эмблемы») — почти чёрная основа: на сером размытые эмблемы смешивались в грязные пятна,
    // а на чёрном светятся цветом
    const home = match.colors?.home ?? '#1b1a17'
    const away = match.colors?.away ?? '#0e0e0c'
    return (
      <span
        className="absolute inset-[5.5px] grid place-items-center overflow-hidden rounded-full"
        style={{ background: `linear-gradient(in oklch 135deg, ${home} 20%, ${away} 80%)` }}
      >
        {match.home.logo ? <Smear src={match.home.logo} side="left" /> : null}
        {match.away.logo ? <Smear src={match.away.logo} side="right" /> : null}
        {/* затемнение к центру — под белый значок на любых цветах, и на светлых эмблемах тоже */}
        <span className="absolute inset-0 bg-[radial-gradient(circle,rgb(0_0_0/0.6),rgb(0_0_0/0.22)_75%)]" />
        <Glyph k={k} tone="text-fg" />
      </span>
    )
  }
  return (
    <span
      className="absolute inset-[5.5px] grid place-items-center overflow-hidden rounded-full ring-1 ring-inset ring-edge"
      style={{ background: cover ? `center / cover no-repeat url("${cover}")` : CIRCLE_BG }}
    >
      {cover ? null : (children ?? <Glyph k={k} tone="text-chalk" />)}
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
  art,
}: {
  groups: StoryGroup[]
  covers?: Record<string, string>
  /** «Афиша»: матч на обложке каждого кружка (DayView, coverMatches) — эмблемы на цветах клубов, кольца белые */
  art?: Record<string, CircleArt>
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
              <Ring kind={g.kind} n={g.items.length} seen={n} light={Boolean(art)} />
              <CoverArt k={g.key} cover={covers[g.key]} match={art?.[g.key]} />
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
