import Link from 'next/link'
import { TAG_BY_SLUG, type TagDef } from '@/lib/tags'
import { tagChipClass, tagHashClass, type TagSize } from './tag-chip'

export { tagChipClass }

/** «#ТБ2.5» — решётка фирменным цветом, название — текстом. */
export function TagLabel({ tag }: { tag: TagDef }) {
  return (
    <>
      <span className={tagHashClass(tag.kind)}>#</span>
      {tag.label.replace(/^#/, '')}
    </>
  )
}

export function TagPill({
  slug,
  reason,
  size = 'sm',
  link = true,
  className = '',
}: {
  slug: string
  reason?: string
  size?: TagSize
  link?: boolean
  className?: string
}) {
  const t = TAG_BY_SLUG.get(slug)
  if (!t) return null
  const cls = `${tagChipClass(t.kind, size)} ${className}`
  if (!link) {
    return (
      <span title={reason ?? t.hint} className={cls}>
        <TagLabel tag={t} />
      </span>
    )
  }
  return (
    <Link href={`/tag/${t.slug}`} prefetch={false} title={reason ?? t.hint} className={`${cls} transition hover:brightness-125`}>
      <TagLabel tag={t} />
    </Link>
  )
}
