import Link from 'next/link'
import { TAG_BY_SLUG } from '@/lib/tags'

export function TagPill({
  slug,
  reason,
  size = 'sm',
  link = true,
  className = '',
}: {
  slug: string
  reason?: string
  size?: 'sm' | 'md'
  link?: boolean
  className?: string
}) {
  const t = TAG_BY_SLUG.get(slug)
  if (!t) return null
  const cls = `inline-flex items-center whitespace-nowrap rounded-full font-semibold ring-1 ring-inset ${t.tone} ${
    size === 'sm' ? 'px-2 py-0.5 text-[11px] leading-4' : 'px-3 py-1 text-sm'
  } ${className}`
  if (!link) {
    return (
      <span title={reason ?? t.hint} className={cls}>
        {t.label}
      </span>
    )
  }
  return (
    <Link href={`/tag/${t.slug}`} prefetch={false} title={reason ?? t.hint} className={`${cls} transition hover:brightness-125`}>
      {t.label}
    </Link>
  )
}
