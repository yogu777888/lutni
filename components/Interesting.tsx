import Link from 'next/link'
import type { FeedItem } from '@/lib/data'
import { formatTime } from '@/lib/format'
import { matchHref } from '@/lib/links'
import { TAG_BY_SLUG } from '@/lib/tags'
import { BlockTitle, TitleIcon } from './Section'
import { StorySymbol, symbolSoft } from './story/StorySymbol'

type Fact = { item: FeedItem; slug: string; reason: string }

/**
 * Два факта дня для «Интересно сегодня» (владелец прислал прототип ChatGPT: «Интересно сегодня как на фото типа 2 факта»):
 * самые сильные поводы подборок у разных матчей и разных подборок, сначала у не начавшихся (факт — до матча), без
 * «Выгодно» (это реклама) и без матча из «Матча в фокусе». Не случайно: иначе факты менялись бы при каждом обновлении.
 */
export function pickFacts(items: FeedItem[], skip: number | null, n = 2): Fact[] {
  const all = items
    .filter((i) => i.match.id !== skip && i.match.status !== 'postponed' && i.match.status !== 'cancelled')
    .flatMap((item) => item.tags.filter((t) => t.slug !== 'value' && t.reason && TAG_BY_SLUG.has(t.slug)).map((t) => ({ item, t })))
    .sort((a, b) => Number(b.item.match.status === 'scheduled') - Number(a.item.match.status === 'scheduled') || b.t.score - a.t.score)
  const out: Fact[] = []
  for (const { item, t } of all) {
    if (out.length >= n) break
    if (out.some((f) => f.slug === t.slug || f.item.match.id === item.match.id)) continue
    out.push({ item, slug: t.slug, reason: t.reason })
  }
  return out
}

export function Interesting({ facts }: { facts: Fact[] }) {
  if (!facts.length) return null
  return (
    <section aria-labelledby="facts-title" className="min-w-0">
      <BlockTitle rows id="facts-title" title="Интересно сегодня" aside={<TitleIcon href="/tags" label="Все подборки" />} />
      <div className="grid grid-cols-2 gap-2.5">
        {facts.map(({ item, slug, reason }) => {
          const m = item.match
          return (
            <Link key={slug} href={matchHref(m)} className="card flex flex-col p-4 transition-colors hover:bg-panel-3">
              {/* значок подборки, как в прототипе — без подписи: название подборки в узкой карточке обрезалось */}
              <span title={TAG_BY_SLUG.get(slug)?.title}>
                <StorySymbol k={slug} tone={symbolSoft(slug)} className="h-6 w-6" />
              </span>
              <p className="mt-3 text-[15px] font-semibold leading-snug">{reason}</p>
              <p className="mt-auto pt-3 text-[13px] leading-snug text-dim">
                {m.home.name} — {m.away.name} · {m.status === 'scheduled' ? formatTime(m.ts) : 'идёт'}
              </p>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
