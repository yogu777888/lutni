'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const KEY = 'tb-cookie-ok'

/**
 * Плашка про cookie — светлая полоса во всю ширину у нижнего края, как у Spotify: слева заголовок и одна фраза,
 * справа две крупные кнопки-капсулы — «Принять» (графитовая, не лайм: лайм у нас — деньги) и «Подробнее» (/privacy).
 * Без значка и рамок. На телефоне кнопки — строкой под текстом, полоса перекрывает нижнее меню, пока не закроют.
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
      className={`${state === 'out' ? 'cookie-out' : 'cookie-in'} fixed inset-x-0 bottom-0 z-[60] bg-[#e6e9ed] text-ink shadow-[0_-20px_60px_rgb(0_0_0/0.45)]`}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-6 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:py-8">
        <div className="max-w-[62ch]">
          <p className="text-[20px] font-bold leading-tight">Мы используем cookie</p>
          <p className="mt-2 text-[15px] leading-relaxed text-ink/75">
            Яндекс Метрика помогает понять, какие разделы полезны. Пользуясь сайтом, вы соглашаетесь с этим.
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-3 lg:flex">
          <button
            type="button"
            onClick={close}
            className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-9 text-[15px] font-semibold text-white transition-colors hover:bg-[#232b35]"
          >
            Принять
          </button>
          <Link
            href="/privacy"
            className="inline-flex h-12 items-center justify-center rounded-full px-7 text-[15px] font-semibold text-ink shadow-[inset_0_0_0_1.5px_rgb(11_15_20/0.25)] transition-colors hover:shadow-[inset_0_0_0_1.5px_rgb(11_15_20/0.6)]"
          >
            Подробнее
          </Link>
        </div>
      </div>
    </div>
  )
}
