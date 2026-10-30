import Link from 'next/link'
import type { FeedItem } from '@/lib/data'
import { formatTime, plural } from '@/lib/format'
import { matchHref } from '@/lib/links'
import { statFor } from '@/lib/story-groups'
import { TAG_BY_SLUG } from '@/lib/tags'
import { Carousel } from './Carousel'
import { BlockTitle, TitleIcon } from './Section'
import { StorySymbol, symbolSoft } from './story/StorySymbol'

// названия команд без кавычек, как в «Выгодно сегодня» и «Матче в фокусе» (владелец: «не пиши названия команд в скобках»)
const plain = (t: string) => t.replace(/[«»]/g, '')

type Fact = { item: FeedItem; slug: string; reason: string }

/**
 * Два факта дня для «Интересно сегодня» (владелец прислал прототип ChatGPT: «Интересно сегодня как на фото типа 2 факта»):
 * самые сильные поводы подборок у разных матчей и разных подборок, сначала у не начавшихся (факт — до матча), без
 * «Выгодно» (это реклама) и без матчей из «Матча в фокусе». Не случайно: иначе факты менялись бы при каждом обновлении.
 * До шести (владелец: «если будет больше 2 интересных фактов … чтоб можно было слайдить следующие? только … умеренно»).
 */
export function pickFacts(items: FeedItem[], skip: Set<number>, n = 6): Fact[] {
  const all = items
    .filter((i) => !skip.has(i.match.id) && i.match.status !== 'postponed' && i.match.status !== 'cancelled')
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

// крупная цифра факта и подпись к ней (владелец: прототип ChatGPT — «5 матчей» крупно над фактом): цифра — та же, что
// на кружке подборки (`statFor`, из повода), подпись — что она считает; не нашли цифру в поводе — без неё
function heroOf(slug: string, reason: string): { num: string; unit: string } | null {
  const num = statFor(slug, reason)
  if (!/\d/.test(num)) return null
  const n = Number(/\d+/.exec(num)?.[0] ?? 0)
  switch (slug) {
    case 'seriya':
    case 'krepost':
      return { num, unit: plural(n, ['матч', 'матча', 'матчей']) }
    case 'progruz':
      return { num, unit: 'кэф' }
    case 'tb-2-5':
    case 'tm-2-5':
    case 'obe-zabyut':
    case 'favorit':
      return { num, unit: /шанс/i.test(reason) ? 'шанс' : 'матчей' }
    case 'kadry':
      return { num: String(n), unit: `${plural(n, ['игрок', 'игрока', 'игроков'])} не сыграют` }
    case 'andedog':
      return { num, unit: `${plural(n, ['очко', 'очка', 'очков'])} разницы` }
    case 'h2h':
      return { num: num.replace('/', ' из '), unit: 'встреч' }
    case 'top-match':
      return { num: num.replace('·', ' и '), unit: 'места' }
    case 'uglovye':
      return { num, unit: 'угловых за матч' }
    case 'kartochki':
      return { num, unit: 'жёлтых за матч' }
  }
  return null
}

export function Interesting({ facts }: { facts: Fact[] }) {
  if (!facts.length) return null
  return (
    <section aria-labelledby="facts-title" className="min-w-0">
      <BlockTitle rows id="facts-title" title="Интересно сегодня" aside={<TitleIcon href="/tags" label="Все подборки" />} />
      {/* лентой вбок с точками (`Carousel`): на телефоне карточка 88% ширины и край следующей, от sm — две и край третьей */}
      <Carousel label="Интересно сегодня">
        {facts.map(({ item, slug, reason }) => {
          const m = item.match
          const tone = symbolSoft(slug)
          const hero = heroOf(slug, reason)
          return (
            // карточка залита цветом подборки 12%, как факт «Матча в фокусе»; сверху значок и название подборки
            <Link
              key={slug}
              href={matchHref(m)}
              className="flex flex-col rounded-card p-4 transition-[filter] hover:brightness-125"
              style={{ background: `color-mix(in oklch, ${tone} 12%, var(--color-panel-2))` }}
            >
              <p className="flex min-w-0 items-center gap-1.5 text-[13px] font-semibold" style={{ color: tone }}>
                <StorySymbol k={slug} tone={tone} className="h-4 w-4 shrink-0" />
                <span className="truncate">{TAG_BY_SLUG.get(slug)?.title}</span>
              </p>
              {hero ? (
                <p className="mt-3 flex items-baseline gap-2">
                  <span className="display-num text-[40px] leading-none">{hero.num}</span>
                  <span className="text-[16px] font-semibold" style={{ color: tone }}>
                    {hero.unit}
                  </span>
                </p>
              ) : null}
              <p className="mt-3 text-[15px] font-semibold leading-snug">{plain(reason)}</p>
              <span className="flex-1" />
              <p className="mt-3 border-t border-white/10 pt-3 text-[13px] leading-snug text-dim">
                {m.home.name} — {m.away.name} · {m.status === 'scheduled' ? formatTime(m.ts) : 'идёт'}
              </p>
            </Link>
          )
        })}
      </Carousel>
    </section>
  )
}
