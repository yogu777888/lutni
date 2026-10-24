'use client'

import { useEffect, useRef, useState } from 'react'
import { momentumSummary, playedTime, pressShares } from '@/lib/match-notes'
import { minuteLabel, type MomentumPoint } from '@/lib/sstats/ls'
import type { MatchEvent } from '@/lib/types'
import { TeamLogo } from '../TeamLogo'
import { SplitBar } from './SplitBar'

type Side = { name: string; logo?: string | null }

const mins = (n: number) => `${n} мин`
const STEP = 5

type Bucket = { x: number; from: number; to: number; label: string; h: number; a: number }

/**
 * Давление по 5 минут внутри тайма (отрезок не переходит через перерыв; добавленное время — своими отрезками):
 * у каждой команды — средняя сила её давления за отрезок, 0–100 (`v` из `/Ls/GameMomentum`: > 0 — хозяева,
 * < 0 — гости). `x` — середина отрезка на оси сыгранного времени (`playedTime`).
 */
function buckets(points: MomentumPoint[], pos: (part: number, minute: number) => number): Bucket[] {
  const start = (part: number) => (part === 1 ? 0 : part === 2 ? 45 : 90)
  const acc = new Map<string, MomentumPoint[]>()
  for (const p of points) {
    const k = `${p.part}:${Math.floor((p.minute - 1 - start(p.part)) / STEP)}`
    acc.set(k, [...(acc.get(k) ?? []), p])
  }
  return [...acc.values()].map((ps) => {
    const first = ps[0]
    const lastP = ps[ps.length - 1]
    const from = pos(first.part, first.minute) - 1
    const to = pos(lastP.part, lastP.minute)
    const a = minuteLabel(first).replace('′', '')
    return {
      x: (from + to) / 2,
      from,
      to,
      label: first === lastP ? minuteLabel(first) : `${a}–${minuteLabel(lastP)}`,
      h: Math.round((ps.reduce((s, p) => s + Math.max(p.v, 0), 0) / ps.length) * 100),
      a: Math.round((ps.reduce((s, p) => s + Math.max(-p.v, 0), 0) / ps.length) * 100),
    }
  })
}

/** Тайм события по минуте и добавленному: «45+2» — первый тайм, 47-я минута тайма. */
const evPart = (e: MatchEvent) => (e.minute <= 45 ? 1 : e.minute <= 90 ? 2 : 3)
const evLabel = (e: MatchEvent) => `${e.minute}${e.extra ? `+${e.extra}` : ''}′`
const EV_WORD: Partial<Record<MatchEvent['kind'], string>> = { goal: 'гол', penalty: 'гол с пенальти', 'own-goal': 'автогол', red: 'удаление', 'missed-penalty': 'незабитый пенальти' }

/**
 * «Давление команд» (заголовок — у раздела) — по прототипу владельца из ChatGPT («а может так лучше?»): две линии,
 * у каждой команды своя, цветом клуба (`.club-stroke-h/-a`; цвета похожи — у гостей пунктир, `[data-alike]` от
 * `ClubVars`), точка — 5 минут матча, слева шкала индекса давления 0–100, под графиком — легенда и один вывод про
 * последние 10 минут (только если все 10 минут есть в данных). Ось минут — сыгранное время с добавленным: по ходу —
 * до текущей минуты с небольшим запасом, после матча — вся продолжительность. Голы — метка «эмблема 17′» и пунктир.
 * Сверху — «Сколько минут давила команда» с полосой и «ещё N мин — на равных · сыграно M мин» (`momentumSummary`).
 */
