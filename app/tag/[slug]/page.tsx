import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AdMark } from '@/components/AdMark'
import { BlockHead } from '@/components/BlockHead'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { CtaLink } from '@/components/CtaLink'
import { FeedCard } from '@/components/FeedCard'
import { TagPill } from '@/components/TagPill'
import { getPartner, primaryPartner } from '@/config/bookmakers'
import { isFeatured } from '@/config/leagues'
import { goHref, SPONSORED_REL } from '@/lib/affiliate'
import { getUpcomingFeed, type FeedItem } from '@/lib/data'
import { appNow, dayLabel, formatDayMonth, formatTime, pct, pluralN, signedPct, todayYmd, ymdInTz } from '@/lib/format'
import { matchHref } from '@/lib/links'
import { outcomeText } from '@/lib/verdict'
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

/** «Сегодня», «Завтра · 18 октября», «пн, 19 октября». */
function dayHead(ymd: string, ts: number, today: string) {
  const l = dayLabel(ymd, today)
  return l === 'Завтра' ? `${l} · ${formatDayMonth(ts)}` : l
}

/**
 * Строка выгодной ставки (владелец: «а страница выгодно как?», согласился): исход словами, матч, «шанс · честная цена ·
 * выгода» и лаймовая кнопка с кэфом и букмекером — к тому, у кого ставка выгодна (раньше единственная кнопка вела в PARI,
 * а 4 из 9 ставок были у Марафона и кэф стоял только текстом). Без «П1/ТБ», чипов других подборок и кэфов из общего списка.
 */
