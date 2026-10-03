'use client'

import { useRef, useState } from 'react'
import { CHANCE_BINS, type ChanceBin } from '@/lib/chance-check'

const pc = (x: number) => `${Math.round(x * 100)}%`
const fmt = (n: number) => new Intl.NumberFormat('ru-RU').format(n)
/** «1 исход», «2 исхода», «5 исходов» (lib/format тянет настройки сервера — здесь своя маленькая копия). */
const outcomes = (n: number) => {
  const a = n % 100
  const b = n % 10
  return `${fmt(n)} ${a > 10 && a < 20 ? 'исходов' : b === 1 ? 'исход' : b >= 2 && b <= 4 ? 'исхода' : 'исходов'}`
}

/**
 * «Давали — сбылось» по корзинам шанса: столбик — сколько сбылось, черта — какой шанс давали.
 * Если шансы честные, столбики упираются в черты и идут лесенкой. Монохромно: это не «выгодно»
 * и не live, значит без цвета. Наведение, тап и стрелки — подсказка над графиком с числами.
 */
export function ChanceChart({ bins, className = '' }: { bins: ChanceBin[]; className?: string }) {
  const plot = useRef<HTMLDivElement>(null)
  const [cur, setCur] = useState<number | null>(null)
  const byAt = new Map(bins.map((b) => [b.at, b]))
  const slots = Array.from({ length: CHANCE_BINS }, (_, i) => (i + 1) * 10)
  const has = (k: number) => byAt.has(slots[k])

  const pick = (clientX: number) => {
    const r = plot.current?.getBoundingClientRect()
    if (!r || !r.width) return
    const k = Math.min(CHANCE_BINS - 1, Math.max(0, Math.floor(((clientX - r.left) / r.width) * CHANCE_BINS)))
    setCur(has(k) ? k : null)
  }
  const step = (dir: 1 | -1) => {
    let k = cur ?? (dir > 0 ? -1 : CHANCE_BINS)
    do k += dir
    while (k >= 0 && k < CHANCE_BINS && !has(k))
    if (k >= 0 && k < CHANCE_BINS) setCur(k)
  }

  const b = cur !== null ? byAt.get(slots[cur]) : undefined
  const mid = (k: number) => ((k + 0.5) / CHANCE_BINS) * 100
  return (
    <div className={`relative flex min-h-0 flex-col rounded-[14px] bg-white/[0.035] px-3 pb-2.5 pt-3 ${className}`}>
      {/* подсказка — над графиком (поверх фразы карточки), уголок — над корзиной */}
      {b && cur !== null ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-[calc(100%+10px)] z-10 rounded-[10px] border border-edge bg-panel-3 px-3 py-2 shadow-[0_12px_32px_rgb(0_0_0/0.45)]">
          <p className="flex items-baseline justify-between gap-3">
            <span className="text-[15px] font-semibold text-fg">сбылось {pc(b.hit)}</span>
            <span className="text-[13px] text-dim">давали {pc(b.p)}</span>
          </p>
          <p className="mt-0.5 text-[13px] text-dim">
            {outcomes(b.n)} с шансом {b.at - 5}–{b.at + 5}%
          </p>
          <span
            aria-hidden
            className="absolute top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 border-b border-r border-edge bg-panel-3"
            style={{ left: `calc(12px + (100% - 24px) * ${mid(cur) / 100})` }}
          />
        </div>
      ) : null}

      {/* легенда: черта и столбик — как на графике */}
      <p className="flex items-center gap-3 text-[13px] leading-none text-dim" aria-hidden>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3.5 rounded-full bg-fg" />
          давали
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2 rounded-t-[2px] bg-chalk/45" />
          сбылось
        </span>
      </p>

      <div
        ref={plot}
        tabIndex={0}
        role="group"
        aria-label={`Давали и сбылось по шансам: ${bins.map((x) => `около ${x.at}% — сбылось ${pc(x.hit)}`).join(', ')}. Стрелками — по корзинам.`}
        className="relative mt-3 min-h-0 flex-1 touch-pan-y rounded-md outline-none focus-visible:ring-2 focus-visible:ring-acid/50"
        onPointerMove={(e) => pick(e.clientX)}
        onPointerDown={(e) => pick(e.clientX)}
        // палец «уходит» с графика сразу после касания — подсказку с тапа убирает только тап мимо (blur)
        onPointerLeave={(e) => e.pointerType === 'mouse' && setCur(null)}
        onBlur={() => setCur(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault()
            step(e.key === 'ArrowLeft' ? -1 : 1)
          } else if (e.key === 'Escape') setCur(null)
        }}
      >
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/[0.14]" />
        {slots.map((at, k) => {
          const x = byAt.get(at)
          if (!x) return null
          const on = cur === k
          return (
            <div key={at} className="pointer-events-none absolute inset-y-0" style={{ left: `${(k / CHANCE_BINS) * 100}%`, width: `${100 / CHANCE_BINS}%` }}>
              <span
                className={`absolute bottom-0 left-1/2 w-[46%] max-w-4 -translate-x-1/2 rounded-t-[4px] transition-colors ${on ? 'bg-chalk/75' : 'bg-chalk/40'}`}
                style={{ height: `${x.hit * 100}%` }}
              />
              <span className="absolute left-1/2 h-0.5 w-[78%] max-w-[22px] -translate-x-1/2 translate-y-1/2 rounded-full bg-fg" style={{ bottom: `${x.p * 100}%` }} />
            </div>
          )
        })}
        <p className="sr-only" aria-live="polite">
          {b ? `Около ${b.at}%: давали ${pc(b.p)}, сбылось ${pc(b.hit)}, ${outcomes(b.n)}` : ''}
        </p>
      </div>

      {/* шанс, который давали, — под своей корзиной */}
      <div className="relative mt-1.5 h-[16px]" aria-hidden>
        {slots.map((at, k) => (
          <span
            key={at}
            className={`absolute top-0 -translate-x-1/2 text-[13px] leading-none ${byAt.has(at) ? 'text-mute' : 'text-mute/40'}`}
            style={{ left: `${mid(k)}%` }}
          >
            {at}
          </span>
        ))}
      </div>
    </div>
  )
}
