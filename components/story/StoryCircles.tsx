'use client'

import { useEffect, useState } from 'react'
import { artFor, artPic } from '@/lib/story-art'
import type { CircleKind, StoryGroup } from '@/lib/story-groups'
import { TeamLogo } from '../TeamLogo'
import { ArtIcon } from './ArtIcon'
import { openStory } from './events'
import { circleQueue, seenCount } from './queue'
import { readSeen, SEEN_EVENT } from './seen'

/**
 * Карточка истории — вертикальная, как истории в Яндекс Картах: 94×103 (на телефоне и высоком окне компьютера);
 * на невысоком окне компьютера (ниже 800px) — 84×92, иначе первый экран не влезает. Пропорции одинаковые, поэтому
 * рамка — одна и та же SVG-картинка, растянутая без искажений. Размеры — CSS-переменными на ссылке (`SIZES`).
 */
const W = 84
const H = 92
const SIZES =
  '[--sw:94px] [--sh:103px] [--crest:24px] [--icon:40px] lg:[@media(max-height:799px)]:[--sw:84px] lg:[@media(max-height:799px)]:[--sh:92px] lg:[@media(max-height:799px)]:[--crest:20px] lg:[@media(max-height:799px)]:[--icon:42px]'
/** Цвета рамки: не смотрели — лайм, LIVE — красный, просмотрено — приглушённый светло-серый. */
const UNSEEN = 'rgb(200 255 101 / 0.8)'
const LIVE = 'rgb(255 100 109 / 0.9)'
const SEEN = 'rgb(226 234 243 / 0.45)'

/**
 * Рамка 2px — один контур, без двойных рамок и свечения. Просмотренная доля — серая, остальное — цветом истории:
 * так видно, сколько матчей подборки уже посмотрели, и не нужно рисовать по сегменту на каждый из 15–30 матчей.
 * Контур начинается у левого верхнего угла и идёт по часовой стрелке.
 */
function Frame({ kind, n, seen }: { kind: CircleKind; n: number; seen: number }) {
  const color = kind === 'live' ? LIVE : UNSEEN
  const done = Math.round((seen / Math.max(1, n)) * 100)
  const box = { x: 1, y: 1, width: W - 2, height: H - 2, rx: 15, fill: 'none', strokeWidth: 2, pathLength: 100, vectorEffect: 'non-scaling-stroke' } as const
  return (
    <svg aria-hidden viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full overflow-visible">
      <rect {...box} stroke={done > 0 ? SEEN : color} />
      {done > 0 && done < 100 ? <rect {...box} stroke={color} strokeDasharray={`${100 - done} ${done}`} strokeDashoffset={-done} /> : null}
    </svg>
  )
}

const MATCH_WORDS = ['матч', 'матча', 'матчей'] as const
const plural = (n: number) => {
  const m10 = n % 10
  const m100 = n % 100
  return MATCH_WORDS[m10 === 1 && m100 !== 11 ? 0 : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 1 : 2]
}

function Caption({ g, dim }: { g: StoryGroup; dim: boolean }) {
  // подпись в одну строку, без решётки и с большой буквы («Кэф упал»): кружок шире подписи, ряд ровный
  return <span className={`block truncate ${dim ? 'text-dim' : 'text-fg'}`}>{g.label}</span>
}

/** Значок темы: объёмная картинка владельца (public/story-icons), если есть, иначе плоский значок Phosphor. */
function Glyph({ k }: { k: string }) {
  const pic = artPic(k)
  // eslint-disable-next-line @next/next/no-img-element
  if (pic) return <img src={pic} alt="" aria-hidden decoding="async" className="h-[var(--icon)] w-[var(--icon)] drop-shadow-[0_1px_2px_rgb(0_0_0/0.35)]" />
  return <ArtIcon name={artFor(k).icon} className="h-7 w-7 text-fg" />
}

/**
 * Обложка — подборка, а не один матч: сверху две эмблемы из разных матчей, в центре —
 * крупный значок темы, снизу — сколько матчей внутри. Графитовая, как карточка «Главных матчей».
 * Своя картинка из public/stories/<ключ>.* — вместо всего этого.
 */
function Cover({ g, cover }: { g: StoryGroup; cover?: string }) {
  const crests = g.crests ?? []
  return (
    <span
      className="on-dark absolute inset-[4px] flex flex-col items-center justify-between overflow-hidden rounded-[12px] pb-2 pt-2"
      style={{ background: cover ? `center / cover no-repeat url("${cover}")` : 'linear-gradient(180deg, #263443, #17212c)' }}
    >
      {cover ? null : (
        <>
          {/* не больше двух эмблем, рядом и без перекрытия — три мелкие было не разглядеть */}
          {/* на невысоком окне компьютера карточка меньше — эмблемы там были бы мелкими, их нет совсем */}
          <span className="flex h-[var(--crest)] items-center gap-1.5 lg:[@media(max-height:799px)]:hidden">
            {crests.map((c) => (
              <TeamLogo key={c.name} name={c.name} src={c.logo} size="var(--crest)" />
            ))}
          </span>
          <span className="grid flex-1 place-items-center">
            <Glyph k={g.key} />
          </span>
          {/* у LIVE — красная точка вместо отдельной плашки: плашка закрывала бы счётчик */}
          <span className="num flex items-center gap-1 text-[12px] font-semibold leading-none text-fg/80">
            {g.kind === 'live' ? <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-live" aria-hidden /> : null}
            {g.items.length} {plural(g.items.length)}
          </span>
        </>
      )}
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
    <nav aria-label="Истории дня" className="scrollbar-none -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 pt-1.5 [mask-image:linear-gradient(to_right,#000_calc(100%-40px),transparent)] sm:mx-0 sm:px-0 sm:[mask-image:none]">
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
            className={`group flex w-[var(--sw)] shrink-0 flex-col items-center focus-visible:outline-none ${SIZES}`}
          >
            {/* фокус с клавиатуры — рамкой вокруг карточки, а не вокруг карточки с подписью */}
            <span
              className="relative block rounded-[16px] transition-transform duration-300 group-hover:-translate-y-0.5 group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-fg group-active:scale-95"
              style={{ width: 'var(--sw)', height: 'var(--sh)' }}
            >
              <Frame kind={g.kind} n={g.items.length} seen={n} />
              <Cover g={g} cover={covers[g.key]} />
            </span>
            <span className="mt-1.5 w-full px-0.5 text-center text-[12px] font-medium leading-tight">
              <Caption g={g} dim={done} />
            </span>
          </a>
        )
      })}

    </nav>
  )
}
