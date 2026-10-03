'use client'

import { useRef, useState } from 'react'

export type BankPoint = {
  /** банк после ставки, ₽ */
  cum: number
  /** итог ставки, ₽ */
  delta: number
  /** «пт 21:00» */
  when: string
  /** «Барселона — Севилья» */
  teams: string
  /** «победа «Барселона» за 2.15» */
  bet: string
}

/** День на оси: ставки с номерами from..to (с 1). */
export type BankDay = { label: string; from: number; to: number }

const rub = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${new Intl.NumberFormat('ru-RU').format(Math.abs(v))} ₽`

/**
 * График банка «по 1000 ₽ на каждую ставку»: линия от нуля через каждую рассчитанную ставку.
 * Один ряд — без легенды (его называет заголовок карточки). Лайм — как у всего «выгодного»,
 * нулевая линия — тонкая и тихая. Наведение (и стрелки с клавиатуры) — перекрестие
 * на ближайшей ставке и подсказка над графиком: итог ставки крупно, банк, матч и ставка — ниже.
 */
export function BankChart({ points, days, className = '' }: { points: BankPoint[]; days: BankDay[]; className?: string }) {
  const plot = useRef<HTMLDivElement>(null)
  const [cur, setCur] = useState<number | null>(null)
  const n = points.length
  if (!n) return null

  const values = [0, ...points.map((p) => p.cum)]
  const top = Math.max(0, ...values)
  const bottom = Math.min(0, ...values)
  // «0 ₽» у левого края — с той стороны нулевой линии, куда линия банка в начале не уходит
  // (банк сначала растёт — подпись под линией, падает — над ней); если с той стороны графика
  // нет совсем, под подпись оставляем полосу в 18px
  const early = values.slice(1, Math.max(2, Math.ceil(n * 0.16) + 1))
  const zeroBelow = early.every((v) => v >= 0)
  const strip = zeroBelow ? (bottom === 0 ? 'top-0 bottom-[18px]' : 'inset-y-0') : top === 0 ? 'top-[18px] bottom-0' : 'inset-y-0'
  const range = top - bottom || 1
  const hi = top + range * 0.1
  const lo = bottom - range * 0.1
  const x = (i: number) => (i / n) * 100
  const y = (v: number) => ((hi - v) / (hi - lo)) * 100
  const y0 = y(0)

  // дни — по центру своих ставок; у соседних дней по одной ставке подписи слипаются — лишние пропускаем
  const labels: (BankDay & { c: number })[] = []
  for (const d of days) {
    const c = (x(d.from) + x(d.to)) / 2
    if (!labels.length || c - labels[labels.length - 1].c >= 9) labels.push({ ...d, c })
  }

  const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i) * 10},${y(v) * 10}`).join(' ')
  const area = `${line} L${x(n) * 10},${y(0) * 10} L0,${y(0) * 10} Z`

  const pick = (clientX: number) => {
    const r = plot.current?.getBoundingClientRect()
    if (!r || !r.width) return
    const k = Math.min(n, Math.max(1, Math.round(((clientX - r.left) / r.width) * n)))
    setCur(k)
  }

  const p = cur ? points[cur - 1] : null
  const end = points[n - 1]
  return (
    <div className={`relative flex min-h-0 flex-col rounded-[14px] bg-white/[0.035] px-3 pb-2.5 pt-3 ${className}`}>
      {/* подсказка — над графиком (поверх фразы карточки), чтобы не закрывать линию; уголок — над ставкой */}
      {p ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-[calc(100%+10px)] z-10 rounded-[10px] border border-edge bg-panel-3 px-3 py-2 shadow-[0_12px_32px_rgb(0_0_0/0.45)]">
          <p className="flex items-baseline justify-between gap-3">
            <span className="num text-[15px] font-semibold text-fg">{rub(p.delta)}</span>
            <span className="truncate text-[13px] text-dim">
              банк <span className="num text-chalk">{rub(p.cum)}</span>
            </span>
          </p>
          <p className="mt-0.5 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate text-chalk">{p.teams}</span>
            <span className="shrink-0 text-dim">{p.when}</span>
          </p>
          <p className="truncate text-[13px] text-dim">{p.bet}</p>
          <span
            aria-hidden
            className="absolute top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 border-b border-r border-edge bg-panel-3"
            style={{ left: `calc(12px + (100% - 24px) * ${x(cur!) / 100})` }}
          />
        </div>
      ) : null}
      <div
        ref={plot}
        tabIndex={0}
        role="group"
        aria-label={`График банка: ${n} ставок, итог ${rub(end.cum)}. Стрелками — по ставкам.`}
        className="relative min-h-0 flex-1 touch-pan-y rounded-md outline-none focus-visible:ring-2 focus-visible:ring-acid/50"
        onPointerMove={(e) => pick(e.clientX)}
        onPointerDown={(e) => pick(e.clientX)}
        // палец «уходит» с графика сразу после касания — подсказку с тапа убирает только тап мимо (blur)
        onPointerLeave={(e) => e.pointerType === 'mouse' && setCur(null)}
        onBlur={() => setCur(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault()
            const k = Math.min(n, Math.max(1, (cur ?? (e.key === 'ArrowLeft' ? n + 1 : 0)) + (e.key === 'ArrowLeft' ? -1 : 1)))
            setCur(k)
          } else if (e.key === 'Escape') setCur(null)
        }}
      >
        <div className={`pointer-events-none absolute inset-x-0 ${strip}`}>
          <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
            <line x1="0" x2="1000" y1={y0 * 10} y2={y0 * 10} stroke="rgb(255 255 255 / 0.14)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <path d={area} fill="var(--color-acid)" fillOpacity="0.1" />
            <path d={line} fill="none" stroke="var(--color-acid)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>

          {/* нулевая линия — «сколько поставили»: выше — в плюсе, ниже — в минусе */}
          <span
            className={`absolute left-0 text-[13px] leading-none text-mute [text-shadow:0_0_3px_#1a1a18,0_0_3px_#1a1a18] ${zeroBelow ? 'pt-1' : '-translate-y-full pb-1'}`}
            style={{ top: `${y0}%` }}
          >
            0 ₽
          </span>

          {/* последняя точка — итог; при наведении — точка ставки и перекрестие */}
          {cur ? <span className="absolute inset-y-0 w-px bg-white/25" style={{ left: `${x(cur)}%` }} /> : null}
          <span
            className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-acid shadow-[0_0_0_2px_var(--color-panel)] transition-[left,top] duration-75"
            style={{ left: `${x(cur ?? n)}%`, top: `${y((p ?? end).cum)}%` }}
          />
        </div>

        <p className="sr-only" aria-live="polite">
          {p ? `${p.when}, ${p.teams}, ${p.bet}: ${rub(p.delta)}, банк ${rub(p.cum)}` : ''}
        </p>
      </div>

      {/* дни — под своими ставками */}
      <div className="relative mt-1.5 h-[16px]" aria-hidden>
        {labels.map((d) => (
          <span
            key={d.from}
            className="absolute top-0 text-[13px] leading-none text-mute"
            style={{ left: `${d.c}%`, transform: `translateX(${d.c < 6 ? '0%' : d.c > 94 ? '-100%' : '-50%'})` }}
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  )
}
