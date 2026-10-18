import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AdMark } from '@/components/AdMark'
import { BlockHead } from '@/components/BlockHead'
import { PageHead, PageTop } from '@/components/PageHead'
import { StorySymbol } from '@/components/story/StorySymbol'
import { CtaLink } from '@/components/CtaLink'
import { getPartner, primaryPartner } from '@/config/bookmakers'
import { isFeatured } from '@/config/leagues'
import { goHref, SPONSORED_REL } from '@/lib/affiliate'
import { daySnaps, getUpcomingFeed, peekOddsSnap, type FeedItem } from '@/lib/data'
import { appNow, dayLabel, formatDayMonth, formatTime, pct, pluralN, signedPct, todayYmd, ymdInTz } from '@/lib/format'
import { matchHref } from '@/lib/links'
import { tagBet } from '@/lib/tag-bets'
import type { TagHit } from '@/lib/tags'
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
  const h = l === 'Завтра' ? `${l} · ${formatDayMonth(ts)}` : l
  return h.charAt(0).toUpperCase() + h.slice(1)
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

/**
 * Строка матча подборки (владелец: «страница подборки как?»): время, матч и турнир, факт подборки коротко («3 гола и больше —
 * шанс 77%», «Победа «Хетафе»: 7.42 → 6.37 (−14%)») и справа кэф на ставку этой подборки у легального партнёра (`tagBet`) —
 * серой ячейкой, как кэфы в строках главной (лайм — только «выгодно»). Без «Прогноз ТМ 3.5» (шёл против самой подборки) и
 * чипов других подборок. Идущий — минута красным, без кнопки: доматчевые кэфы уже не действуют.
 */
