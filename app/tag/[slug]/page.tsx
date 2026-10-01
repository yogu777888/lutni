import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AdMark } from '@/components/AdMark'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { CtaLink } from '@/components/CtaLink'
import { FeedCard } from '@/components/FeedCard'
import { TagPill } from '@/components/TagPill'
import { primaryPartner } from '@/config/bookmakers'
import { isFeatured } from '@/config/leagues'
import { goHref } from '@/lib/affiliate'
import { getUpcomingFeed } from '@/lib/data'
import { pluralN } from '@/lib/format'
import { TAGS, TAG_BY_SLUG } from '@/lib/tags'
import { enqueueAnalysis } from '@/lib/warmer'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const t = TAG_BY_SLUG.get(slug)
  if (!t) return {}
  return {
    title: `${t.title}: матчи и прогнозы на сегодня и завтра`,
    description: `${t.hint}. ${t.about}`.slice(0, 200),
    alternates: { canonical: `/tag/${t.slug}` },
  }
}

export default async function TagPage({ params }: Props) {
  const { slug } = await params
  const t = TAG_BY_SLUG.get(slug)
  if (!t) notFound()

  const { items, ok } = await getUpcomingFeed(3)
  const hits = items
    .map((it) => ({ it, hit: it.tags.find((x) => x.slug === t.slug) }))
    .filter((x) => x.hit)
    .sort((a, b) => b.hit!.score - a.hit!.score || a.it.match.ts - b.it.match.ts)
    .map((x) => x.it)

  // «глубокие» теги требуют разбора матча — ставим топ-матчи в фоновую очередь
  const pending = items.filter((i) => !i.summary && i.match.status === 'scheduled' && isFeatured(i.match.league))
  if (t.deep && pending.length) enqueueAnalysis(pending.slice(0, 30).map((i) => i.match.id))

  const partner = primaryPartner()

  return (
    <>
      <Breadcrumbs items={[{ href: '/tags', label: 'Теги' }, { href: `/tag/${t.slug}`, label: t.title }]} />
      <div className="pitch-bg card mb-8 p-6 sm:p-8">
        <TagPill slug={t.slug} size="md" link={false} />
        <h1 className="mt-4 text-[26px] font-bold leading-tight tracking-[-0.03em] sm:text-[34px]">{t.title}: матчи на сегодня и ближайшие дни</h1>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-dim">{t.about}</p>
        <p className="mt-2 text-[14px] text-mute">
          Что обычно ставят: <span className="font-medium text-fg">{t.bet}</span>
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <CtaLink href={goHref(partner, 'tag')}>Сделать ставку в БК {partner.name}</CtaLink>
          <AdMark partner={partner} />
        </div>
      </div>

      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-[17px] font-semibold">
          {hits.length ? pluralN(hits.length, ['матч', 'матча', 'матчей']) : 'Матчей пока нет'}
        </h2>
        <span className="text-[12px] text-mute">сильные сигналы — выше</span>
      </div>
      {!ok ? <div className="card mb-4 p-4 text-sm text-dim">Источник данных временно недоступен — список может быть неполным.</div> : null}
      {hits.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {hits.slice(0, 60).map((it) => (
            <FeedCard key={it.match.id} item={it} tagSlug={t.slug} />
          ))}
        </div>
      ) : (
        <div className="card p-6 text-sm text-dim">
          Сейчас нет матчей с этим тегом.{' '}
          {t.deep ? 'Этот тег появляется после разбора матча — мы анализируем ближайшие игры топ-лиг в фоне, загляните чуть позже.' : ''}
        </div>
      )}

      <div className="mt-10">
        <div className="mb-3 text-[13px] font-medium text-mute">Другие теги</div>
        <div className="flex flex-wrap gap-2">
          {TAGS.filter((x) => x.slug !== t.slug).map((x) => (
            <TagPill key={x.slug} slug={x.slug} size="md" />
          ))}
        </div>
        <Link href="/tags" className="mt-4 inline-block text-[13px] font-medium text-fg transition-opacity hover:opacity-75">
          Что означают теги →
        </Link>
      </div>
    </>
  )
}
