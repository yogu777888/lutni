'use client'

import { useState } from 'react'
import { dragShell, MAX, MIN, resetShell, type Side } from './shell-state'

/**
 * «Ручка» у внутреннего края боковой панели: потянуть — шире/уже, сильно сузить — свернуть, двойной клик — обычная
 * ширина; с клавиатуры (Tab) — стрелками. Линия — как у Spotify и VS Code (владелец: «как тебе полоска, когда
 * наводишь, чтобы потянуть?» — 1px на 25% почти не было видно, мелькала при проходе курсора, при перетаскивании не
 * менялась): 2px вдоль прямой части края (отступ 20px сверху и снизу = скругление панели, иначе концы заходили в изгиб), проявляется с задержкой 0,15 с (случайный проход курсора ничего не зажигает),
 * пока тянешь — ярче. Системной подсказки нет: курсор «↔» и так говорит, что это тянется.
 */
export function ResizeHandle({ side }: { side: Side }) {
  const [drag, setDrag] = useState(false)
  const width = (x: number) => (side === 'l' ? x - 8 : window.innerWidth - x - 8)
  const current = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(side === 'l' ? '--shell-l' : '--shell-r')) || MIN[side]
  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label={side === 'l' ? 'Ширина левой панели' : 'Ширина правой панели'}
      aria-valuemin={MIN[side]}
      aria-valuemax={MAX[side]}
      onDoubleClick={() => resetShell(side)}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
        e.preventDefault()
        // стрелка в сторону центра — шире
        const wider = (side === 'l') === (e.key === 'ArrowRight')
        dragShell(side, Math.max(MIN[side], current() + (wider ? 16 : -16)), true)
      }}
      onPointerDown={(e) => {
        e.preventDefault()
        const el = e.currentTarget
        el.setPointerCapture(e.pointerId)
        setDrag(true)
        document.documentElement.style.cursor = 'col-resize'
        document.documentElement.style.userSelect = 'none'
        const move = (ev: PointerEvent) => dragShell(side, width(ev.clientX))
        const up = (ev: PointerEvent) => {
          dragShell(side, width(ev.clientX), true)
          setDrag(false)
          document.documentElement.style.cursor = ''
          document.documentElement.style.userSelect = ''
          el.removeEventListener('pointermove', move)
          el.removeEventListener('pointerup', up)
        }
        el.addEventListener('pointermove', move)
        el.addEventListener('pointerup', up)
      }}
      className={`group absolute top-0 z-10 h-full w-3 cursor-col-resize outline-none ${side === 'l' ? '-right-[7px]' : '-left-[7px]'}`}
    >
      <span
        className={`absolute inset-y-5 left-1/2 w-0.5 -translate-x-1/2 rounded-full transition-colors duration-150 ${
          drag ? 'bg-white/70' : 'bg-transparent group-hover:bg-white/40 group-hover:delay-150 group-focus-visible:bg-white/60'
        }`}
      />
    </div>
  )
}
