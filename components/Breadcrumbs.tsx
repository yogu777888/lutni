import Link from 'next/link'
import { SITE } from '@/config/site'
import { JsonLd } from './JsonLd'

export type Crumb = { href: string; label: string }

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all = [{ href: '/', label: 'Матчи' }, ...items]
  return (
    <>
      <nav aria-label="Навигация" className="scrollbar-none mb-4 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap text-[12px] text-mute">
        {all.map((c, i) => (
          <span key={c.href} className="flex items-center gap-1.5">
            {i > 0 ? <span className="text-mute">/</span> : null}
            {i < all.length - 1 ? (
              <Link href={c.href} className="transition-colors hover:text-fg">
                {c.label}
              </Link>
            ) : (
              <span className="text-dim">{c.label}</span>
            )}
          </span>
        ))}
      </nav>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: all.map((c, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: c.label,
            item: `${SITE.url}${c.href}`,
          })),
        }}
      />
    </>
  )
}
