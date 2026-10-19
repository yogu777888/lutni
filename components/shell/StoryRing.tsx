'use client'

import { seenKey } from '../story/seen'

/** Не смотрели — белое (лаймом 13 колец разом были ярче всего на экране; владелец: «сделай непросмотренные белыми»),
 * просмотрено — приглушённый белый. Лайм — только кнопкам и выгодным кэфам. */
const WHITE = 'rgb(255 255 255 / 0.9)'
const SEEN = 'rgb(255 255 255 / 0.22)'
/** «Сейчас в игре» — красное, как кружок «В игре» на телефоне (`StoryCircles`); у лиг с идущими матчами — белое */
const LIVE = '#ff5c63'
/**
 * Кольцо вокруг круга в боковых панелях, как вокруг сторис (владелец: «индикаторы как вокруг сторис вокруг категорий и
 * лиг»): клик по кругу открывает сторис — матчи подборки или лиги подряд; непросмотренные — белые, просмотренные —
 * серые. Кольцо всегда сплошное, просмотренная доля сереет от верха по часовой (сегменты по матчу — 8 штрихов с зазорами
 * на круге 36px — вблизи читались пунктиром и значком загрузки; владелец заметил при увеличении). Отметки —
 * те же, что у сторис (`seenKey(группа, матч)` в localStorage). Родитель — `relative`, круг 36px; кольцо — на 3px снаружи.
 */
export function StoryRing({ group, ids, seen, muted = false, live = false }: { group: string; ids: number[]; seen: Set<string>; muted?: boolean; live?: boolean }) {
  const n = ids.length
  const UNSEEN = live ? LIVE : WHITE
  if (!n) return null
  const flags = ids.map((id) => seen.has(seenKey(group, id)))
  const c = { cx: 21, cy: 21, r: 20, fill: 'none', strokeWidth: 2, pathLength: 100 } as const
  // muted — серое кольцо целиком (турниры «Завтра»: не спорят с сегодняшними)
  const done = muted ? 100 : Math.round((flags.filter(Boolean).length / n) * 100)
  const body = (
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
