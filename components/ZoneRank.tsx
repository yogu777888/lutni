'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Место в таблице кружком цвета зоны (на странице матча — вместо полоски у края и легенды под таблицей): Лига чемпионов
 * и повышение — белым, Лига Европы и плей-офф — светло-серым, Лига конференций — серым, вылет — красным; что за зона —
 * по наведению, нажатию или фокусу маленькой подсказкой (`title` на телефоне не открывается).
 */
const TONE: Record<string, string> = {
  'Лига чемпионов': 'bg-white text-ink',
  Повышение: 'bg-white text-ink',
  'Лига Европы': 'bg-white/45 text-ink',
  'Плей-офф': 'bg-white/45 text-ink',
  'Лига конференций': 'bg-white/20 text-fg',
  'Зона вылета': 'bg-loss text-white',
}

export function ZoneRank({ rank, zone }: { rank: number; zone: string | null }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!open) return
    const off = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    addEventListener('pointerdown', off)
    return () => removeEventListener('pointerdown', off)
  }, [open])
  const tone = zone ? TONE[zone] : undefined
  if (!tone) return <span className="num inline-flex h-6 w-6 items-center justify-center text-[13px] font-medium text-mute">{rank}</span>
  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        aria-label={`${rank}-е место · ${zone}`}
        onClick={() => setOpen((o) => !o)}
        onPointerEnter={(e) => e.pointerType === 'mouse' && setOpen(true)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={`num inline-flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-semibold ${tone}`}
      >
        {rank}
      </button>
      {open ? (
        <span role="tooltip" className="absolute left-0 top-full z-10 mt-1.5 whitespace-nowrap rounded-ctl border border-edge bg-panel-2 px-2.5 py-1.5 text-[13px] text-fg shadow-[0_8px_24px_rgb(0_0_0/0.3)]">
          {zone}
        </span>
      ) : null}
    </span>
  )
}
