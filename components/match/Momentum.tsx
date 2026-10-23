'use client'

import { useEffect, useRef, useState } from 'react'
import { momentumSummary } from '@/lib/match-notes'
import type { MomentumPoint } from '@/lib/sstats/ls'
import type { MatchEvent } from '@/lib/types'
import { TeamLogo } from '../TeamLogo'

type Side = { name: string; logo?: string | null }

const mins = (n: number) => `${n} мин`
const STEP = 5

/** Минута точки на общей оси: добавленное время тайма — в его последнюю минуту, второй тайм — с 46-й, овертайм — 91–120. */
function xOf(part: number, minute: number): number {
  if (part === 1) return Math.min(Math.max(minute, 1), 45)
  if (part === 2) return Math.min(Math.max(minute, 46), 90)
  return Math.min(Math.max(minute, 91), 120)
}

type Bucket = { from: number; to: number; x: number; h: number; a: number }

/**
 * Давление по 5 минут: у каждой команды своя линия — средняя сила её давления за отрезок, 0–100%
 * (`v` из `/Ls/GameMomentum`: > 0 — хозяева, < 0 — гости; 1 — самый сильный натиск).
 */
function buckets(points: MomentumPoint[]): Bucket[] {
  const acc = new Map<number, { h: number; a: number; n: number; hi: number }>()
  for (const p of points) {
    const x = xOf(p.part, p.minute)
    const i = Math.ceil(x / STEP) - 1
    const b = acc.get(i) ?? { h: 0, a: 0, n: 0, hi: x }
    b.h += Math.max(p.v, 0)
    b.a += Math.max(-p.v, 0)
    b.n++
    b.hi = Math.max(b.hi, x)
    acc.set(i, b)
  }
  return [...acc]
    .sort((a, b) => a[0] - b[0])
    .map(([i, b]) => {
      const from = i * STEP
      const to = Math.min((i + 1) * STEP, Math.max(b.hi, from + 1))
      return { from, to, x: (from + to) / 2, h: Math.round((b.h / b.n) * 100), a: Math.round((b.a / b.n) * 100) }
    })
}

/**
 * «Давление команд» (заголовок — у раздела) — по прототипу владельца из ChatGPT («а может так лучше?»): две линии,
 * у каждой команды своя, цветом клуба (`.club-stroke-h/-a`), точка — 5 минут матча, слева шкала силы давления в
 * процентах, под графиком — легенда и один вывод про последние 10 минут. Шкала минут — честная: 0′–90′, по ходу
 * несыгранное — пустым, «сейчас» — красной чертой. Голы — метка «эмблема 17′» над графиком и пунктир.
 * Сверху — «Сколько минут давила команда» с полосой и «ещё N мин — на равных» (`momentumSummary`).
 * Было: столбики вверх-вниз по минутам — владелец: «цифры … не совсем понятные».
 */
