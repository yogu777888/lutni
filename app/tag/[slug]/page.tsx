import type { Metadata } from 'next'
import Link from 'next/link'
import { ValueSort } from '@/components/ValueSort'
import { notFound } from 'next/navigation'
import { AdMark } from '@/components/AdMark'
import { BlockMore } from '@/components/BlockMore'
import { BlockTitle } from '@/components/Section'
import { PageHead } from '@/components/PageHead'
import { StorySymbol } from '@/components/story/StorySymbol'
import { CtaLink } from '@/components/CtaLink'
import { Hint } from '@/components/match/Hint'
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

// готовая страница хранится 30 с и отдаётся всем (ISR), собирается при первом открытии; порядок «Выгодных ставок»
// (`?sort=time`) переключается в браузере (`ValueSort`) — параметров адреса страница не читает
export const revalidate = 30
export function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ slug: string }> }

/** Описание для поисковиков — целыми предложениями (описания подборок длиннее 200 знаков: на полуслове не режем). */
function clip(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const end = cut.lastIndexOf('. ')
  return end > 60 ? cut.slice(0, end + 1) : `${cut.slice(0, cut.lastIndexOf(' '))}…`
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const t = TAG_BY_SLUG.get(slug)
  if (!t) return {}
  return {
    title: `${t.title}: матчи и прогнозы на сегодня и завтра`,
    description: clip(`${t.hint}. ${t.about}`, 200),
    alternates: { canonical: `/tag/${t.slug}` },
  }
}

