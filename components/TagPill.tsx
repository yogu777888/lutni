import Link from 'next/link'
import { TAG_BY_SLUG, type TagDef } from '@/lib/tags'

const KIND: Record<TagDef['kind'], { chip: string; hash: string }> = {
  accent: { chip: 'bg-acid text-acid-ink ring-acid', hash: 'text-acid-ink/55' },
  hot: { chip: 'bg-hot/12 text-hot ring-hot/35', hash: 'text-hot/70' },
  neutral: { chip: 'bg-panel-2 text-fg ring-edge-2', hash: 'text-acid' },
}

const SIZE = {
  xs: 'h-5 px-1.5 text-[11px]',
  sm: 'h-6 px-2 text-[12px]',
  md: 'h-8 px-3 text-[13px]',
}

export function tagChipClass(kind: TagDef['kind'], size: keyof typeof SIZE = 'sm') {
  return `inline-flex items-center whitespace-nowrap rounded-full font-semibold ring-1 ring-inset ${KIND[kind].chip} ${SIZE[size]}`
}

/** «#ТБ2.5» — решётка фирменным цветом, название — текстом. */
export function TagLabel({ tag }: { tag: TagDef }) {
  return (
    <>
      <span className={KIND[tag.kind].hash}>#</span>
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
  size?: 'xs' | 'sm' | 'md'
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
    <Link href={`/tag/${t.slug}`} prefetch={false} title={reason ?? t.hint} className={`${cls} transition hover:brightness-110 hover:ring-edge-2`}>
      <TagLabel tag={t} />
    </Link>
  )
}
