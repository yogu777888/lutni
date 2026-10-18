'use client'

import { useEffect, useRef, useState } from 'react'
import { formatDayMonth, formatDayShort, formatTime } from '@/lib/format'

const fmt = (t: number) => `${formatDayMonth(t)}, ${formatTime(t)}`

/** Точка: шанс по линии в процентах (кэфы без маржи) и сам кэф — для подсказки. */
export type ChancePoint = { t: number; v: number; odd: number }
export type ChanceSeries = { key: string; label: string; color: string; est: number | null; pts: ChancePoint[] }

/**
 * Как менялись шансы (владелец: «а может лучше сделать как менялась линия типа оценка tag.bet?»): ступеньки шансов
 * исходов по линии PARI в процентах (кэфы без маржи) — новичку «52% → 55%» понятнее, чем «1.83 → 1.75»; пунктир того же
 * цвета — оценка tag.bet по этому исходу, у правого края — шанс по линии («65% Бетис»; «оценка tag.bet 64%» второй
 * строкой у каждого исхода повторялась трижды и сдвигала подписи друг к другу — владелец: «а как менялись шансы как?»;
 * наша оценка — пунктир и строка «До матча» на табло). Цвета исходов — синий,
 * бирюзовый, оранжевый (палитра проверена валидатором dataviz на различимость и дальтонизм); подписи — цветом текста.
 * При наведении — вертикаль, шансы и кэфы всех исходов на этот момент.
 */
