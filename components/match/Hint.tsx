'use client'

import { useEffect, useId, useRef, useState } from 'react'

/**
 * ⓘ с объяснением (владелец согласился: на телефоне подсказка `title` не открывается вовсе, а мышью — через секунду
 * системным жёлтым окошком): при наведении мышью, по нажатию и с клавиатуры; закрывается нажатием мимо и Esc.
 * Окошко — под ближайшим `relative`-предком во всю его ширину (у строки статистики — под строкой): привязанное к самому
 * ⓘ, на телефоне 360px оно уходило за край экрана.
 */
export function Hint({ title, text }: { title: string; text: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const id = useId()
  useEffect(() => {
    if (!open) return
    const off = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', off)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', off)
      document.removeEventListener('keydown', esc)
    }
  }, [open])
  return (
    <span
      ref={ref}
      className="inline-block"
      onPointerEnter={(e) => e.pointerType === 'mouse' && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setOpen(false)}
    >
      <button
        type="button"
        aria-label={`Что такое «${title}»`}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={`relative ml-1 transition-colors after:absolute after:-inset-2 hover:text-fg ${open ? 'text-fg' : 'text-mute/70'}`}
      >
        ⓘ
      </button>
      {open ? (
        <span
          id={id}
          role="tooltip"
          className="absolute inset-x-0 top-full z-20 mx-auto mt-1.5 block max-w-sm rounded-tile border border-edge bg-panel-2 px-3 py-2 text-left text-[13px] leading-snug text-dim shadow-[0_10px_30px_rgb(0_0_0/0.45)]"
        >
          <b className="mb-0.5 block font-semibold text-fg">{title}</b>
          {text}
        </span>
      ) : null}
    </span>
  )
}
