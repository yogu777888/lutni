'use client'

import { useEffect, useState } from 'react'
import { formatTime } from '@/lib/format'
import { artFor, artPic } from '@/lib/story-art'
import type { CircleKind, StoryGroup } from '@/lib/story-groups'
import { TeamLogo } from '../TeamLogo'
import { ArtIcon } from './ArtIcon'
import { openStory } from './events'
import { circleQueue, seenCount } from './queue'
import { readSeen, SEEN_EVENT } from './seen'

/** Карточка истории: 84×92, вертикальная, как истории в Яндекс Картах. */
const W = 84
const H = 92
const RING_MASK = 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)'

/**
 * Рамка карточки — цвет говорит, смотрели ли историю: «не смотрели» — градиент лайм → бирюза снизу слева вверх
 * направо (как кольца в Instagram, но цветами сайта), LIVE — красная, всё просмотрено — серая той же толщины.
 * Рамка — кольцо с прозрачной серединой (маска): между рамкой и карточкой виден фон страницы.
 */
function Frame({ kind, done }: { kind: CircleKind; done: boolean }) {
  const bg = done ? 'var(--color-mute)' : kind === 'live' ? 'var(--color-live)' : 'linear-gradient(45deg, var(--color-acid), #2ee6c9)'
  return (
    <span
      aria-hidden
      className="absolute inset-0 rounded-[16px] p-[2.5px]"
      style={{ background: bg, mask: RING_MASK, WebkitMask: RING_MASK, maskComposite: 'exclude', WebkitMaskComposite: 'xor' }}
    />
  )
}

function Caption({ g, dim }: { g: StoryGroup; dim: boolean }) {
  // подпись в одну строку, без решётки и с большой буквы («Кэф упал»): кружок шире подписи, ряд ровный
  return <span className={`block truncate ${dim ? 'text-dim' : 'text-fg'}`}>{g.label}</span>
}

/** Значок темы: объёмная картинка владельца (public/story-icons), если есть, иначе плоский значок Phosphor. */
function Glyph({ k }: { k: string }) {
  const pic = artPic(k)
  // eslint-disable-next-line @next/next/no-img-element
  if (pic) return <img src={pic} alt="" aria-hidden decoding="async" className="h-5 w-5 drop-shadow-[0_1px_2px_rgb(0_0_0/0.5)]" />
  return <ArtIcon name={artFor(k).icon} className="h-5 w-5 text-fg" />
}

/**
 * Обложка — превью матча, который откроется первым: эмблемы, время начала или счёт с минутой, внизу значок темы.
 * Графитовая, как карточка «Главных матчей». Своя картинка из public/stories/<ключ>.* — важнее превью.
 */
function Cover({ g, cover }: { g: StoryGroup; cover?: string }) {
  const c = g.cover
  return (
    <span
      className="on-dark absolute inset-[4.5px] flex flex-col items-center justify-between overflow-hidden rounded-[12px] px-1 pb-1.5 pt-[7px]"
      style={{ background: cover ? `center / cover no-repeat url("${cover}")` : 'radial-gradient(120% 80% at 30% 0%, #2a3441, #11161d)' }}
    >
      {cover || !c ? (
        cover ? null : <span className="grid flex-1 place-items-center"><Glyph k={g.key} /></span>
      ) : (
        <>
          <span className="flex gap-1">
            <TeamLogo name={c.home.name} src={c.home.logo} size={20} />
            <TeamLogo name={c.away.name} src={c.away.logo} size={20} />
          </span>
          <span className="flex flex-col items-center leading-none">
            <span className="num text-[16px] font-bold tracking-[-0.02em] text-fg">{c.score ? `${c.score.home}:${c.score.away}` : formatTime(c.ts)}</span>
            <span className={`mt-1 text-[10px] ${c.live ? 'font-semibold text-live' : 'text-dim'}`}>{c.live ? c.minute : c.finished ? 'итог' : 'мск'}</span>
          </span>
          <Glyph k={g.key} />
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
            className="group flex w-[84px] shrink-0 flex-col items-center focus-visible:outline-none"
          >
            {/* фокус с клавиатуры — рамкой вокруг карточки, а не вокруг карточки с подписью */}
            <span
              className="relative block rounded-[16px] transition-transform duration-300 group-hover:-translate-y-0.5 group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-fg group-active:scale-95"
              style={{ width: W, height: H }}
            >
              <Frame kind={g.kind} done={done} />
              <Cover g={g} cover={covers[g.key]} />
              {g.kind === 'live' ? (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-[5px] bg-live px-1.5 text-[9px] font-bold leading-[15px] tracking-wide text-white ring-2 ring-brand">
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