export function ChanceChart({ series, end }: { series: ChanceSeries[]; end: number }) {
  const box = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(640)
  const [hover, setHover] = useState<number | null>(null)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    setW(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const all = series.flatMap((s) => s.pts)
  if (!all.length) return null
  const t0 = Math.min(...all.map((p) => p.t))
  const t1 = Math.max(end, ...all.map((p) => p.t))
  if (!(t1 > t0)) return null
  const vals = [...all.map((p) => p.v), ...series.flatMap((s) => (s.est == null ? [] : [s.est]))]
  // шкала — круглые проценты: шаг 10% (на широком разбросе — 20%)
  const step = Math.max(...vals) - Math.min(...vals) > 50 ? 20 : 10
  const lo = Math.max(0, Math.floor((Math.min(...vals) - 2) / step) * step)
  const hi = Math.min(100, Math.ceil((Math.max(...vals) + 2) / step) * step)
  const H = 240
  // поля — по ширине подписей, а не с запасом (владелец: «по бокам большие отступы»): слева — самый длинный процент оси
  // (14px, ~8,5px на знак), справа — самая длинная подпись «79% Барселона» (15px, ~8,6px на знак) и 10px до неё
  const L = 10 + Math.max(...[0, 100].map((v) => `${v}%`.length)) * 8.5
  // подпись у края — короткая: длинное название из нескольких слов — первым словом («Фортуна Ситтард» → «Фортуна»; на
  // 390px «14% Фортуна Ситтард» обрезалось краем), полное — в подсказке и для экранного диктора
  const edge = (l: string) => (l.length > 12 && l.includes(' ') ? l.split(' ')[0] : l)
  const R = Math.min(170, 14 + Math.max(...series.map((sr) => `${sr.pts[sr.pts.length - 1]?.v ?? 0}% ${edge(sr.label)}`.length)) * 8.6)
  const T = 14
  const B = 28
  const x = (t: number) => L + ((t - t0) / (t1 - t0)) * (w - L - R)
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B)
  const ticks: number[] = []
  for (let v = lo; v <= hi + 0.001; v += step) ticks.push(v)

  const at = (s: ChanceSeries, t: number) => {
    let p: ChancePoint | null = null
    for (const q of s.pts) {
      if (q.t > t) break
      p = q
    }
    return p
  }
  const path = (s: ChanceSeries) =>
    s.pts
      .map((p, i) => {
        const next = i + 1 < s.pts.length ? s.pts[i + 1].t : t1
        const yy = y(p.v).toFixed(1)
        return `${i ? `V${yy}` : `M${x(p.t).toFixed(1)},${yy}`} H${x(next).toFixed(1)}`
      })
      .join(' ')

  // подписи справа — одна строка; близкие исходы раздвигаем, чтобы не наезжали
  const labels = series
    .map((s) => ({ s, last: s.pts[s.pts.length - 1], y: y(s.pts[s.pts.length - 1]?.v ?? 0) }))
    .filter((l) => l.last)
    .sort((a, b) => a.y - b.y)
  const GAP = 22
  for (let i = 1; i < labels.length; i++) labels[i].y = Math.max(labels[i].y, labels[i - 1].y + GAP)
  const over = labels.length ? labels[labels.length - 1].y - (H - B - 8) : 0
  if (over > 0) for (const l of labels) l.y -= over

  const hoverT = hover == null ? null : t0 + ((hover - L) / (w - L - R)) * (t1 - t0)

  return (
    <div ref={box} className="relative w-full select-none">
      <svg
        width={w}
        height={H}
        role="img"
        aria-label={`Как менялись шансы по линии: ${series
          .map((s) => `${s.label} — с ${s.pts[0]?.v}% до ${s.pts[s.pts.length - 1]?.v}%${s.est != null ? `, оценка tag.bet ${s.est}%` : ''}`)
          .join('; ')}`}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          const px = e.clientX - r.left
          setHover(px >= L && px <= w - R ? px : null)
        }}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={w - R} y1={y(v)} y2={y(v)} stroke="currentColor" className="text-edge" />
            <text x={L - 8} y={y(v)} textAnchor="end" dominantBaseline="central" className="num fill-mute text-[14px]">
              {v}%
            </text>
          </g>
        ))}
        {/* на узком экране — «27.09», иначе две полные даты наезжают друг на друга */}
        <text x={L} y={H - 6} className="fill-mute text-[14px]">
          {w < 520 ? formatDayShort(t0) : fmt(t0)}
        </text>
        <text x={w - R} y={H - 6} textAnchor="end" className="fill-mute text-[14px]">
          {w < 520 ? formatDayShort(t1) : fmt(t1)}
        </text>
        {/* оценка tag.bet — пунктир цвета исхода, тише линии */}
        {series.map((s) =>
          s.est == null ? null : (
            <line key={`e-${s.key}`} x1={L} x2={w - R} y1={y(s.est)} y2={y(s.est)} stroke={s.color} strokeWidth={1.5} strokeDasharray="4 5" opacity={0.55} />
          ),
        )}
        {series.map((s) => (
          <path key={s.key} d={path(s)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {labels.map(({ s, last, y: ly }) => (
          <g key={s.key}>
            <circle cx={w - R} cy={y(last.v)} r={4} fill={s.color} stroke="var(--color-panel-2)" strokeWidth={2} />
            <text x={w - R + 10} y={ly} dominantBaseline="central" className="fill-fg text-[15px]">
              <tspan className="num font-semibold">{last.v}%</tspan>
              <tspan className="fill-dim"> {edge(s.label)}</tspan>
            </text>
          </g>
        ))}
        {hover != null ? <line x1={hover} x2={hover} y1={T} y2={H - B} stroke="currentColor" className="text-dim" strokeDasharray="3 3" /> : null}
      </svg>
      {hover != null && hoverT != null ? (
        <div
          className="pointer-events-none absolute top-1 z-10 rounded-ctl border border-edge bg-panel-2 px-3 py-2 text-[13px] shadow-[0_8px_24px_rgb(0_0_0/0.3)]"
          style={{ left: Math.min(hover + 12, w - 230) }}
        >
          <div className="mb-1 text-mute">{fmt(hoverT)}</div>
          {series.map((s) => {
            const p = at(s, hoverT)
            return (
              <div key={s.key} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                <span className="text-dim">{s.label}</span>
                <span className="num ml-auto pl-3 font-semibold text-fg">{p ? `${p.v}%` : '—'}</span>
                <span className="num w-10 text-right text-mute">{p ? p.odd.toFixed(2) : ''}</span>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
