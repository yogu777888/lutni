import Link from 'next/link'
import { TAG_BY_SLUG } from '@/lib/tags'

export function TagStrip({ counts, title = 'Теги дня' }: { counts: [string, number][]; title?: string }) {
  if (!counts.length) return null
  return (
    <div className="mb-5">
      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-mute">{title}</div>
      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {counts.map(([slug, n]) => {
          const t = TAG_BY_SLUG.get(slug)
          if (!t) return null
          return (
            <Link
              key={slug}
              href={`/tag/${slug}`}
              prefetch={false}
              title={t.hint}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-bold ring-1 ring-inset transition hover:brightness-125 ${t.tone}`}
            >
              {t.label}
              <span className="num rounded-full bg-black/30 px-1.5 text-[11px] font-semibold">{n}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
