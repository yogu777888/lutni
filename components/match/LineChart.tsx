'use client'

import { useEffect, useRef, useState } from 'react'
import { formatDayMonth, formatTime } from '@/lib/format'

const fmt = (t: number) => `${formatDayMonth(t)}, ${formatTime(t)}`

export type LineSeries = { key: string; label: string; color: string; pts: { t: number; v: number | null }[] }

/**
 * Как менялась линия: ступеньки кэфов во времени (кэф держится до следующего изменения). Три исхода — синий,
 * бирюзовый, оранжевый (палитра проверена валидатором dataviz на различимость и дальтонизм), у правого края —
 * подписи прямо у линий, при наведении — вертикаль и значения всех исходов на этот момент. Ось — время
 * от первого снимка до начала матча (или до сейчас).
 */
export function LineChart({ series, end }: { series: LineSeries[]; end: number }) {
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
  const t0 = Math.min(...all.map((p) => p.t))
  const t1 = Math.max(end, ...all.map((p) => p.t))
  const vals = all.map((p) => p.v).filter((v): v is number => v != null)
  if (!vals.length || !(t1 > t0)) return null
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const pad = Math.max(0.05, (hi - lo) * 0.12)
  const H = 220
  const L = 40
  const R = 92
  const T = 12
  const B = 26
  const x = (t: number) => L + ((t - t0) / (t1 - t0)) * (w - L - R)
  const y = (v: number) => T + (1 - (v - (lo - pad)) / (hi + pad - (lo - pad))) * (H - T - B)

  // значение ступеньки на момент t
  const at = (s: LineSeries, t: number) => {
    let v: number | null = null
    for (const p of s.pts) {
      if (p.t > t) break
      v = p.v
    }
    return v
  }
  // ступеньки: горизонталь до следующего изменения, затем вертикаль; снятый с линии кэф — разрыв
  const path = (s: LineSeries) => {
    let d = ''
    let open = false
    s.pts.forEach((p, i) => {
      const next = i + 1 < s.pts.length ? s.pts[i + 1].t : t1
      if (p.v == null) {
        open = false
        return
      }
      const yy = y(p.v).toFixed(1)
      d += open ? ` V${yy}` : ` M${x(p.t).toFixed(1)},${yy}`
      d += ` H${x(next).toFixed(1)}`
      open = true
    })
    return d.trim()
  }
  const ticks = 4
  const yTicks = Array.from({ length: ticks }, (_, i) => lo - pad + ((hi + pad - (lo - pad)) * (i + 0.5)) / ticks)
  const hoverT = hover == null ? null : t0 + ((hover - L) / (w - L - R)) * (t1 - t0)

  return (
    <div ref={box} className="relative w-full select-none">
      <svg
        width={w}
        height={H}
        role="img"
        aria-label={`Как менялись коэффициенты: ${series.map((s) => `${s.label} — с ${s.pts.find((p) => p.v != null)?.v ?? '—'} до ${at(s, t1) ?? '—'}`).join('; ')}`}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          const px = e.clientX - r.left
          setHover(px >= L && px <= w - R ? px : null)
        }}
        onPointerLeave={() => setHover(null)}
      >
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={L} x2={w - R} y1={y(v)} y2={y(v)} stroke="currentColor" className="text-edge" />
            <text x={L - 8} y={y(v)} textAnchor="end" dominantBaseline="central" className="num fill-mute text-[11px]">
              {v.toFixed(2)}
            </text>
          </g>
        ))}
        <text x={L} y={H - 6} className="fill-mute text-[11px]">
          {fmt(t0)}
        </text>
        <text x={w - R} y={H - 6} textAnchor="end" className="fill-mute text-[11px]">
          {fmt(t1)}
        </text>
        {series.map((s) => (
          <path key={s.key} d={path(s)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {/* подписи у правого края: название исхода и последний кэф, цветная точка — линия; текст — цветом текста */}
        {series.map((s) => {
          const v = at(s, t1)
          if (v == null) return null
          return (
            <g key={s.key}>
              <circle cx={w - R} cy={y(v)} r={4} fill={s.color} stroke="var(--color-panel-2)" strokeWidth={2} />
              <text x={w - R + 10} y={y(v)} dominantBaseline="central" className="fill-fg text-[12px]">
                <tspan className="num font-semibold">{v.toFixed(2)}</tspan>
                <tspan className="fill-dim"> {s.label}</tspan>
              </text>
            </g>
          )
        })}
        {hover != null && hoverT != null ? (
          <line x1={hover} x2={hover} y1={T} y2={H - B} stroke="currentColor" className="text-dim" strokeDasharray="3 3" />
        ) : null}
      </svg>
      {hover != null && hoverT != null ? (
        <div
          className="pointer-events-none absolute top-1 z-10 rounded-[10px] border border-edge bg-panel-2 px-3 py-2 text-[12.5px] shadow-[0_8px_24px_rgb(8_25_46/0.12)]"
          style={{ left: Math.min(hover + 12, w - 170) }}
        >
          <div className="mb-1 text-mute">{fmt(hoverT)}</div>
          {series.map((s) => {
            const v = at(s, hoverT)
            return (
              <div key={s.key} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                <span className="text-dim">{s.label}</span>
                <span className="num ml-auto pl-3 font-semibold text-fg">{v == null ? '—' : v.toFixed(2)}</span>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
