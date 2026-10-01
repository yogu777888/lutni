import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-[64px] font-semibold leading-none tracking-[-0.04em] text-mute">404</p>
      <h1 className="mt-5 text-[22px] font-semibold tracking-tight">Страница не найдена</h1>
      <p className="mt-2 text-sm text-dim">Возможно, матч удалён из линии или ссылка устарела.</p>
      <Link href="/" className="mt-7 inline-flex rounded-full bg-fg px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-white">
        Матчи сегодня
      </Link>
    </div>
  )
}