function ValueRow({ it }: { it: FeedItem }) {
  const m = it.match
  const p = it.summary!.pick!
  const partner = getPartner(p.partnerSlug!)!
  return (
    <div className="relative grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-x-4 px-4 py-3 transition-colors hover:bg-white/[0.02] sm:grid-cols-[3.75rem_minmax(0,1fr)_auto] sm:px-5">
      <span className="num display-num self-start pt-0.5 text-[18px]">{formatTime(m.ts)}</span>
      <div className="min-w-0">
        <Link href={matchHref(m)} prefetch={false} className="block text-[15px] font-semibold leading-snug first-letter:uppercase after:absolute after:inset-0 sm:text-[16px]">
          {outcomeText(p.key, m)}
        </Link>
        <p className="mt-0.5 truncate text-[13px] text-dim">
          {m.home.name} — {m.away.name} · {m.league.name}
        </p>
        <p className="mt-0.5 text-[12.5px] text-mute">
          шанс {pct(p.prob)} · честная цена {(1 / p.prob).toFixed(2)}
          {p.ev != null ? <span className="text-good"> · выгода {signedPct(p.ev)}</span> : null}
        </p>
      </div>
      <div className="relative z-10 flex flex-col items-end gap-1">
        <a
          href={goHref(partner, 'value', m.id)}
          target="_blank"
          rel={SPONSORED_REL}
          title={`${outcomeText(p.key, m)}: ${p.odd!.toFixed(2)} в ${partner.name} · Реклама 18+`}
          className="flex h-11 min-w-[76px] flex-col items-center justify-center rounded-ctl bg-acid px-3 leading-none text-acid-ink transition-colors hover:bg-acid/85"
        >
          <span className="num text-[16px] font-bold">{p.odd!.toFixed(2)}</span>
          <span className="mt-0.5 text-[11px] font-medium">{partner.name}</span>
        </a>
        <span className="text-[11px] text-mute">Реклама · 18+</span>
      </div>
    </div>
  )
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
  const today = todayYmd()
  const now = appNow()
  const isValue = t.slug === 'value'
  // «Выгодно»: только не начавшиеся (по ходу матча эти кэфы уже не действуют) и ставки у легального партнёра; по дням,
  // внутри дня — по выгоде (было вперемешку «Сегодня 21:00, Завтра 21:30, Сегодня 22:00»)
  const values = isValue
    ? items
        .filter((it) => {
          const p = it.summary?.pick
          return it.match.status === 'scheduled' && it.match.ts > now && p?.kind === 'value' && p.odd && p.partnerSlug && getPartner(p.partnerSlug)
        })
        .sort((a, b) => ymdInTz(a.match.ts).localeCompare(ymdInTz(b.match.ts)) || (b.summary!.pick!.ev ?? 0) - (a.summary!.pick!.ev ?? 0))
    : []
  const days = new Map<string, FeedItem[]>()
  for (const it of values) days.set(ymdInTz(it.match.ts), [...(days.get(ymdInTz(it.match.ts)) ?? []), it])

  return (
    <>
      {/* вид главной (владелец: «а страница выгодно как?»): без подложки, шапка панелью вместо плаката Oswald 56px */}
      <span hidden className="bare-sub" />
      <div className="space-y-4 xl:space-y-2">
        <section className="card px-4 py-4 sm:px-5">
          <Breadcrumbs items={[{ href: '/tags', label: 'Подборки' }, { href: `/tag/${t.slug}`, label: t.title }]} className="mb-3" />
          <h1 className="h1-block text-[24px] leading-tight sm:text-[28px]">{t.title}</h1>
          <p className="mt-1.5 max-w-[68ch] text-[14px] leading-relaxed text-dim">{t.about}</p>
          {isValue ? null : (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="text-[13px] text-mute">
                Что обычно ставят: <span className="font-medium text-fg">{t.bet}</span>
              </span>
              <CtaLink href={goHref(partner, 'tag')} size="sm">
                Перейти в {partner.name}
              </CtaLink>
              <AdMark partner={partner} />
            </div>
          )}
        </section>

        {!ok ? <div className="card px-4 py-4 text-[14px] text-dim sm:px-5">Источник данных временно недоступен — список может быть неполным.</div> : null}

        {isValue ? (
          values.length ? (
            [...days].map(([ymd, list]) => (
              <section key={ymd} className="card overflow-hidden">
                <BlockHead title={dayHead(ymd, list[0].match.ts, today)} aside={`${pluralN(list.length, ['ставка', 'ставки', 'ставок'])} · Реклама · 18+`} line />
                <div className="divide-y divide-edge">
                  {list.map((it) => (
                    <ValueRow key={it.match.id} it={it} />
                  ))}
                </div>
              </section>
            ))
          ) : (
            <p className="card px-4 py-4 text-[14px] leading-relaxed text-dim sm:px-5">
              Сейчас выгодных ставок нет: кэфы легальных букмекеров не выше нашей оценки. Список обновляется в течение дня.
            </p>
          )
        ) : hits.length ? (
          <section>
            <div className="mb-3 flex items-baseline justify-between px-1 xl:mt-2">
              <h2 className="text-[17px] font-semibold">{pluralN(hits.length, ['матч', 'матча', 'матчей'])}</h2>
              <span className="text-[12px] text-mute">сильные сигналы — выше</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:gap-2">
              {hits.slice(0, 60).map((it) => (
                <FeedCard key={it.match.id} item={it} tagSlug={t.slug} />
              ))}
            </div>
          </section>
        ) : (
          <p className="card px-4 py-4 text-[14px] leading-relaxed text-dim sm:px-5">
            Сейчас в этой подборке матчей нет.
            {t.deep ? ' Она появляется после разбора матча — ближайшие игры топ-лиг мы разбираем в фоне, загляните чуть позже.' : ''}
          </p>
        )}

        <section className="card px-4 py-4 sm:px-5">
          <h2 className="mb-3 text-[15px] font-semibold">Другие подборки</h2>
          <div className="flex flex-wrap gap-2">
            {TAGS.filter((x) => x.slug !== t.slug).map((x) => (
              <TagPill key={x.slug} slug={x.slug} size="md" />
            ))}
          </div>
          <Link href="/tags" className="mt-4 inline-block text-[13px] font-medium text-fg transition-opacity hover:opacity-75">
            Что означают подборки →
          </Link>
        </section>
      </div>
    </>
  )
}
