'use client'

import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'

/** Букмекер в меню: только сериализуемое — `Partner` целиком с RegExp в клиентский компонент не передать. */
export type PickBook = { slug: string; name: string; color: string }

const KEY = 'tb-odds'
const EVENT = 'tb-odds'

function read(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

function write(v: string | null) {
  try {
    if (v) localStorage.setItem(KEY, v)
    else localStorage.removeItem(KEY)
  } catch {}
  const h = document.documentElement
  if (v) h.setAttribute('data-odds', v)
  else h.removeAttribute('data-odds')
  window.dispatchEvent(new Event(EVENT))
}

function Logo({ b, size }: { b: PickBook; size: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- маленький SVG
    <img
      src={`/bookmakers/${b.slug}.svg`}
      alt=""
      aria-hidden
      width={size}
      height={size}
      className="shrink-0 outline outline-1 -outline-offset-1 outline-white/10"
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.25), background: b.color }}
    />
  )
}

/**
 * Меню «чьи кэфы»: PARI, Марафон… и «Без кэфов» (`lib/odds-pick.ts`). `chip` — ниже lg, круглым чипом в ряду дней (знак
 * букмекера), иначе — кнопкой «Кэфы PARI» рядом с «По турнирам / По времени». Выбор общий для всех меню на странице и
 * запоминается в браузере; по умолчанию — первый (`books[0]`, главный партнёр).
 */
export function OddsPick({ books, chip = false, className = '' }: { books: PickBook[]; chip?: boolean; className?: string }) {
  const [cur, setCur] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sync = () => setCur(read())
    sync()
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const away = (e: Event) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  if (!books.length) return null
  const off = cur === 'off'
  // выбран букмекер, которого на странице нет, — показываем его имя всё равно: выбор не теряется
  // незнакомый слаг скрипт в <head> не ставит — в строках тогда первая линия, и здесь первый букмекер
  const chosen = off ? null : (books.find((b) => b.slug === cur) ?? books[0])
  const label = off ? 'Без кэфов' : chosen ? `Кэфы ${chosen.name}` : 'Кэфы'
  const pick = (v: string) => {
    write(v)
    setOpen(false)
  }
  const opts: { v: string; name: string; b?: PickBook }[] = [...books.map((b) => ({ v: b.slug, name: b.name, b })), { v: 'off', name: 'Без кэфов' }]
  const on = (v: string) => (cur ? cur === v : v === books[0].slug)

  return (
    <div ref={box} className={`relative shrink-0 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}. Выбрать, чьи кэфы показывать`}
        title={`${label} · выбрать, чьи кэфы показывать`}
        className={
          chip
            ? 'grid h-9 w-10 place-items-center rounded-ctl text-dim transition-colors active:bg-white/12'
            : 'inline-flex h-9 items-center gap-1 rounded-ctl bg-white/[0.04] px-2 text-dim transition-colors hover:bg-white/12 hover:text-fg'
        }
      >
        {chip ? (
          chosen ? <Logo b={chosen} size={18} /> : <span className="num text-[12px] font-semibold text-mute line-through">1X2</span>
        ) : (
          <>
            {/* только знак букмекера, без «Кэфы Марафон»: со словами строка дней переносилась на второй ряд (владелец:
                «может просто иконку ставить чтоб не ломалось?»); название — в подсказке и для диктора */}
            {chosen ? <Logo b={chosen} size={20} /> : <span className="num px-0.5 text-[12px] font-semibold text-mute line-through">1X2</span>}
            <Icon k="chevron-down" size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>
      {open ? (
        <div
          role="listbox"
          aria-label="Чьи кэфы показывать"
          className={`absolute top-full z-50 mt-2 w-56 overflow-hidden rounded-tile bg-panel-3 py-1 shadow-[0_12px_32px_rgb(0_0_0/0.5)] ${chip ? 'left-0' : 'right-0'}`}
        >
          {opts.map((o) => (
            <button
              key={o.v}
              type="button"
              role="option"
              aria-selected={on(o.v)}
              onClick={() => pick(o.v)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-[15px] text-fg transition-colors hover:bg-white/[0.06]"
            >
              {o.b ? <Logo b={o.b} size={24} /> : <span aria-hidden className="grid h-6 w-6 place-items-center rounded-md bg-white/[0.08] text-[12px] text-mute">—</span>}
              <span className="min-w-0 flex-1 truncate">{o.name}</span>
              <span aria-hidden className={`grid h-[18px] w-[18px] place-items-center rounded-full border-2 ${on(o.v) ? 'border-fg' : 'border-white/30'}`}>
                {on(o.v) ? <span className="h-2 w-2 rounded-full bg-fg" /> : null}
              </span>
            </button>
          ))}
          <p className="border-t border-edge px-3 py-2 text-[12px] text-mute">Кэфы — ссылки к букмекеру · Реклама · 18+</p>
        </div>
      ) : null}
    </div>
  )
}