export function Momentum({ points, events, home, away, live, clock = null }: { points: MomentumPoint[]; events: MatchEvent[]; home: Side; away: Side; live: boolean; /** минута на часах по ходу (`elapsed`) */ clock?: number | null }) {
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
  const pt = playedTime(points)
  // три группы не пересекаются: перевес хозяев, на равных, перевес гостей — доли минут с данными, в сумме ровно 100%
  const share = pressShares(points)
  const bs = buckets(points, pt.pos)
  const last = points[points.length - 1]
  // xData — последняя минута с данными; xNow — «сейчас» по часам матча (данные бывают на минуту-две позади)
  const xData = last ? pt.pos(last.part, last.minute) : 0
  const clockPos = (m: number) => (m <= 45 ? m : m <= 90 ? pt.len1 + m - 45 : pt.len1 + pt.len2 + m - 90)
  const xNow = live && clock ? Math.max(xData, clockPos(clock)) : xData
  // правый край — «сейчас» по ходу и конец матча после
  const xMax = Math.max(live ? xNow : pt.total, 10)
  const behind = live && last && xNow > xData
  const top = Math.max(...bs.map((b) => Math.max(b.h, b.a)), 1)
  const yMax = Math.min(100, Math.max(40, Math.ceil(top / 20) * 20))
  const yTicks = Array.from({ length: yMax / 20 + 1 }, (_, i) => i * 20)

  const evPos = (e: MatchEvent) => pt.pos(evPart(e), e.minute + (e.extra ?? 0))
  // голы: ярус выше, если рядом (ближе 8 минут) уже стоит метка
  const goals: { x: number; side: 'home' | 'away'; label: string; level: number }[] = []
  for (const e of events) {
    if (e.kind !== 'goal' && e.kind !== 'penalty' && e.kind !== 'own-goal') continue
    const x = evPos(e)
    if (x > xMax) continue
    const near = goals.filter((g) => Math.abs(g.x - x) < 8).map((g) => g.level)
    let level = 0
    while (near.includes(level)) level++
    goals.push({ x, side: e.side, label: evLabel(e), level })
  }
  const goalRows = goals.length ? Math.max(...goals.map((g) => g.level)) + 1 : 0

  // размеры графика: слева — подписи шкалы, сверху — метки голов, снизу — минуты (высота — на ~23% ниже прежней)
  const L = 40
  const R = 6
  const T = goalRows * 28 + 12
  const H = w >= 640 ? 170 : 140
  const B = 26
  const pw = Math.max(0, w - L - R)
  const X = (x: number) => L + (x / xMax) * pw
  const Y = (v: number) => T + H - (v / yMax) * H
  const narrow = w < 480
  const xTicks = (narrow ? [0, 45, 90, 120] : [0, 15, 30, 45, 60, 75, 90, 105, 120])
    .filter((m) => (m <= 45 || pt.len2 > 0 || m === 0) && (m <= 90 || pt.total > pt.len1 + pt.len2))
    .map((m) => ({ m, x: clockPos(m) }))
    .filter((t) => t.x <= xMax)
  // только настоящие точки (середины отрезков): до первой и после последней линию не продлеваем, через отрезок без
  // данных — разрыв, а не прямая
  const path = (k: 'h' | 'a') =>
    bs.map((b, i) => `${i && b.from <= bs[i - 1].to ? 'L' : 'M'}${X(b.x).toFixed(1)},${Y(b[k]).toFixed(1)}`).join(' ')
  const cur = act != null ? bs[act] : null
  // события отрезка — только те, что есть в данных матча
  const curEvents = cur ? events.filter((e) => EV_WORD[e.kind] && evPos(e) > cur.from && evPos(e) <= cur.to) : []
  const nowLabel = behind && clock ? `${clock}′` : last ? minuteLabel(last) : ''
  const nowLeft = X(xNow) + 96 > L + pw

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

  // вывод под графиком: ровно последние 10 минут по данным, без пропусков; иначе — ничего не пишем
  const tail = points.slice(-10)
  // по ходу данные должны быть свежими (не дальше 3 минут от «сейчас»), иначе вывод не делаем
  const whole = points.length >= 20 && (!live || xNow - xData <= 3) && tail.every((p, i) => !i || pt.pos(p.part, p.minute) - pt.pos(tail[i - 1].part, tail[i - 1].minute) === 1)
  const th = (tail.reduce((s, p) => s + Math.max(p.v, 0), 0) / 10) * 100
  const ta = (tail.reduce((s, p) => s + Math.max(-p.v, 0), 0) / 10) * 100
  const lead = Math.abs(th - ta) < 8 ? null : th > ta ? home : away
  const note = !whole
    ? null
    : lead
      ? live
        ? `В последние 10 минут сильнее давит «${lead.name}».`
        : `В последние 10 минут матча сильнее давила команда «${lead.name}».`
      : `${live ? 'В последние 10 минут' : 'В последние 10 минут матча'} — на равных.`
  const swatch = (k: 'h' | 'a') => (
    <svg width="18" height="8" aria-hidden className={`momentum-line ${k === 'h' ? 'club-stroke-h' : 'club-stroke-a'}`}>
      <path d="M1,4 L17,4" strokeWidth={2.5} strokeLinecap="round" />
    </svg>
  )

  const team = (t: Side, right: boolean) => (
    <span className={`flex min-w-0 items-center gap-2.5 ${right ? 'flex-row-reverse text-right' : ''}`}>
      <TeamLogo name={t.name} src={t.logo ?? null} size={28} />
      <span className="truncate text-[16px] font-semibold">{t.name}</span>
    </span>
  )
  const hv = sum.minutes.home
  const av = sum.minutes.away
  const pct = (v: number) => `${(v / 10).toFixed(1).replace('.', ',')}%`

  return (
    <div>
      <div className="flex items-center justify-between gap-4 border-b border-edge pb-3.5">
        {team(home, false)}
        {team(away, true)}
      </div>
      {/* доля проанализированных минут: перевес хозяев · на равных · перевес гостей, в сумме 100% */}
      <div className="pb-1 pt-3.5">
        <p className="text-center text-[14px] text-dim">Распределение давления</p>
        <SplitBar home={share?.home ?? 0} away={share?.away ?? 0} even={share?.even ?? 0} className="mt-2.5 h-2" />
        <div className="mt-2.5 grid grid-cols-3 gap-3">
          {[
            { v: share?.home ?? 0, label: home.name, strong: hv >= av, cls: 'text-left' },
            { v: share?.even ?? 0, label: 'на равных', strong: false, cls: 'text-center' },
            { v: share?.away ?? 0, label: away.name, strong: av >= hv, cls: 'text-right' },
          ].map((c, i) => (
            <div key={i} className={`min-w-0 ${c.cls}`}>
              <div className={`num text-[22px] leading-none ${c.strong ? 'font-bold text-fg' : 'text-dim'}`}>{pct(c.v)}</div>
              <div className="mt-1 truncate text-[13px] text-mute">{c.label}</div>
            </div>
          ))}
        </div>
        {/* знаменатель процентов — минуты с данными; с добавленным временем их больше минуты на часах (61 при «59′») */}
        <p className="mt-2.5 text-center text-[13px] text-mute">
          {[
            share ? `по ${mins(share.n)} игры${pt.added > 0 ? ` с добавленным временем` : ''}` : null,
            behind ? `Данные до ${minuteLabel(last)}` : null,
            pt.gap > 0 ? `нет данных — ${mins(pt.gap)}` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>

      <div ref={box} className="relative mt-4 border-t border-edge pt-2">
        {w ? (
          <svg width={w} height={T + H + B} className="block select-none" role="img" aria-label={`Индекс давления команд по 5 минут, 0–100: «${home.name}» и «${away.name}».`}>
            {/* шкала силы давления и сетка */}
            {yTicks.map((v) => (
              <g key={v}>
                <line x1={L} x2={L + pw} y1={Y(v)} y2={Y(v)} className={v ? 'stroke-white/[0.07]' : 'stroke-white/20'} strokeDasharray={v ? '3 4' : undefined} />
                <text x={L - 8} y={Y(v)} dy="0.35em" textAnchor="end" className="fill-mute text-[13px]">
                  {v}
                </text>
              </g>
            ))}
            {/* перерыв — тонкой чертой */}
            {pt.len2 > 0 ? <line x1={X(pt.len1)} x2={X(pt.len1)} y1={T} y2={T + H} className="stroke-white/10" /> : null}
            {/* по ходу — несыгранное пустым, «сейчас» — красной чертой */}
            {live && last ? (
              <g>
                {xNow < xMax ? <rect x={X(xNow)} y={T} width={X(xMax) - X(xNow)} height={H} className="fill-white/[0.03]" /> : null}
                <line x1={X(xNow)} x2={X(xNow)} y1={T} y2={T + H} className="stroke-live" />
                <text x={X(xNow) + (nowLeft ? -6 : 6)} y={T + 16} textAnchor={nowLeft ? 'end' : 'start'} className="fill-live text-[13px] font-semibold">
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
              <g key={k} className={`momentum-line ${k === 'h' ? 'club-stroke-h' : 'club-stroke-a'}`}>
                <path d={path(k)} fill="none" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                {bs.map((b, i) => (
                  <circle key={i} cx={X(b.x)} cy={Y(b[k])} r={act === i ? 5 : 3.5} className="club-dot" strokeWidth={2} />
                ))}
              </g>
            ))}
            {/* минуты матча */}
            {xTicks.map(({ m, x }, i) => (
              <text key={m} x={X(x)} y={T + H + 19} textAnchor={i === 0 ? 'start' : X(x) > L + pw - 16 ? 'end' : 'middle'} className="fill-mute text-[13px]">
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
          <div style={{ height: T + 140 + B }} />
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
            {/* отрезок — минуты, по которым усреднён индекс (одна минута — одна минута) */}
            <div className="font-semibold">
              {cur.label} <span className="font-normal text-mute">· Индекс давления</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              {swatch('h')}
              {home.name} — <span className="num font-semibold">{cur.h}/100</span>
            </div>
            <div className="flex items-center gap-1.5">
              {swatch('a')}
              {away.name} — <span className="num font-semibold">{cur.a}/100</span>
            </div>
            {/* события этого отрезка — отдельно от цифр давления */}
            {curEvents.length ? (
              <div className="mt-1.5 border-t border-white/10 pt-1.5">
                {curEvents.map((e, i) => (
                  <div key={i}>
                    {EV_WORD[e.kind]!.replace(/^./, (c) => c.toUpperCase())} «{e.side === 'home' ? home.name : away.name}» · {evLabel(e)}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* легенда: у каждой линии — название команды */}
      <div className="mt-1 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[14px]">
        <span className="flex items-center gap-2">
          {swatch('h')}
          {home.name}
        </span>
        <span className="flex items-center gap-2">
          {swatch('a')}
          {away.name}
        </span>
      </div>
      {note ? <p className="mt-3.5 border-t border-edge pt-3.5 text-[14px] leading-snug text-dim">{note}</p> : null}
    </div>
  )
}
