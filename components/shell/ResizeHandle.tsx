'use client'

import { dragShell, resetShell, type Side } from './shell-state'

/**
 * Невидимая «ручка» у внутреннего края боковой панели: потянуть — шире/уже, сильно сузить — свернуть, двойной
 * клик — обычная ширина. Подсвечивается тонкой чертой при наведении.
 */
export function ResizeHandle({ side }: { side: Side }) {
  const width = (x: number) => (side === 'l' ? x - 8 : window.innerWidth - x - 8)
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={side === 'l' ? 'Ширина левой панели' : 'Ширина правой панели'}
      title="Потяните, чтобы изменить ширину; двойной клик — обычная"
      onDoubleClick={() => resetShell(side)}
      onPointerDown={(e) => {
        e.preventDefault()
        const el = e.currentTarget
        el.setPointerCapture(e.pointerId)
        document.documentElement.style.cursor = 'col-resize'
        document.documentElement.style.userSelect = 'none'
        const move = (ev: PointerEvent) => dragShell(side, width(ev.clientX))
        const up = (ev: PointerEvent) => {
          dragShell(side, width(ev.clientX), true)
          document.documentElement.style.cursor = ''
          document.documentElement.style.userSelect = ''
          el.removeEventListener('pointermove', move)
          el.removeEventListener('pointerup', up)
        }
        el.addEventListener('pointermove', move)
        el.addEventListener('pointerup', up)
      }}
      className={`group absolute top-0 z-10 h-full w-3 cursor-col-resize ${side === 'l' ? '-right-[7px]' : '-left-[7px]'}`}
    >
      <span className="absolute inset-y-4 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors group-hover:bg-white/25" />
    </div>
  )
}
