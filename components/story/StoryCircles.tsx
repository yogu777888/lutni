'use client'

import { useEffect, useState } from 'react'
import type { CircleKind, StoryGroup } from '@/lib/story-groups'
import { openStory } from './events'
import { circleQueue, seenCount } from './queue'
import { readSeen, SEEN_EVENT } from './seen'
import { PLATE } from '../LeagueMark'
import { GroupMark } from './GroupMark'
import { ringArcs } from '../shell/StoryRing'
import { StorySymbol } from './StorySymbol'
import { Icon } from '../Icon'

/**
 * Истории — круглые входы в подборки: круг, залитый оттенком подборки, знак категории (StorySymbol) и кольцо
 * просмотренности тем же оттенком — как в правой панели на компьютере. Диаметр — 58px (на невысоком окне меньше), под
 * кругом — только название: число матчей — в подсказке.
 */
const D = 76
/** Кольцо 2px по радиусу 36.5: между кольцом и диском — 3px воздуха. Не смотрели — оттенком подборки (`toneOf`),
 *  «Идут» — красное, просмотрено — тусклое. */
const R = 36.5
const SEEN = 'rgb(255 255 255 / 0.22)'

/**
 * Кольцо дугами по матчу, как в Instagram (`ringArcs`: от 2 до 12 матчей, зазор 3px, концы круглые); просмотренные — первые
 * `seen` дуг, приглушённые. Больше 12 — одним контуром, просмотренная доля приглушённая от верха по часовой: из 15–30 дуг
 * вышла бы рябь.
 */
function Ring({ n, seen, tone }: { kind: CircleKind; n: number; seen: number; tone: string }) {
  const color = tone
  const done = Math.round((seen / Math.max(1, n)) * 100)
  // без `vector-effect: non-scaling-stroke`: с ним Chrome считал штрихи в пикселях экрана, а не в долях `pathLength` —
  // дуги выходили неровными, а сверху торчал обрубок; толщина 2,6 единицы — 2px на круге 58px
  const c = { cx: D / 2, cy: D / 2, r: R, fill: 'none', strokeWidth: (2 * D) / 58, pathLength: 100 } as const
  // зазор ~3px на экране: круг 58px из 76 единиц, окружность r 36,5 — ~229 единиц
  const segs = ringArcs(n, 12, c, (3 * D) / 58, c.strokeWidth)
  if (segs)
    return (
      <svg aria-hidden viewBox={`0 0 ${D} ${D}`} className="absolute inset-0 h-full w-full overflow-visible">
        {segs.map((d, i) => (
          <path key={i} d={d} fill="none" strokeWidth={c.strokeWidth} strokeLinecap="round" style={{ stroke: i < seen ? SEEN : color }} />
        ))}
      </svg>
    )
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

/**
 * Подпись — в одну строку, короткое название (`short`: «Главные»; в две строки ряд был неровным, под ним — пустая строка);
 * слева — знак подборки 12px цветом подписи (владелец: «слева от названий историй тоже иконки ставить?»): в круге — эмблема
 * команды, и о чём подборка, говорит знак. Число матчей — в подсказке кружка.
 */
function Caption({ g, dim }: { g: StoryGroup; dim: boolean }) {
  const live = g.kind === 'live' || g.key === 'live'
  return (
    <span className={`flex items-center justify-center gap-[3px] text-[12px] font-semibold leading-tight ${dim ? 'text-white/70' : 'text-white'}`}>
      <StorySymbol k={live ? 'live' : g.key} tone="currentColor" className="h-3 w-3 shrink-0" />
      <span className="min-w-0 truncate">{g.short ?? g.label}</span>
    </span>
  )
}

/**
 * «▶» справа от заголовка «Подборки дня» (владелец: «можно иконку плэй сделать справа от заголовка подборки дня?»; была слева) (владелец: «на мобильном слева от подборки дня иконку плэй типа сделать?»): истории
 * подряд с первой подборки, где есть непросмотренное, — как кнопка «слушать» у плейлиста; всё просмотрено — с начала.
 * Знак 20px цветом заголовка без подложки: белый круг владельцу не понравился («мне не нравится иконка слева от подборки дня»).
 */
export function PlayAll({ groups }: { groups: StoryGroup[] }) {
  if (!groups.length) return null
  const play = (e: React.MouseEvent<HTMLButtonElement>) => {
    const seen = readSeen()
    const gi = Math.max(0, groups.findIndex((g) => seenCount(g, seen) < g.items.length))
    const { queue, startId } = circleQueue(groups, gi, seen, {})
    openStory({ id: startId, href: groups[gi].href, opener: e.currentTarget, queue })
  }
  return (
    <button
      type="button"
      onClick={play}
      aria-label="Смотреть подборки дня подряд"
      title="Смотреть подряд"
      className="-ml-1 grid h-8 w-8 shrink-0 place-items-center text-fg transition-transform active:scale-90"
    >
      <Icon k="play-fill" size={20} />
    </button>
  )
}

/** Цвет непросмотренных дуг — подложка кругов `PLATE`, как в панелях; «Идут» — красным `LIVE`. Ниже по истории git — цвета подборок. */
function toneOf(g: StoryGroup) {
  // кольца — цветом подложки кругов, как в панелях (владелец: «кружки на историях везде сделаем как цвет подложки»)
  // «Идут» — тоже светлым (владелец: «давай у лайв матчей кружочки тоже белыми сделаем?»)
  return PLATE
}

/** Диск: светлая подложка с эмблемой или знаком (`GroupMark`); своя картинка из public/stories/<ключ>.* — вместо всего этого. */
function Disc({ g, cover }: { g: StoryGroup; cover?: string }) {
  return (
    <span
      className="absolute inset-[5px] grid place-items-center overflow-hidden rounded-full"
      style={{
        background: cover ? `center / cover no-repeat url("${cover}")` : undefined,
      }}
    >
      {cover ? null : <GroupMark g={g} className="h-1/2 w-1/2" crest="h-[60%] w-[60%]" />}
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

  // ряд на фоне, без карточки: первый круг — ровно по левому краю карточек ниже (`-ml-2.5` — поле кружка 80px вокруг
  // круга 58px), справа ряд листается до края экрана (обёртка в DayView — `-mr-4`), без затухания
  return (
    <nav aria-label="Истории дня" className="scrollbar-none -ml-2.5 flex gap-1 overflow-x-auto pb-1 pr-4 pt-1.5">
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
            <span data-story-key={g.key} className={`relative block rounded-full transition-transform duration-300 group-hover:-translate-y-0.5 group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-fg group-active:scale-95 h-[58px] w-[58px] lg:h-[clamp(46px,calc(14vh_-_50px),58px)] lg:w-[clamp(46px,calc(14vh_-_50px),58px)]`}>
              <Ring kind={g.kind} n={g.items.length} seen={n} tone={toneOf(g)} />
              <Disc g={g} cover={covers[g.key]} />
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
