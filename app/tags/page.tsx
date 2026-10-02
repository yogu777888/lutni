import type { Metadata } from 'next'
import Link from 'next/link'
import { getUpcomingFeed } from '@/lib/data'
import { pluralN } from '@/lib/format'
import { TagLabel, tagChipClass } from '@/components/TagPill'
import { TAGS } from '@/lib/tags'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Теги ставок на футбол: value, прогрузы, тоталы, «обе забьют»',
  description:
    'Все теги tag.bet: value-ставки, прогрузы коэффициентов, тотал больше и меньше 2.5, «обе забьют», фавориты, андердоги в форме, серии и кадровые потери. Матчи на сегодня и ближайшие дни.',
  alternates: { canonical: '/tags' },
}

export default async function TagsPage() {
  const { items } = await getUpcomingFeed(3)
  const counts = new Map<string, number>()
  for (const it of items) for (const t of it.tags) counts.set(t.slug, (counts.get(t.slug) ?? 0) + 1)

  return (
    <>
      <div className="mb-8 pt-2">
        <h1 className="display text-[36px] sm:text-[56px]">Теги ставок</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-dim">
          Каждый матч автоматически получает теги по данным: линии букмекеров без маржи, модели голов, форме команд, личным встречам и
          травмам. Тег — это готовая идея для ставки с объяснением, почему она появилась.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TAGS.map((t) => {
          const n = counts.get(t.slug) ?? 0
          return (
            <Link key={t.slug} href={`/tag/${t.slug}`} className="card group flex flex-col p-5 transition-colors hover:bg-panel-2">
              <div className="flex items-center justify-between">
                <span className={tagChipClass(t.kind, 'md')}>
                  <TagLabel tag={t} />
                </span>
                <span className="num text-[12px] text-mute">{n ? pluralN(n, ['матч', 'матча', 'матчей']) : 'нет матчей'}</span>
              </div>
              <h2 className="mt-4 text-[16px] font-semibold">{t.title}</h2>
              <p className="mt-1 text-[14px] text-dim">{t.hint}</p>
              <p className="mt-3 text-[12px] text-mute">Ставка: {t.bet}</p>
            </Link>
          )
        })}
      </div>
    </>
  )
}
