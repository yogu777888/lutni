'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'

type Tip = { title: string; sub: React.ReactNode; x: number; y: number; left: boolean }

/**
 * Подсказка у значков свёрнутой боковой панели (как у Spotify): название и тихая подпись, сразу и в стиле сайта
 * (системный title — поздно и мелко). Слева — справа от значка, справа — слева от него. В body порталом и
 * `position: fixed`: полоска прокручивается и обрезает выходящее за край, а панель — свой слой ниже центра.
 * `className` — класс показа свёрнутой полоски (`shell-l-rail`/`shell-r-rail`): развернули панель — подсказки нет;
 * пусто — видна всегда (кнопка «свернуть / развернуть панель»).
 */
export function useRailTip(side: 'l' | 'r', className: string) {
  const [tip, setTip] = useState<Tip | null>(null)
  const on = (title: string, sub: React.ReactNode) => (e: React.SyntheticEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setTip({ title, sub, x: side === 'l' ? r.right + 12 : r.left - 12, y: r.top + r.height / 2, left: side === 'r' })
  }
  const tipProps = (title: string, sub: React.ReactNode) => ({
    'aria-label': title,
    onMouseEnter: on(title, sub),
    onFocus: on(title, sub),
    onMouseLeave: () => setTip(null),
    onBlur: () => setTip(null),
  })
  const tipNode = tip
    ? createPortal(
        <div
          role="tooltip"
          style={{ left: tip.x, top: tip.y }}
          className={`${className} pointer-events-none fixed z-50 flex-col whitespace-nowrap rounded-tile bg-panel-3 px-3 py-2 leading-tight shadow-lg shadow-black/40 ${
            tip.left ? '-translate-x-full -translate-y-1/2' : '-translate-y-1/2'
          }`}
        >
          <span className="block text-[14px] font-medium">{tip.title}</span>
          {tip.sub ? <span className="mt-0.5 block text-[12.5px] text-mute">{tip.sub}</span> : null}
        </div>,
        document.body,
      )
    : null
  return { tipProps, tipNode, hideTip: () => setTip(null) }
}
