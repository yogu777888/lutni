import Link from 'next/link'
import { countryRank, featuredRank } from '@/config/leagues'
import { daySnaps, getMatchesByDate, peekOddsSnap, tagsFor, waitOddsSnap, type FeedItem } from '@/lib/data'
import { dayHref } from '@/lib/links'
import { addDays, diffDays, formatDayMonth, formatWeekdayLong, pluralN, weekdayWhen, ymdToNoonTs } from '@/lib/format'
import { lineMoves, type OddsSnap } from '@/lib/lines'
import { isLive, liveRank } from '@/lib/rank'
import { dayCounts, goalsPicks, mainMatches, moveExample } from '@/lib/day-summary'
import { storyCovers } from '@/lib/story-covers'
import { buildStoryGroups, mainCircles } from '@/lib/story-groups'
import type { League, Match } from '@/lib/types'
import { DateTabs } from './DateTabs'
import { DaySummary, type MainItem } from './DaySummary'
import type { DayLink } from './TopCarousel'
import { LeagueBlock, LiveBlock, TimeBlock } from './LeagueBlock'
import { Sidebar } from './Sidebar'
import { StoryCircles } from './story/StoryCircles'
import { ValueBoard } from './ValueBoard'

const OTHER_LIMIT = 160
/** В списке «по времени» — не больше стольких матчей: сначала топ-лиги, потом остальные с линией. */
const TIME_LIMIT = 200

export type DaySort = 'league' | 'time'
const LIVE_LIMIT = 6

/** Заголовок дня в две строки: вторая — светлее, как на афише. */
export function dayTitleLines(ymd: string, today: string): [string, string] {
  const d = diffDays(ymd, today)
  const ts = ymdToNoonTs(ymd)
  const date = formatDayMonth(ts)
  if (d === 0) return ['Футбол сегодня,', date]
  if (d === 1) return ['Футбол завтра,', date]
  if (d < 0) return [`Футбол ${date}:`, 'результаты матчей']
  return [`Футбол ${date},`, formatWeekdayLong(ts)]
}

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

/** Заголовок дня на странице: короткий h1 одним цветом и надпись с датой над ним. */
export function dayHeading(ymd: string, today: string): { title: string; date: string } {
  const d = diffDays(ymd, today)
  const ts = ymdToNoonTs(ymd)
  const date = `${cap(formatWeekdayLong(ts))}, ${formatDayMonth(ts)}`
  if (d === 0) return { title: 'Футбол сегодня', date }
  if (d === 1) return { title: 'Футбол завтра', date }
  if (d === -1) return { title: 'Как сыграли вчера', date }
  if (d < 0) return { title: 'Результаты матчей', date }
  return { title: `Футбол ${weekdayWhen(ts)}`, date }
}

export function dayTitle(ymd: string, today: string) {
  return dayTitleLines(ymd, today).join(' ')
}

const hasOdds = (items: FeedItem[]) => items.some((i) => i.match.odds)
/** Топ-лиги — раньше, остальные — после (featuredRank: 0 — главная, −1 — не из списка). */
const leagueOrder = (it: FeedItem) => {
  const r = featuredRank(it.match.league)
  return r < 0 ? 1e3 : r
}

