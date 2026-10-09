'use client'

import Link from 'next/link'

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-[44px] font-semibold leading-none tracking-[-0.04em] text-mute">Упс</p>
      <h1 className="mt-5 text-[22px] font-semibold tracking-tight">Данные временно недоступны</h1>
      <p className="mt-2 text-sm text-dim">Источник данных не ответил. Обычно это проходит за минуту.</p>
      <div className="mt-6 flex justify-center gap-2">
        <button onClick={reset} className="rounded-full bg-btn px-5 py-2.5 text-sm font-semibold text-btn-ink transition-colors hover:bg-btn-hover">
          Повторить
        </button>
        <Link href="/" className="rounded-full bg-white/[0.08] px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-white/[0.13]">
          На главную
        </Link>
      </div>
    </div>
  )
}
