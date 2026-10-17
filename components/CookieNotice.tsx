'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const KEY = 'tb-cookie-ok'

/**
 * Плашка про cookie — небольшая карточка в левом нижнем углу (на телефоне — снизу во всю ширину): значок-печенька
 * в графитовом круге, заголовок, одна строка и две кнопки в ряд — тихая «Подробнее» (/privacy) и лаймовая «Хорошо».
 * Выезжает снизу через секунду после загрузки и так же уезжает (`.cookie-in`/`.cookie-out`). Нужна по 152-ФЗ:
 * на сайте Яндекс Метрика с cookie и Вебвизором. Закрыли — запоминаем в localStorage и больше не показываем.
 */
export function CookieNotice() {
  const [state, setState] = useState<'hidden' | 'in' | 'out'>('hidden')
  useEffect(() => {
    let ok = false
    try {
      ok = Boolean(localStorage.getItem(KEY))
    } catch {}
    if (ok) return
    const t = window.setTimeout(() => setState('in'), 1000)
    return () => window.clearTimeout(t)
  }, [])
  if (state === 'hidden') return null
  const close = () => {
    try {
      localStorage.setItem(KEY, '1')
    } catch {}
    setState('out')
    window.setTimeout(() => setState('hidden'), 260)
  }
  return (
    <div
      role="region"
      aria-label="Cookie"
      className={`${state === 'out' ? 'cookie-out' : 'cookie-in'} fixed inset-x-3 bottom-[calc(var(--tabbar,0px)+4px)] z-[60] rounded-card bg-[#161c24]/90 p-4 text-[#eef2f6] shadow-[0_20px_60px_rgb(0_0_0/0.5),inset_0_0_0_1px_rgb(255_255_255/0.08),inset_0_1px_0_rgb(255_255_255/0.06)] backdrop-blur-xl sm:inset-x-auto sm:left-5 lg:bottom-5 sm:w-[360px] sm:p-5`}
    >
      <div className="flex gap-3.5">
        <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#232c37] to-[#161c24] shadow-[inset_0_1px_0_rgb(255_255_255/0.08),inset_0_0_0_1px_rgb(255_255_255/0.06)]">
          {/* печенька: круг с откушенным краем и крошками */}
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#c8ff2e]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.5 12.5A8.5 8.5 0 1 1 11.5 3.5a3 3 0 0 0 3.6 3.6 3 3 0 0 0 3.8 3.8c.5.6 1 1 1.6 1.6z" />
            <circle cx="9" cy="10" r="0.9" fill="currentColor" />
            <circle cx="14" cy="15" r="0.9" fill="currentColor" />
            <circle cx="8.5" cy="15.5" r="0.9" fill="currentColor" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold leading-snug">Мы используем cookie</p>
          <p className="mt-1 text-[13px] leading-relaxed text-[#eef2f6]/65">Яндекс Метрика помогает понять, какие разделы полезны. Пользуясь сайтом, вы соглашаетесь с этим.</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link
          href="/privacy"
          className="inline-flex h-10 items-center justify-center rounded-ctl bg-white/[0.07] text-[14px] font-medium text-[#eef2f6]/85 transition-colors hover:bg-white/[0.12] hover:text-[#eef2f6]"
        >
          Подробнее
        </Link>
        <button
          type="button"
          onClick={close}
          className="inline-flex h-10 items-center justify-center rounded-ctl bg-[#c8ff2e] text-[14px] font-semibold text-[#141a00] transition-colors hover:bg-[#d8ff6b]"
        >
          Хорошо
        </button>
      </div>
    </div>
  )
}