/** ⓘ у «Выгодных ставок»: пример расчёта (был в подписи страницы) — без обещания заработка. */
const VALUE_HINT =
  'Справедливый кэф = 1 / вероятность: при вероятности 40% это 2.50. Букмекер оценивает шансы по-своему, поэтому его кэф иногда выше нашей оценки — например, 2.68. Преимущество — математическое ожидание по модели: 0,40 × 2,68 − 1 = +7,2%. Это оценка, а не гарантированная прибыль; ставки — это риск · 18+'

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
  // вероятность — точная из модели (`prob`), округляем только при показе; преимущество — `prob × кэф − 1` (`ev`, `buildCandidates`)
  const prob = Number.isFinite(p.prob) && p.prob > 0 && p.prob < 1 ? p.prob : null
  const ev = p.ev != null && Number.isFinite(p.ev) ? p.ev : null
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
        {/* на телефоне — «Справедливый 1.83»: строка короче, смысл тот же */}
        <p className="mt-0.5 text-[13px] text-mute">
          {prob != null ? (
            <>
              <span className="whitespace-nowrap">Вероятность {pct(prob)}</span> ·{' '}
              <span className="whitespace-nowrap">
                Справедливый<span className="max-sm:hidden"> кэф</span> {(1 / prob).toFixed(2)}
              </span>
            </>
          ) : null}
          {ev != null ? (
            // на телефоне — своей строкой: в одну с «Вероятностью» не влезает рядом с плашкой кэфа
            <span className="whitespace-nowrap text-good max-sm:block">
              {prob != null ? <span className="max-sm:hidden"> · </span> : null}Преимущество {signedPct(ev)}
            </span>
          ) : null}
        </p>
      </div>
      <div className="relative z-10 flex flex-col items-end gap-1">
        <a
          href={goHref(partner, 'value', m.id)}
          target="_blank"
          rel={SPONSORED_REL}
          title={`${outcomeText(p.key, m)}: ${p.odd!.toFixed(2)} в ${partner.name} · Реклама 18+`}
          className="flex h-10 min-w-[72px] flex-col items-center justify-center rounded-ctl bg-acid px-2.5 leading-none text-acid-ink transition-colors hover:bg-acid/85"
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
        <p className="mt-0.5 text-[14px] leading-snug text-fg/85">{hit.short ?? hit.reason}</p>
        <p className="mt-0.5 truncate text-[13px] text-mute">{m.league.name}</p>
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
  // внутри дня — по преимуществу; место по времени (`?sort=time`) — у строки (`--ot`), переключает браузер (`ValueSort`);
  // равные — по времени, потом по id: порядок стабилен
  const evOf = (it: FeedItem) => it.summary!.pick!.ev ?? -Infinity
  const within = (a: FeedItem, b: FeedItem) => evOf(b) - evOf(a) || a.match.ts - b.match.ts || a.match.id - b.match.id
  const byTimeCmp = (a: FeedItem, b: FeedItem) => a.match.ts - b.match.ts || evOf(b) - evOf(a) || a.match.id - b.match.id
  const values = isValue
    ? items
        .filter((it) => {
          const p = it.summary?.pick
          return it.match.status === 'scheduled' && it.match.ts > now && p?.kind === 'value' && p.odd && p.partnerSlug && getPartner(p.partnerSlug)
        })
        .sort((a, b) => ymdInTz(a.match.ts).localeCompare(ymdInTz(b.match.ts)) || within(a, b))
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
      <div className="space-y-4 xl:space-y-2">
        {/* «Выгодные ставки» — пункт меню «Выгодно», страница верхнего уровня: без крошек и значка, как «Подборки», «Лиги»
            (владелец: «на странице выгодно есть хлебные крошки и иконка» — крошки «Подборки / …» спорили с меню) */}
        <PageHead
          crumbs={isValue ? undefined : [{ href: '/tags', label: 'Подборки' }, { href: `/tag/${t.slug}`, label: t.title }]}
          section={isValue ? '/tag/value' : undefined}
          lead={
            isValue ? null : (
              <span className="grid h-12 w-12 place-items-center rounded-full bg-white/[0.06]">
                <StorySymbol k={t.slug} tone="currentColor" className="h-6 w-6" />
              </span>
            )
          }
          title={
            isValue ? (
              <>
                {t.title}
                <span className="align-middle text-[15px] font-normal">
                  <Hint title="Как считаем преимущество" text={VALUE_HINT} />
                </span>
              </>
            ) : (
              t.title
            )
          }
          sub={t.about}
          // порядок — справа в строке заголовка (на телефоне — под подписью во всю ширину, половинами): висел под подписью
          // слева, с пустотой справа (владелец: «кнопки сортировки как то не очень удачно сейчас стоят»)
          aside={
            isValue && values.length > 1 ? <ValueSort target="value-list" /> : undefined
          }
        >
          {isValue ? null : (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {t.bet ? (
                <span className="text-[13px] text-mute">
                  Что обычно ставят: <span className="font-medium text-fg">{t.bet}</span>
                </span>
              ) : null}
              <CtaLink href={goHref(partner, 'tag')} size="sm">
                Перейти в {partner.name}
              </CtaLink>
              <AdMark partner={partner} />
            </div>
          )}
        </PageHead>

        {/* .match-body — от lg текст списка крупнее, как на главной и странице матча (app/globals.css); шапка — как была */}
        {/* заголовки дней и «Другие подборки» — над карточками на фоне страницы, как на главной и «Лигах»; между блоками 32px */}
        <div id="value-list" className="match-body space-y-8 pt-4 xl:pt-6">
        {!ok ? <div className="card px-4 py-4 text-[14px] text-dim sm:px-5">Источник данных временно недоступен — список может быть неполным.</div> : null}

        {isValue ? (
          values.length ? (
            [...days].map(([ymd, list]) => (
              <section key={ymd}>
                <BlockTitle rows title={dayHead(ymd, list[0].match.ts, today)} aside={
                    // на телефоне — только число: «Завтра · 5 октября» с «3 ставки · Реклама · 18+» не влезали в строку, и подпись
                    // уходила под заголовок (владелец: «у завтра под заголовком почему-то описание»); «Реклама · 18+» — у кэфа в строке
                    <span className="whitespace-nowrap">
                      {pluralN(list.length, ['ставка', 'ставки', 'ставок'])}
                      <span className="max-sm:hidden"> · Реклама · 18+</span>
                    </span>
                  }
                />
                {/* строки — колонкой с порядком (`order`): по времени их переставляет CSS, черта — у каждой строки сверху,
                    у первой на экране её срезает край карточки (`-mt-px` и `overflow-hidden`) */}
                <div className="card overflow-hidden">
                  <div className="-mt-px flex flex-col">
                    {list.map((it) => {
                      const ot = [...list].sort(byTimeCmp).indexOf(it)
                      return (
                        <div key={it.match.id} data-ot className="border-t border-edge" style={{ '--ot': ot } as React.CSSProperties}>
                          <ValueRow it={it} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              </section>
            )).concat(
              <p key="note" className="-mt-5 px-4 text-[13px] text-mute sm:px-5">
                Вероятность — оценка tag.bet, кэф — предложение букмекера. Не гарантия выигрыша: ставки — это риск · 18+ ·{' '}
                <Link href="/about#vygodno" className="underline underline-offset-2 hover:text-fg">
                  Как мы считаем
                </Link>
              </p>,
            )
          ) : (
            <p className="card px-4 py-4 text-[14px] leading-relaxed text-dim sm:px-5">
              Сейчас выгодных ставок нет: кэфы легальных букмекеров не выше нашей оценки. Список обновляется в течение дня.
            </p>
          )
        ) : ahead.length || liveHits.length ? (
          <>
            {tagDayList.map(([ymd, list]) => (
              <section key={ymd}>
                <BlockTitle rows title={dayHead(ymd, list[0].match.ts, today)} aside={pluralN(list.length, ['матч', 'матча', 'матчей'])} />
                <div className="card divide-y divide-edge overflow-hidden">
                  {list.map((it) => (
                    <TagRow key={it.match.id} it={it} hit={hitOf(it)} bet={betOf(it)} />
                  ))}
                </div>
              </section>
            ))}
            {liveHits.length ? (
              <section>
                <BlockTitle rows title="Уже идут" aside="кэфы до матча не действуют" />
                <div className="card divide-y divide-edge overflow-hidden">
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

        <section>
          <BlockTitle rows title="Другие подборки" />
          <div className="card overflow-hidden">
          <div className="flex flex-wrap gap-2 px-4 py-4 sm:px-5">
            {/* названия — как в правой панели и на «Подборках», без решётки и цветов: лайм — только «выгодно» в цифрах */}
            {TAGS.filter((x) => x.slug !== t.slug).map((x) => (
              <Link
                key={x.slug}
                href={`/tag/${x.slug}`}
                prefetch={false}
                title={x.hint}
                className="rounded-ctl bg-white/[0.06] px-3 py-1.5 text-[14px] transition-colors hover:bg-white/[0.12]"
              >
                {x.title}
              </Link>
            ))}
          </div>
          <BlockMore href="/tags">Все подборки</BlockMore>
          </div>
        </section>
        </div>
      </div>
    </>
  )
}