export function Momentum({ points, events, home, away, live }: { points: MomentumPoint[]; events: MatchEvent[]; home: Side; away: Side; live: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(0)
  const [act, setAct] = useState<number | null>(null)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    setW(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const sum = momentumSummary(points)
  const even = Math.max(0, points.length - sum.minutes.home - sum.minutes.away)
  const bs = buckets(points)
  const last = points[points.length - 1]
  const xNow = last ? xOf(last.part, last.minute) : 0
  const xMax = points.some((p) => p.part === 3) ? 120 : 90
  const top = Math.max(...bs.map((b) => Math.max(b.h, b.a)), 1)
  const yMax = Math.min(100, Math.max(40, Math.ceil(top / 20) * 20))
  const yTicks = Array.from({ length: yMax / 20 + 1 }, (_, i) => i * 20)

  // голы: ярус выше, если рядом (ближе 8 минут) уже стоит метка
  const goals: { x: number; side: 'home' | 'away'; label: string; level: number }[] = []
  for (const e of events) {
    if (e.kind !== 'goal' && e.kind !== 'penalty' && e.kind !== 'own-goal') continue
    const x = xOf(e.minute <= 45 ? 1 : e.minute <= 90 ? 2 : 3, e.minute)
    const near = goals.filter((g) => Math.abs(g.x - x) < 8).map((g) => g.level)
    let level = 0
    while (near.includes(level)) level++
    goals.push({ x, side: e.side, label: `${e.minute}${e.extra ? `+${e.extra}` : ''}′`, level })
  }
  const goalRows = goals.length ? Math.max(...goals.map((g) => g.level)) + 1 : 0

  // размеры графика: слева — подписи шкалы, сверху — метки голов, снизу — минуты
  const L = 40
  const R = 10
  const T = goalRows * 28 + 12
  const H = w >= 640 ? 220 : 180
  const B = 26
  const pw = Math.max(0, w - L - R)
  const X = (x: number) => L + (x / xMax) * pw
  const Y = (v: number) => T + H - (v / yMax) * H
  const narrow = w < 480
  const xTicks = xMax === 120 ? [0, 45, 90, 120] : narrow ? [0, 45, 90] : [0, 15, 30, 45, 60, 75, 90]
  const path = (k: 'h' | 'a') => bs.map((b, i) => `${i ? 'L' : 'M'}${X(b.x).toFixed(1)},${Y(b[k]).toFixed(1)}`).join(' ')
  const cur = act != null ? bs[act] : null
  const nowLabel = !last ? '' : last.part === 1 && last.minute > 45 ? `45+${last.minute - 45}′` : last.part === 2 && last.minute > 90 ? `90+${last.minute - 90}′` : `${last.minute}′`

  const pick = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * xMax
    let best = -1
    let d = Infinity
    bs.forEach((b, i) => {
      if (Math.abs(b.x - x) < d) {
        d = Math.abs(b.x - x)
        best = i
      }
    })
    setAct(best >= 0 && d <= STEP ? best : null)
  }

  // вывод под графиком: последние 10 минут — у кого давление выше (названия — в именительном: «у команды «X»»)
  const tail = bs.filter((b) => b.to > xNow - 10)
  const th = tail.reduce((s, b) => s + b.h, 0) / (tail.length || 1)
  const ta = tail.reduce((s, b) => s + b.a, 0) / (tail.length || 1)
  const lead = Math.abs(th - ta) < 8 ? null : th > ta ? home : away
  const note =
    points.length < 20
      ? null
      : lead
        ? `${live ? 'Последние 10 минут давление выше' : 'В последние 10 минут давление было выше'} у команды «${lead.name}».`
        : `${live ? 'Последние 10 минут' : 'Последние 10 минут матча'} — на равных.`

  const team = (t: Side, right: boolean) => (
    <span className={`flex min-w-0 items-center gap-2.5 ${right ? 'flex-row-reverse text-right' : ''}`}>
      <TeamLogo name={t.name} src={t.logo ?? null} size={28} />
      <span className="truncate text-[16px] font-semibold">{t.name}</span>
    </span>
  )
  const hv = sum.minutes.home
  const av = sum.minutes.away

  return (
    <div>
      <div className="flex items-center justify-between gap-4 border-b border-edge pb-3.5">
        {team(home, false)}
        {team(away, true)}
      </div>
      {/* сколько минут давила каждая, сколько — на равных: числа складываются в сыгранное время */}
      <div className="pb-1 pt-3.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className={`num shrink-0 text-[26px] leading-none ${hv >= av ? 'font-bold text-fg' : 'text-dim'}`}>{mins(hv)}</span>
          <span className="min-w-0 text-balance text-center text-[14px] leading-snug text-dim">Сколько минут давила команда</span>
          <span className={`num shrink-0 text-[26px] leading-none ${av >= hv ? 'font-bold text-fg' : 'text-dim'}`}>{mins(av)}</span>
        </div>
        <div aria-hidden className="mt-2 flex h-2 gap-1">
          <div className="flex flex-1 justify-end rounded-full bg-white/[0.06]">
            <div className={`club-bar-h rounded-full ${hv >= av ? '' : 'opacity-45'}`} style={{ width: `${(hv / (hv + av || 1)) * 100}%` }} />
          </div>
          <div className="flex-1 rounded-full bg-white/[0.06]">
            <div className={`club-bar-a h-full rounded-full ${av >= hv ? '' : 'opacity-45'}`} style={{ width: `${(av / (hv + av || 1)) * 100}%` }} />
          </div>
        </div>
        {/* «всего N мин» не пишем: с добавленным временем выходило «всего 61» при «сейчас 59′» */}
        {even > 0 ? <p className="mt-2 text-center text-[13px] text-mute">ещё {mins(even)} — на равных</p> : null}
      </div>

      <div ref={box} className="relative mt-4 border-t border-edge pt-2">
        {w ? (
          <svg width={w} height={T + H + B} className="block select-none" role="img" aria-label={`Давление команд по 5 минут, 0–100%: «${home.name}» и «${away.name}».`}>
            {/* шкала силы давления и сетка */}
            {yTicks.map((v) => (
              <g key={v}>
                <line x1={L} x2={L + pw} y1={Y(v)} y2={Y(v)} className={v ? 'stroke-white/[0.07]' : 'stroke-white/20'} strokeDasharray={v ? '3 4' : undefined} />
                <text x={L - 8} y={Y(v)} dy="0.35em" textAnchor="end" className="fill-mute text-[13px]">
                  {v}%
                </text>
              </g>
            ))}
            {/* перерыв — тонкой чертой */}
            <line x1={X(45)} x2={X(45)} y1={T} y2={T + H} className="stroke-white/10" />
            {/* по ходу — несыгранное пустым, «сейчас» — красной чертой */}
            {live && xNow < xMax ? (
              <g>
                <rect x={X(xNow)} y={T} width={Math.max(0, X(xMax) - X(xNow))} height={H} className="fill-white/[0.03]" />
                <line x1={X(xNow)} x2={X(xNow)} y1={T} y2={T + H} className="stroke-live" />
                <text x={X(xNow) + 6} y={T + 16} className="fill-live text-[13px] font-semibold">
                  сейчас {nowLabel}
                </text>
              </g>
            ) : null}
            {/* голы — пунктир через график */}
            {goals.map((g, i) => (
              <line key={i} x1={X(g.x)} x2={X(g.x)} y1={T - 8 - g.level * 28} y2={T + H} className="stroke-white/40" strokeDasharray="3 3" />
            ))}
            {/* наведённый отрезок */}
            {cur ? <line x1={X(cur.x)} x2={X(cur.x)} y1={T} y2={T + H} className="stroke-white/35" /> : null}
            {/* линии команд: сначала гости, сверху хозяева */}
            {(['a', 'h'] as const).map((k) => (
              <g key={k} className={k === 'h' ? 'club-stroke-h' : 'club-stroke-a'}>
                <path d={path(k)} fill="none" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                {bs.map((b, i) => (
                  <circle key={i} cx={X(b.x)} cy={Y(b[k])} r={act === i ? 5 : 3.5} className="club-dot" strokeWidth={2} />
                ))}
              </g>
            ))}
            {/* минуты матча */}
            {xTicks.map((m, i) => (
              <text key={m} x={X(m)} y={T + H + 19} textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'} className="fill-mute text-[13px]">
                {m}′
              </text>
            ))}
            <rect
              x={L}
              y={0}
              width={pw}
              height={T + H}
              fill="transparent"
              className="touch-pan-y"
              onPointerMove={pick}
              onPointerDown={pick}
              onPointerLeave={(e) => e.pointerType === 'mouse' && setAct(null)}
            />
          </svg>
        ) : (
          <div style={{ height: T + 180 + B }} />
        )}
        {/* метки голов: эмблема и минута — чей гол, видно по эмблеме */}
        {w
          ? goals.map((g, i) => {
              const t = g.side === 'home' ? home : away
              const x = X(g.x)
              const shift = x - L < 40 ? '' : L + pw - x < 40 ? '-translate-x-full' : '-translate-x-1/2'
              return (
                <span
                  key={i}
                  className={`pointer-events-none absolute flex items-center gap-1 whitespace-nowrap rounded-full bg-panel-3 py-0.5 pl-0.5 pr-2 text-[13px] font-semibold ${shift}`}
                  style={{ left: x, top: 8 + T - 34 - g.level * 28 }}
                >
                  <TeamLogo name={t.name} src={t.logo ?? null} size={18} />
                  {g.label}
                  <span className="sr-only">гол «{t.name}»</span>
                </span>
              )
            })
          : null}
        {/* подсказка: отрезок и сила давления обеих команд */}
        {cur && w ? (
          <div
            className="pointer-events-none absolute z-[2] -translate-x-1/2 whitespace-nowrap rounded-ctl bg-panel-3 px-2.5 py-1.5 text-[13px] shadow-lg"
            style={{ left: Math.min(Math.max(X(cur.x), 100), w - 100), top: T + 8 }}
          >
            <div className="font-semibold">
              {cur.from}′–{cur.to}′
            </div>
            <div className="flex items-center gap-1.5">
              <span className="club-bar-h size-2 rounded-full" />
              {home.name} — {cur.h}%
            </div>
            <div className="flex items-center gap-1.5">
              <span className="club-bar-a size-2 rounded-full" />
              {away.name} — {cur.a}%
            </div>
          </div>
        ) : null}
      </div>

      {/* легенда: у каждой линии — название команды */}
      <div className="mt-1 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[14px]">
        <span className="flex items-center gap-2">
          <span className="club-bar-h size-2.5 rounded-full" />
          {home.name}
        </span>
        <span className="flex items-center gap-2">
          <span className="club-bar-a size-2.5 rounded-full" />
          {away.name}
        </span>
      </div>
      {note ? <p className="mt-3.5 border-t border-edge pt-3.5 text-[14px] leading-snug text-dim">{note}</p> : null}
    </div>
  )
}
