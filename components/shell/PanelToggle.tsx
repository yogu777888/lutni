'use client'

import { useRailTip } from './RailTip'
import { toggleShell, type Side } from './shell-state'

/**
 * Свернуть / развернуть боковую панель. Значок — общепринятый «боковая панель» (рамка с полосой у края панели), как у
 * Spotify, macOS и VS Code: стрелка «<» у левой панели читалась как «назад» (владелец согласился). Развёрнута — полоса
 * залита, свёрнута — только контур. Подсказка — та же, что у значков полосок (`useRailTip`).
 */
export function PanelToggle({ side, open, className = '' }: { side: Side; open: boolean; className?: string }) {
  const { tipProps, tipNode, hideTip } = useRailTip(side, '')
  const label = open ? 'Свернуть панель' : 'Развернуть панель'
  // полоса — у того края окна, где стоит панель
  const bar = side === 'l' ? { x: 3, line: 9 } : { x: 15, line: 15 }
  return (
    <>
      <button
        type="button"
        onClick={() => {
          // кнопка прячется вместе с панелью — mouseleave не придёт, подсказку убираем сами
          hideTip()
          toggleShell(side)
        }}
        {...tipProps(label, null)}
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-ctl text-dim transition-colors hover:bg-white/[0.08] hover:text-fg ${className}`}
      >
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinejoin="round" aria-hidden>
          {open ? <path d={`M${bar.x} 4.5h6v15h-6z`} fill="currentColor" stroke="none" opacity={0.55} /> : null}
          <rect x="3" y="4.5" width="18" height="15" rx="3" />
          <path d={`M${bar.line} 4.5v15`} />
        </svg>
      </button>
      {tipNode}
    </>
  )
}
