'use client'

import Link from 'next/link'

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="font-display text-4xl font-bold text-acid">Упс</p>
      <h1 className="mt-4 font-display text-xl font-bold">Данные временно недоступны</h1>
      <p className="mt-2 text-sm text-dim">Источник данных не ответил. Обычно это проходит за минуту.</p>
      <div className="mt-6 flex justify-center gap-2">
        <button onClick={reset} className="rounded-xl bg-acid px-5 py-2.5 text-sm font-bold text-acid-ink">
          Повторить
        </button>
        <Link href="/" className="rounded-xl bg-panel-3 px-5 py-2.5 text-sm font-bold ring-1 ring-inset ring-edge-2">
          На главную
        </Link>
      </div>
    </div>
  )
}
