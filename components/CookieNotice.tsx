'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const KEY = 'tb-cookie-ok'

/**
 * Плашка про cookie — широкая графитовая панель внизу, как панели сайта (`bg-panel`, `rounded-card`, от краёв 8px —
 * как зазоры каркаса): слева «Мы используем cookie» 20px и фраза 15px серым, справа (на телефоне — строкой под
 * текстом) кнопки 44px `rounded-ctl` — белая «Принять» (как кнопки навигации; лайм у нас — деньги) и тихая
 * «Подробнее» (/privacy). На телефоне — над нижним меню. Выезжает снизу через секунду после загрузки и так же уезжает
 * (`.cookie-in`/`.cookie-out`). Нужна по 152-ФЗ: на сайте Яндекс Метрика с cookie и Вебвизором. Закрыли —
 * запоминаем в localStorage и больше не показываем.
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
      className={`${state === 'out' ? 'cookie-out' : 'cookie-in'} fixed inset-x-2 bottom-[calc(var(--tabbar,0px)+8px)] z-[60] rounded-card bg-panel shadow-[0_-12px_48px_rgb(0_0_0/0.55),inset_0_0_0_1px_rgb(255_255_255/0.06),inset_0_1px_0_rgb(255_255_255/0.05)] lg:bottom-2`}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:px-8 lg:py-6">
        <div className="max-w-[62ch]">
          <p className="text-[20px] font-semibold leading-tight text-fg">Мы используем cookie</p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-dim">
            Яндекс Метрика помогает понять, какие разделы полезны. Пользуясь сайтом, вы соглашаетесь с этим.
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 lg:flex">
          <Link
            href="/privacy"
            className="inline-flex h-11 items-center justify-center rounded-ctl bg-white/[0.07] px-6 text-[15px] font-medium text-fg/85 transition-colors hover:bg-white/[0.12] hover:text-fg"
          >
            Подробнее
          </Link>
          <button
            type="button"
            onClick={close}
            className="inline-flex h-11 items-center justify-center rounded-ctl bg-white px-8 text-[15px] font-semibold text-ink transition-colors hover:bg-white/85"
          >
            Принять
          </button>
        </div>
      </div>
    </div>
  )
}
