'use client'

import { seenKey } from '../story/seen'

/** Не смотрели — белое (лаймом 13 колец разом были ярче всего на экране; владелец: «сделай непросмотренные белыми»),
 * просмотрено — приглушённый белый. Лайм — только кнопкам и выгодным кэфам. */
const WHITE = 'rgb(255 255 255 / 0.9)'
const SEEN = 'rgb(255 255 255 / 0.22)'
/** «Сейчас идут» — красное, как кружок «В игре» на телефоне (`StoryCircles`); у лиг с идущими матчами — белое */
export const LIVE = '#ff5c63'

/**
 * Круг подборки — графитовый, знак белый; цвет подборки — только в кольце, пока в ней есть непросмотренные матчи
 * (владелец: «есть ощущение что это ии продукт» — цвет стоял трижды: заливка, знак и кольцо одним оттенком, восемь
 * пастельных оттенков радугой; «давай» на «цвет — только в кольце, как у Instagram»). Просмотрел — кольцо серое.
 */
export const DISC = { background: 'rgb(255 255 255 / 0.1)' }
export const ICON = 'var(--color-fg)'

/**
 * Сегменты кольца, как в Instagram (владелец: «на кружках на историях сделать разделения если больше 1 истории? как в
 * инсте»): по дуге на матч от верха по часовой. Матчей больше `max` — одно сплошное кольцо (из 15–30 дуг выходила рябь),
 * тогда `null`.
 *
 * Дуги — готовыми путями `<path d="M … A …">`, посчитанными по углам, а не штрихами `stroke-dasharray` по `pathLength`
 * (владелец: «разрывы в кружках кривые»): Chrome рисует круг четырьмя кривыми Безье и длину по ним меряет неточно —
 * зазоры выходили разной ширины, а верхний — не по центру. Концы дуг круглые (`strokeLinecap="round"`), видимый зазор —
 * ровно `gap` пикселей: дуга короче на `gap + толщина`.
 */
export function ringArcs(n: number, max: number, c: { cx: number; cy: number; r: number }, gap: number, width: number): string[] | null {
  if (n < 2 || n > max) return null
  const step = (2 * Math.PI) / n
  const pad = (gap + width) / c.r / 2
  const pt = (a: number) => `${(c.cx + c.r * Math.sin(a)).toFixed(3)} ${(c.cy - c.r * Math.cos(a)).toFixed(3)}`
  return Array.from({ length: n }, (_, i) => {
    const a0 = i * step + pad
    const a1 = (i + 1) * step - pad
    return `M ${pt(a0)} A ${c.r} ${c.r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${pt(a1)}`
  })
}

/**
 * Кольцо вокруг круга в боковых панелях, как вокруг сторис (владелец: «индикаторы как вокруг сторис вокруг категорий и
 * лиг»): клик по кругу открывает сторис — матчи подборки или лиги подряд; непросмотренные — белые, просмотренные —
 * серые. Матчей от 2 до 12 — дугами по матчу (`ringArcs`, зазор 2,5px), больше — сплошное кольцо, просмотренная доля
 * сереет от верха по часовой. Отметки — те же, что у сторис (`seenKey(группа, матч)` в localStorage). Родитель —
 * `relative`, круг 36px; кольцо — на 3px снаружи.
 */
export function StoryRing({
  group,
  ids,
  seen,
  muted = false,
  live = false,
  color = null,
}: {
  group: string
  ids: number[]
  seen: Set<string>
  muted?: boolean
  live?: boolean
  /** цвет непросмотренных у турниров — главный цвет логотипа (`leagueColor`; владелец: «как у нас в графиках команд») */
  color?: string | null
}) {
  const n = ids.length
  const UNSEEN = live ? LIVE : (color ?? WHITE)
  if (!n) return null
  const flags = ids.map((id) => muted || seen.has(seenKey(group, id)))
  const c = { cx: 21, cy: 21, r: 20, fill: 'none', strokeWidth: 2, pathLength: 100 } as const
  // зазор 2,5px; до 12 дуг, как у кружков «Подборок дня» (владелец: «почему в ла лиге и лиге 1 нет разделителей» — в
  // туре 9–10 матчей, при max 8 кольцо было сплошным); svg повёрнут на −90° для сплошного кольца — дуги поворачиваем назад
  const segs = ringArcs(n, 12, c, 2.5, 2)
  // muted — серое кольцо целиком (турниры «Завтра»: не спорят с сегодняшними)
  const done = muted ? 100 : Math.round((flags.filter(Boolean).length / n) * 100)
  const body = segs ? (
    <g transform="rotate(90 21 21)">
      {segs.map((d, i) => (
        <path key={i} d={d} fill="none" strokeWidth={2} strokeLinecap="round" stroke={flags[i] ? SEEN : UNSEEN} />
      ))}
    </g>
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
