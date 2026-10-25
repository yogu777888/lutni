'use client'

import { useRailTip } from './RailTip'
import { toggleShell, type Side } from './shell-state'
import { Icon } from '../Icon'

/**
 * Свернуть / развернуть боковую панель. Значок — общепринятый «боковая панель» (рамка с полосой у края панели), как у
 * Spotify, macOS и VS Code: стрелка «<» у левой панели читалась как «назад» (владелец согласился). Развёрнута — полоса
 * залита, свёрнута — только контур (набор владельца; у правой панели — зеркально). Подсказка — та же, что у значков полосок (`useRailTip`).
 */
export function PanelToggle({ side, open, className = '' }: { side: Side; open: boolean; className?: string }) {
  const { tipProps, tipNode, hideTip } = useRailTip(side, '')
  const label = open ? 'Свернуть панель' : 'Развернуть панель'
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
        <Icon k={open ? 'sidebar-fill' : 'sidebar-outline'} className={`h-[18px] w-[18px] ${side === 'r' ? '-scale-x-100' : ''}`} />
      </button>
      {tipNode}
    </>
  )
}