function TagRow({ it, hit, bet }: { it: FeedItem; hit: TagHit; bet: ReturnType<typeof tagBet> }) {
  const m = it.match
  const live = m.status === 'live'
  return (
    <div className="relative grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-x-4 px-4 py-3 transition-colors hover:bg-white/[0.02] sm:grid-cols-[3.75rem_minmax(0,1fr)_auto] sm:px-5">
      <span className={`num display-num self-start pt-0.5 text-[18px] ${live ? 'text-live' : ''}`}>{live ? `${m.elapsed ?? ''}′` : formatTime(m.ts)}</span>
      <div className="min-w-0">
        <Link href={matchHref(m)} prefetch={false} className="block truncate text-[15px] font-semibold after:absolute after:inset-0 sm:text-[16px]">
          {m.home.name} — {m.away.name}
        </Link>
        <p className="mt-0.5 text-[13.5px] leading-snug text-fg/85">{hit.short ?? hit.reason}</p>
        <p className="mt-0.5 truncate text-[12.5px] text-mute">{m.league.name}</p>
      </div>
      {bet ? (
        <div className="relative z-10 flex flex-col items-end gap-1">
          <a
            href={goHref(bet.partner, 'tag', m.id)}
            target="_blank"
            rel={SPONSORED_REL}
            title={`${bet.label}: ${bet.odd.toFixed(2)} в ${bet.partner.name} · Реклама 18+`}
            className="flex h-11 min-w-[76px] flex-col items-center justify-center rounded-ctl bg-white/[0.06] px-3 leading-none transition-colors hover:bg-white/[0.14]"
          >
            <span className="num text-[16px] font-bold">{bet.odd.toFixed(2)}</span>
            <span className="mt-0.5 text-[11px] text-dim">{bet.partner.name}</span>
          </a>
          <span className="text-[11px] text-mute">Реклама · 18+</span>
        </div>
      ) : null}
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

  // остальные подборки: не начавшиеся — по дням, внутри — сильные сигналы первыми; идущие — отдельным блоком в конце
  // (владелец: «да» — по ходу матча на них тоже ставят, но доматчевые кэфы уже не действуют)
  const ahead = isValue ? [] : hits.filter((it) => it.match.status === 'scheduled' && it.match.ts > now)
  const liveHits = isValue ? [] : hits.filter((it) => it.match.status === 'live')
  const tagDays = new Map<string, FeedItem[]>()
  for (const it of ahead) tagDays.set(ymdInTz(it.match.ts), [...(tagDays.get(ymdInTz(it.match.ts)) ?? []), it])
  const tagDayList = [...tagDays].sort((a, b) => a[0].localeCompare(b[0]))
  // кэфы на ставку подборки — снимки линии: ближайшим двум суткам догружаем (≤1,2 с, только топ-турниры), дальше — из кэша
  const { snaps } = await daySnaps(
    ahead.map((it) => it.match).filter((m) => m.ts < now + 48 * 3600_000),
    1200,
  )
  const hitOf = (it: FeedItem) => it.tags.find((x) => x.slug === t.slug)!
  const betOf = (it: FeedItem) => tagBet(t.slug, hitOf(it), it.match, snaps.get(it.match.id) ?? peekOddsSnap(it.match.id))

  return (
    <>
      {/* вид главной (владелец: «а страница выгодно как?»): без подложки, шапка панелью вместо плаката Oswald 56px */}
      <span hidden className="bare-sub" />
      {isValue ? null : <PageTop crumbs={[{ href: '/tags', label: 'Подборки' }, { href: `/tag/${t.slug}`, label: t.title }]} title={t.title} />}
      <div className="space-y-4 xl:space-y-2">
        {/* «Выгодные ставки» — пункт меню «Выгодно», страница верхнего уровня: без крошек и значка, как «Подборки», «Лиги»
            (владелец: «на странице выгодно есть хлебные крошки и иконка» — крошки «Подборки / …» спорили с меню) */}
        <PageHead
          lead={
            isValue ? null : (
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.06]">
                <StorySymbol k={t.slug} tone="currentColor" className="h-[18px] w-[18px]" />
              </span>
            )
          }
          title={t.title}
          sub={t.about}
        >
          {isValue ? null : (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="text-[13px] text-mute">
                Что обычно ставят: <span className="font-medium text-fg">{t.bet}</span>
              </span>
              <CtaLink href={goHref(partner, 'tag')} size="sm">
                Перейти в {partner.name}
              </CtaLink>
              <AdMark partner={partner} />
            </div>
          )}
        </PageHead>

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
        ) : ahead.length || liveHits.length ? (
          <>
            {tagDayList.map(([ymd, list]) => (
              <section key={ymd} className="card overflow-hidden">
                <BlockHead title={dayHead(ymd, list[0].match.ts, today)} aside={pluralN(list.length, ['матч', 'матча', 'матчей'])} line />
                <div className="divide-y divide-edge">
                  {list.map((it) => (
                    <TagRow key={it.match.id} it={it} hit={hitOf(it)} bet={betOf(it)} />
                  ))}
                </div>
              </section>
            ))}
            {liveHits.length ? (
              <section className="card overflow-hidden">
                <BlockHead title="Уже идут" aside="кэфы до матча уже не действуют" line />
                <div className="divide-y divide-edge">
                  {liveHits.map((it) => (
                    <TagRow key={it.match.id} it={it} hit={hitOf(it)} bet={null} />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : (
          <p className="card px-4 py-4 text-[14px] leading-relaxed text-dim sm:px-5">
            Сейчас в этой подборке матчей нет.
            {t.deep ? ' Она появляется после разбора матча — ближайшие игры топ-лиг мы разбираем в фоне, загляните чуть позже.' : ''}
          </p>
        )}

        <section className="card px-4 py-4 sm:px-5">
          <h2 className="mb-3 text-[15px] font-semibold">Другие подборки</h2>
          <div className="flex flex-wrap gap-2">
            {/* названия — как в правой панели и на «Подборках», без решётки и цветов: лайм — только «выгодно» в цифрах */}
            {TAGS.filter((x) => x.slug !== t.slug).map((x) => (
              <Link
                key={x.slug}
                href={`/tag/${x.slug}`}
                prefetch={false}
                title={x.hint}
                className="rounded-ctl bg-white/[0.06] px-3 py-1.5 text-[13.5px] transition-colors hover:bg-white/[0.12]"
              >
                {x.title}
              </Link>
            ))}
          </div>
          <Link href="/tags" className="mt-4 inline-block text-[13px] font-medium text-fg transition-opacity hover:opacity-75">
            Все подборки →
          </Link>
        </section>
      </div>
    </>
  )
}
