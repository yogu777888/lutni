'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { LOOKS, LOOK_COOKIE, type Look } from '@/lib/looks'

/**
 * Переключатель вида виджетов — справа от заголовка страницы, только в демо и при разработке: владелец сравнивает
 * подачу на настоящей странице, а плитки ничем не закрыты. Выбор — в cookie на год; страница перерисовывается
 * на сервере (`router.refresh`).
 */
export function LookSwitcher({ current }: { current: Look }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const pick = (k: Look) => {
    document.cookie = `${LOOK_COOKIE}=${k}; path=/; max-age=31536000; samesite=lax`
    start(() => router.refresh())
  }
  return (
    <div
      role="radiogroup"
      aria-label="Вид виджетов"
      className={`flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-[14px] bg-white/[0.04] p-1 transition-opacity sm:pl-3.5 ${pending ? 'opacity-70' : ''}`}
    >
      <span className="mr-1.5 hidden whitespace-nowrap text-[13px] text-dim sm:inline">Вид виджетов</span>
      {LOOKS.map((l) => (
        <button
          key={l.key}
          type="button"
          role="radio"
          aria-checked={l.key === current}
          onClick={() => pick(l.key)}
          className={`h-8 whitespace-nowrap rounded-[10px] px-3 text-[13px] font-medium transition-colors ${l.key === current ? 'bg-white/[0.12] text-fg' : 'text-dim hover:text-fg'}`}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
