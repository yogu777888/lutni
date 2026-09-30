import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="font-display text-6xl font-bold text-acid">404</p>
      <h1 className="mt-4 font-display text-xl font-bold">Страница не найдена</h1>
      <p className="mt-2 text-sm text-dim">Возможно, матч удалён из линии или ссылка устарела.</p>
      <Link href="/" className="mt-6 inline-flex rounded-xl bg-acid px-5 py-2.5 text-sm font-bold text-acid-ink">
        Матчи сегодня
      </Link>
    </div>
  )
}
