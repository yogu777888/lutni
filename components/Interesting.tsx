import Link from 'next/link'
import type { FeedItem } from '@/lib/data'
import { formatTime } from '@/lib/format'
import { matchHref } from '@/lib/links'
import { TAG_BY_SLUG } from '@/lib/tags'
import { BlockTitle, TitleIcon } from './Section'
import { StorySymbol, symbolSoft } from './story/StorySymbol'

// названия команд без кавычек, как в «Выгодно сегодня» и «Матче в фокусе» (владелец: «не пиши названия команд в скобках»)
const plain = (t: string) => t.replace(/[«»]/g, '')

type Fact = { item: FeedItem; slug: string; reason: string }

/**
 * Два факта дня для «Интересно сегодня» (владелец прислал прототип ChatGPT: «Интересно сегодня как на фото типа 2 факта»):
 * самые сильные поводы подборок у разных матчей и разных подборок, сначала у не начавшихся (факт — до матча), без
 * «Выгодно» (это реклама) и без матча из «Матча в фокусе». Не случайно: иначе факты менялись бы при каждом обновлении.
 * До шести (владелец: «если будет больше 2 интересных фактов … чтоб можно было слайдить следующие? только … умеренно»).
 */
export function pickFacts(items: FeedItem[], skip: number | null, n = 6): Fact[] {
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
      {/* лентой вбок: на телефоне карточка 82% ширины и край следующей (в две колонки по ~165px факт вытягивался
          в восемь строк — владелец: «сузил блоки слишком»), от sm — две и край третьей; справа лента до края экрана */}
      <div
        className={
          facts.length > 1
            ? 'scrollbar-none -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2.5 overflow-x-auto px-4 [&>a]:shrink-0 [&>a]:basis-[82%] [&>a]:snap-start sm:[&>a]:basis-[calc((100%-10px)/2.15)]'
            : ''
        }
      >
        {facts.map(({ item, slug, reason }) => {
          const m = item.match
          return (
            <Link key={slug} href={matchHref(m)} className="card flex flex-col p-4 transition-colors hover:bg-panel-3">
              {/* значок подборки, как в прототипе — без подписи: название подборки в узкой карточке обрезалось */}
              <span title={TAG_BY_SLUG.get(slug)?.title}>
                <StorySymbol k={slug} tone={symbolSoft(slug)} className="h-6 w-6" />
              </span>
              <p className="mt-3 text-[15px] font-semibold leading-snug">{plain(reason)}</p>
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
