'use client'

import { seenKey } from '../story/seen'

/** Не смотрели — белое (лаймом 13 колец разом были ярче всего на экране; владелец: «сделай непросмотренные белыми»),
 * просмотрено — приглушённый белый. Лайм — только кнопкам и выгодным кэфам. */
const UNSEEN = 'rgb(255 255 255 / 0.9)'
const SEEN = 'rgb(255 255 255 / 0.22)'
/** До стольких матчей кольцо — сегментами, по одному на матч; больше — сплошное (сегменты на круге 36px — пунктир). */
const SEGMENTS = 8

/**
 * Кольцо вокруг круга в боковых панелях, как вокруг сторис (владелец: «индикаторы как вокруг сторис вокруг категорий и
 * лиг»): клик по кругу открывает сторис — матчи подборки или лиги подряд; непросмотренные — белые, просмотренные —
 * серые. До 8 матчей — сегменты, больше — сплошное кольцо, просмотренная доля сереет от верха по часовой. Отметки —
 * те же, что у сторис (`seenKey(группа, матч)` в localStorage). Родитель — `relative`, круг 36px; кольцо — на 3px снаружи.
 */
export function StoryRing({ group, ids, seen }: { group: string; ids: number[]; seen: Set<string> }) {
  const n = ids.length
  if (!n) return null
  const flags = ids.map((id) => seen.has(seenKey(group, id)))
  const c = { cx: 21, cy: 21, r: 20, fill: 'none', strokeWidth: 2, pathLength: 100 } as const
  let body: React.ReactNode
  if (n <= SEGMENTS) {
    // сегменты с зазором 4% (у одного матча — сплошное кольцо)
    const gap = n > 1 ? 4 : 0
    const len = 100 / n - gap
    body = flags.map((done, i) => (
      <circle key={i} {...c} strokeLinecap="round" stroke={done ? SEEN : UNSEEN} strokeDasharray={`${len} ${100 - len}`} strokeDashoffset={-(i * 100) / n - gap / 2} />
    ))
  } else {
    const done = Math.round((flags.filter(Boolean).length / n) * 100)
    body = (
      <>
        <circle {...c} stroke={done > 0 ? SEEN : UNSEEN} />
        {done > 0 && done < 100 ? <circle {...c} stroke={UNSEEN} strokeLinecap="round" strokeDasharray={`${100 - done} ${done}`} strokeDashoffset={-done} /> : null}
      </>
    )
  }
  return (
    <svg aria-hidden viewBox="0 0 42 42" className="pointer-events-none absolute -inset-[3px] h-[42px] w-[42px] -rotate-90 overflow-visible">
      {body}
    </svg>
  )
}
