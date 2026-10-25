'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { readConsent, setConsent, useConsent } from './consent'

/**
 * Плашка про cookie — стеклянная плашка внизу по центру, тем же стеклом, что нижнее меню и плашка ставки
 * (`#151b22/90`, обводка и блик сверху): от sm — одной строкой «Мы используем cookie, чтобы… Подробнее» и две
 * капсулы справа, на телефоне — текст и капсулы во всю ширину под ним, над нижним меню. «Отказаться» и «Принять» —
 * одного размера (отказаться так же легко, как согласиться); «Принять» белая (лайм — деньги). Без названий сервисов —
 * они на /privacy. Выбор — `components/consent.ts`; Метрика грузится только после «Принять». Нет выбора — плашка
 * выезжает через секунду (`.cookie-in`/`.cookie-out`); «Изменить выбор» на /privacy снова её показывает.
 */
export function CookieNotice() {
  const consent = useConsent()
  const [state, setState] = useState<'hidden' | 'in' | 'out'>('hidden')
  useEffect(() => {
    if (consent !== null) return
    const t = window.setTimeout(() => setState('in'), 1000)
    return () => window.clearTimeout(t)
  }, [consent])
  if (state === 'hidden') return null
  const choose = (v: 'yes' | 'no') => {
    const was = readConsent()
    setConsent(v)
    setState('out')
    window.setTimeout(() => setState('hidden'), 260)
    // Метрику, которая уже работает, не выгрузить — отказ после согласия вступает в силу с перезагрузкой
    if (v === 'no' && was === 'yes') window.setTimeout(() => location.reload(), 280)
  }
  const btn = 'inline-flex h-10 items-center justify-center rounded-full px-5 text-[14px] font-semibold transition-colors'
  return (
    <div
      role="region"
      aria-label="Cookie"
      className={`${state === 'out' ? 'cookie-out' : 'cookie-in'} fixed inset-x-3 bottom-[calc(var(--tabbar,0px)+8px)] z-[60] mx-auto max-w-[720px] rounded-slab bg-[#151b22]/90 p-4 shadow-[0_16px_48px_rgb(0_0_0/0.5),inset_0_0_0_1px_rgb(255_255_255/0.08),inset_0_1px_0_rgb(255_255_255/0.06)] backdrop-blur-xl sm:flex sm:items-center sm:gap-5 sm:py-3 sm:pl-6 sm:pr-3 lg:bottom-4`}
    >
      <p className="min-w-0 flex-1 text-[14px] leading-snug text-dim">
        <span className="font-semibold text-fg">Мы используем cookie</span>, чтобы сайт работал удобнее и мы видели, что улучшать.{' '}
        <Link href="/privacy" className="whitespace-nowrap text-fg/85 underline decoration-white/25 underline-offset-[3px] hover:text-fg hover:decoration-white/60">
          Подробнее
        </Link>
      </p>
      <div className="mt-3 grid shrink-0 grid-cols-2 gap-2 sm:mt-0 sm:flex">
        <button type="button" onClick={() => choose('no')} className={`${btn} bg-white/[0.08] text-fg/85 hover:bg-white/[0.14] hover:text-fg`}>
          Отказаться
        </button>
        <button type="button" onClick={() => choose('yes')} className={`${btn} bg-white text-ink hover:bg-white/85`}>
          Принять
        </button>
      </div>
    </div>
  )
}

/** Кнопка на /privacy: сбросить выбор и снова показать плашку. */
export function ConsentReset() {
  return (
    <button
      type="button"
      onClick={() => setConsent(null)}
      className="mt-3 inline-flex h-10 items-center rounded-ctl bg-white/[0.08] px-4 text-[14px] font-medium text-fg/85 transition-colors hover:bg-white/[0.14] hover:text-fg"
    >
      Изменить выбор cookie
    </button>
  )
}