export async function DayView({ ymd, today, sort = 'league' }: { ymd: string; today: string; sort?: DaySort }) {
  let matches: Match[] = []
  let failed = false
  try {
    matches = await getMatchesByDate(ymd)
  } catch {
    failed = true
  }

  const items: FeedItem[] = matches.map((m) => ({ match: m, ...tagsFor(m) }))
  const groups = new Map<number, { league: League; items: FeedItem[]; rank: number }>()
  for (const it of items) {
    const l = it.match.league
    let g = groups.get(l.id)
    if (!g) groups.set(l.id, (g = { league: l, items: [], rank: featuredRank(l) }))
    g.items.push(it)
  }
  const featured = [...groups.values()].filter((g) => g.rank >= 0).sort((a, b) => a.rank - b.rank)
  const othersAll = [...groups.values()]
    .filter((g) => g.rank < 0)
    // сначала страны, интересные аудитории, внутри — турниры с линией
    .sort(
      (a, b) =>
        countryRank(a.league.country) - countryRank(b.league.country) ||
        Number(hasOdds(b.items)) - Number(hasOdds(a.items)) ||
        a.league.name.localeCompare(b.league.name, 'ru'),
    )
  let budget = OTHER_LIMIT
  const others = othersAll
    .map((g) => {
      const take = g.items.slice(0, Math.max(0, budget))
      budget -= take.length
      return { ...g, items: take }
    })
    .filter((g) => g.items.length)
  const shownOthers = others.reduce((s, g) => s + g.items.length, 0)
  const totalOthers = othersAll.reduce((s, g) => s + g.items.length, 0)

  const open = items.filter((i) => i.match.status === 'scheduled' || i.match.status === 'live')
  // на первом экране — только главные кружки, остальные теги — по «Все теги»
  const storyGroups = mainCircles(buildStoryGroups(items))
  const values = open
    .filter((i) => i.summary?.pick?.kind === 'value' && i.match.status === 'scheduled')
    .sort((a, b) => (b.summary!.pick!.ev ?? 0) - (a.summary!.pick!.ev ?? 0))
    .slice(0, 5)

  const liveAll = items.filter((i) => isLive(i.match))
  // в «Сейчас в игре» — сначала топ-лиги, потом матчи с линией; женские и молодёжные — в конец
  const liveTop = [...liveAll].sort((a, b) => liveRank(a.match) - liveRank(b.match) || a.match.ts - b.match.ts).slice(0, LIVE_LIMIT)

  const heading = dayHeading(ymd, today)
  const past = diffDays(ymd, today) < 0
  // «Главные матчи» — в любой день: впереди — анонсы и идущие, на прошедших днях — итоги главных матчей.
  // До начала — линия одного букмекера для строки кэфов (на холодном старте ждём её недолго); в игре и после кэфов нет
  // линия для подборок: топ-турниры без снимка догружаются (не дольше 1,2 с, остальное — в фоне, к следующему открытию)
  const [mains, day] = await Promise.all([
    Promise.all(
      mainMatches(items).map(async (it): Promise<MainItem> => {
        const m = it.match
        return { it, snap: m.status === 'scheduled' ? await waitOddsSnap(m) : null }
      }),
    ),
    daySnaps(matches, 1200),
  ])
  const hasSummary = mains.length > 0
  // заголовок «Все матчи дня» — когда над списком есть что-то ещё (сводка, выгодные ставки)
  const listHead = hasSummary || values.length > 0
  // красная точка у «Сегодня»: на главной знаем сами, на других днях — из того же кэша матчей
  let liveToday = ymd === today && liveAll.length > 0
  if (ymd !== today) {
    try {
      liveToday = (await getMatchesByDate(today)).some(isLive)
    } catch {
      liveToday = false
    }
  }
  // чип дня в «Главных матчах» — переходы на страницы дней: вся страница (блок, подборки, список) — про один день
  const near: [string, string][] = [
    [addDays(today, -1), 'Вчера'],
    [today, 'Сегодня'],
    [addDays(today, 1), 'Завтра'],
  ]
  if (!near.some(([d]) => d === ymd)) near.push([ymd, formatDayMonth(ymdToNoonTs(ymd))])
  const dayLinks: DayLink[] = near
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([d, label]) => ({ key: d, label, href: dayHref(d, today), current: d === ymd, live: d === today && liveToday }))
  // превью подборок — по линии одного букмекера: те же снимки, что и у страниц подборок
  const snaps = new Map<number, OddsSnap | null>(day.snaps)
  for (const x of mains) if (x.snap) snaps.set(x.it.match.id, x.snap)
  const snapOf = (id: number) => snaps.get(id) ?? peekOddsSnap(id)
  // по времени — только для дней, где матчи ещё впереди; у прошедших порядок по турнирам = главные результаты первыми
  const byTime = sort === 'time' && !past
  const timeList = byTime
    ? [...featured.flatMap((g) => g.items), ...othersAll.flatMap((g) => g.items)]
        .slice(0, TIME_LIMIT)
        .sort((a, b) => a.match.ts - b.match.ts || leagueOrder(a) - leagueOrder(b))
    : []
  const base = dayHref(ymd, today)

  return (
    <>
      {/* первый экран: заголовок, кружки и сводка. На компьютере сводка тянется до низа окна —
          заходишь и сразу видишь всё нужное, а «Все матчи дня» начинаются ниже, по прокрутке.
          На очень высоких мониторах — не выше 50rem (хватает на обычное окно браузера на экране 1080p), чтобы плитки не раздувались. */}
      <div className={hasSummary ? 'flex flex-col lg:min-h-[min(calc(100svh-7rem),50rem)]' : undefined}>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <section className="min-w-0 pt-1 sm:pt-0">
          <p className="fade-up text-[14px] font-medium text-dim">{heading.date}</p>
          <h1 className="mt-1.5 text-[32px] font-bold leading-[1.08] tracking-[-0.03em] sm:text-[42px]">
            <span className="rise">
              <span>
                {heading.title}
                {/* дата — и в заголовке для поисковиков */}
                <span className="sr-only">, {formatDayMonth(ymdToNoonTs(ymd))}</span>
              </span>
            </span>
          </h1>
        </section>
        </div>

        {storyGroups.length ? (
          // кружки понятны и без подписи «Истории дня» — так первый экран влезает целиком;
          // отступ сверху — у ряда (pt-1.5): ряд прокручивается и обрезал бы круг фокуса у кружка
          <section aria-label="Истории дня" className="mt-4 sm:mt-5">
            <StoryCircles groups={storyGroups} covers={storyCovers()} />
          </section>
        ) : null}

        {/* на невысоком окне (ниже 800px) отступ над сводкой меньше — так она влезает целиком */}
        {hasSummary ? (
          <DaySummary
            mains={mains}
            days={dayLinks}
            picks={{
              ymd,
              dayHref: base,
              past,
              counts: dayCounts(items),
              goals: goalsPicks(items, snapOf),
              move: moveExample(items, snapOf),
              movesCovered: items.filter((it) => lineMoves(snapOf(it.match.id)).length > 0).length,
            }}
            className="mt-5 lg:flex-1 lg:[@media(min-height:740px)_and_(max-height:799px)]:mt-4 lg:[@media(max-height:739px)]:mt-3"
          />
        ) : null}
      </div>

      <ValueBoard items={values} />

      {/* без сводки (в этот день нет ни одного «взрослого» матча) список идёт сразу под заголовком страницы — второй заголовок не нужен */}
      <section id="matches" className={`scroll-mt-24 ${listHead ? 'mt-16 sm:mt-20' : 'mt-5 sm:mt-6'}`}>
        {listHead ? (
          <>
            <p className="eyebrow">{past ? 'Результаты' : 'Матчи'}</p>
            <h2 className="h2 mt-3 text-[30px] sm:text-[44px]">{past ? 'Как сыграли' : 'Все матчи дня'}</h2>
          </>
        ) : null}
        {/* выбор дня — и здесь, у списка (как и чип в «Главных матчах», ведёт на страницу дня); рядом — порядок списка */}
        <div className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-3 ${listHead ? 'mt-5' : ''}`}>
          <div className="w-full min-w-0 sm:w-auto">
            <DateTabs active={ymd} today={today} liveToday={liveToday} hash="#matches" />
          </div>
          {past || !matches.length ? null : (
            // порядок списка — обычными ссылками (?sort=time): работает без JS, у страницы один canonical
            <nav aria-label="Порядок матчей" className="flex items-center gap-1 rounded-full bg-white/[0.04] p-1 text-[14px] font-medium">
              {(
                [
                  ['league', 'По турнирам', `${base}#matches`],
                  ['time', 'По времени', `${base}?sort=time#matches`],
                ] as const
              ).map(([k, label, href]) => (
                <Link
                  key={k}
                  href={href}
                  prefetch={false}
                  scroll={false}
                  aria-current={(k === 'time') === byTime ? 'true' : undefined}
                  className={`rounded-full px-3.5 py-1.5 transition-colors ${(k === 'time') === byTime ? 'bg-white/[0.08] text-fg' : 'text-dim hover:text-fg'}`}
                >
                  {label}
                </Link>
              ))}
            </nav>
          )}
        </div>
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-5">
            {failed ? (
              <div className="card p-5 text-[15px] text-dim">
                Не удалось загрузить матчи: источник данных временно недоступен. Обновите страницу через минуту.
              </div>
            ) : null}
            {liveTop.length ? <LiveBlock items={liveTop} total={liveAll.length} /> : null}
            {byTime && timeList.length ? <TimeBlock items={timeList} /> : null}
            {byTime ? null : featured.map((g) => (
              <LeagueBlock key={g.league.id} league={g.league} items={g.items} featured />
            ))}
            {!byTime && others.length ? (
              <details className="card group overflow-hidden" open={!featured.length}>
                <summary className="flex cursor-pointer items-center justify-between px-5 py-4 transition-colors hover:bg-white/[0.02]">
                  <span className="text-[17px] font-bold tracking-tight">{featured.length ? 'Другие турниры' : 'Все турниры'}</span>
                  <span className="flex items-center gap-2 text-[13px] text-mute">
                    {pluralN(totalOthers, ['матч', 'матча', 'матчей'])}
                    <span className="transition group-open:rotate-180">▾</span>
                  </span>
                </summary>
                {/* карточки турниров внутри общей — на тон темнее, иначе без обводки они сольются с ней */}
                <div className="space-y-4 border-t border-edge p-3 sm:p-4 [&_.card]:bg-panel">
                  {others.map((g) => (
                    <LeagueBlock key={g.league.id} league={g.league} items={g.items} />
                  ))}
                  {shownOthers < totalOthers ? (
                    <p className="px-1 text-[13px] text-dim">
                      Показаны {shownOthers} из {totalOthers} матчей. Остальные — на страницах{' '}
                      <Link href="/leagues" className="border-b border-acid text-fg">
                        турниров
                      </Link>
                      .
                    </p>
                  ) : null}
                </div>
              </details>
            ) : null}
            {!matches.length && !failed ? (
              <div className="card p-10 text-center">
                <p className="text-[17px] font-semibold">На этот день матчей не найдено.</p>
                <Link href="/" className="mt-3 inline-block border-b-2 border-acid pb-0.5 text-[15px] font-semibold">
                  Матчи сегодня →
                </Link>
              </div>
            ) : null}
          </div>
          <Sidebar />
        </div>
      </section>
    </>
  )
}
