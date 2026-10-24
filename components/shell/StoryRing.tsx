'use client'

import { seenKey } from '../story/seen'

/** Не смотрели — белое (лаймом 13 колец разом были ярче всего на экране; владелец: «сделай непросмотренные белыми»),
 * просмотрено — приглушённый белый. Лайм — только кнопкам и выгодным кэфам. */
const WHITE = 'rgb(255 255 255 / 0.9)'
const SEEN = 'rgb(255 255 255 / 0.22)'
/** «Сейчас в игре» — красное, как кружок «В игре» на телефоне (`StoryCircles`); у лиг с идущими матчами — белое */
const LIVE = '#ff5c63'
/**
 * Сегменты кольца, как в Instagram (владелец: «на кружках на историях сделать разделения если больше 1 истории? как в
 * инсте»): по дуге на матч от верха по часовой, между дугами — зазор `gap` (в долях `pathLength` 100). Матчей больше
 * `max` — одно сплошное кольцо: из 15–30 дуг выходила рябь, а на круге 36px уже 8 штрихов читались пунктиром.
 * Возвращает дуги `[начало, длина]` или `null` — рисовать сплошным.
 */
export function ringSegments(n: number, max: number, gap: number): [number, number][] | null {
  if (n < 2 || n > max) return null
  const step = 100 / n
  return Array.from({ length: n }, (_, i) => [i * step + gap / 2, step - gap])
}

/** Дуга `[начало, длина]` для `<circle pathLength={100}>`, повёрнутого на −90° (начало — сверху). */
export const arc = ([start, len]: [number, number]) => ({ strokeDasharray: `${len} ${100 - len}`, strokeDashoffset: -start })

/**
 * Кольцо вокруг круга в боковых панелях, как вокруг сторис (владелец: «индикаторы как вокруг сторис вокруг категорий и
 * лиг»): клик по кругу открывает сторис — матчи подборки или лиги подряд; непросмотренные — белые, просмотренные —
 * серые. Матчей от 2 до 8 — дугами по матчу (`ringSegments`, зазор 2px), больше — сплошное кольцо, просмотренная доля
 * сереет от верха по часовой. Отметки — те же, что у сторис (`seenKey(группа, матч)` в localStorage). Родитель —
 * `relative`, круг 36px; кольцо — на 3px снаружи.
 */
export function StoryRing({ group, ids, seen, muted = false, live = false }: { group: string; ids: number[]; seen: Set<string>; muted?: boolean; live?: boolean }) {
  const n = ids.length
  const UNSEEN = live ? LIVE : WHITE
  if (!n) return null
  const flags = ids.map((id) => muted || seen.has(seenKey(group, id)))
  const c = { cx: 21, cy: 21, r: 20, fill: 'none', strokeWidth: 2, pathLength: 100 } as const
  // зазор 2px: длина окружности r 20 — ~126px
  const segs = ringSegments(n, 8, (2 / (2 * Math.PI * 20)) * 100)
  // muted — серое кольцо целиком (турниры «Завтра»: не спорят с сегодняшними)
  const done = muted ? 100 : Math.round((flags.filter(Boolean).length / n) * 100)
  const body = segs ? (
    segs.map((s, i) => <circle key={i} {...c} stroke={flags[i] ? SEEN : UNSEEN} {...arc(s)} />)
  ) : (
    <>
      <circle {...c} stroke={done > 0 ? SEEN : UNSEEN} />
      {done > 0 && done < 100 ? <circle {...c} stroke={UNSEEN} strokeLinecap="round" strokeDasharray={`${100 - done} ${done}`} strokeDashoffset={-done} /> : null}
    </>
  )
  return (
    <svg aria-hidden viewBox="0 0 42 42" className="pointer-events-none absolute -inset-[3px] h-[42px] w-[42px] -rotate-90 overflow-visible">
      {body}
    </svg>
  )
}
