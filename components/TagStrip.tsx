import Link from 'next/link'
import { TAG_BY_SLUG } from '@/lib/tags'
import { TagLabel, tagChipClass } from './TagPill'

export function TagStrip({ counts }: { counts: [string, number][] }) {
  if (!counts.length) return null
  return (
    <nav aria-label="Теги дня" className="scrollbar-none -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
      {counts.map(([slug, n]) => {
        const t = TAG_BY_SLUG.get(slug)
        if (!t) return null
        return (
          <Link key={slug} href={`/tag/${slug}`} prefetch={false} title={t.hint} className={`${tagChipClass(t.kind, 'md')} shrink-0 gap-2 transition hover:brightness-110`}>
            <span>
              <TagLabel tag={t} />
            </span>
            <span className={`num text-[12px] ${t.kind === 'accent' ? 'text-acid-ink/60' : 'text-dim'}`}>{n}</span>
          </Link>
        )
      })}
    </nav>
  )
}
