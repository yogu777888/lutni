'use client'

import { toggleShell, type Side } from './shell-state'

/** Свернуть / развернуть боковую панель (стрелка к краю — свернуть, от края — развернуть). */
export function PanelToggle({ side, open, className = '' }: { side: Side; open: boolean; className?: string }) {
  // левая сворачивается влево, правая — вправо
  const toEdge = side === 'l' ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'
  const fromEdge = side === 'l' ? 'M10 6l6 6-6 6' : 'M14 6l-6 6 6 6'
  return (
    <button
      type="button"
      onClick={() => toggleShell(side)}
      aria-label={open ? 'Свернуть панель' : 'Развернуть панель'}
      title={open ? 'Свернуть панель' : 'Развернуть панель'}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-ctl text-dim transition-colors hover:bg-white/[0.08] hover:text-fg ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={open ? toEdge : fromEdge} />
      </svg>
    </button>
  )
}
