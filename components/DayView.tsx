import Link from 'next/link'
import { PageHead } from './PageHead'
import { countryRank, FEATURED_LEAGUES, featuredRank } from '@/config/leagues'
import { daySnaps, getMatchesByDate, tagsFor, waitMatchFull, type FeedItem } from '@/lib/data'
import { mainMatches } from '@/lib/day-summary'
import { Carousel } from './Carousel'
import { FocusMatch } from './FocusMatch'
import { x12For, type X12Line } from '@/lib/lines'
import { dayHref, listHref } from '@/lib/links'
import { applyListFilter, filterQuery, isEmptyFilter, type ListFilter } from '@/lib/list-filter'
import { diffDays, formatDayMonth, formatWeekdayLong, pluralN, weekdayWhen, ymdToNoonTs } from '@/lib/format'
import { isLive, liveRank } from '@/lib/rank'
import { buildStoryGroups, mainCircles, spreadLeads } from '@/lib/story-groups'
import type { League, Match } from '@/lib/types'
import { DateTabs } from './DateTabs'
import { Interesting, pickFacts } from './Interesting'
import { LiveRefresh } from './Live'
import { FavMatches } from './FavMatches'
import { LeagueBlock, LiveBlock, TimeBlock } from './LeagueBlock'
import { BlockTitle } from './Section'
import { Sidebar } from './Sidebar'
import { dayPicks } from '@/lib/day-picks'
import { MatchFilter } from './MatchFilter'
import { PlayAll, StoryCircles } from './story/StoryCircles'
import { TAGS } from '@/lib/tags'
import { Icon } from '@/components/Icon'

const OTHER_LIMIT = 160
/** В списке «по времени» — не больше стольких матчей: сначала топ-лиги, потом остальные с линией. */
const TIME_LIMIT = 200

export type DaySort = 'league' | 'time'
const LIVE_LIMIT = 6

/** Заголовок дня в две строки: вторая — светлее, как на афише. */
/** Заголовок страницы «Матчи»: «Футбол сегодня» → «Все матчи сегодня»; у прошедших дней — как есть. */
export const listTitle = (title: string) => title.replace(/^Футбол/, 'Все матчи')

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

export async function DayView({
  ymd,
  today,
  sort = 'league',
  view = 'home',
  filter,
}: {
  ymd: string
  today: string
  sort?: DaySort
  /** «Своя подборка» из правой панели — только для страницы «Матчи» */
  filter?: ListFilter
  /** home — витрина дня (табло, подборки, полки), list — страница «Матчи»: полный список дня */
  view?: 'home' | 'list'
}) {
  let matches: Match[] = []
  let failed = false
  try {
    matches = await getMatchesByDate(ymd)
  } catch {
    failed = true
  }

  const items: FeedItem[] = matches.map((m) => ({ match: m, ...tagsFor(m) }))
  // список страницы «Матчи» — с учётом «Своей подборки»; витрина и красная точка «Сегодня» — по всему дню
  const filtered = view === 'list' && filter && !isEmptyFilter(filter)
  const listItems = filtered ? applyListFilter(items, filter) : items
  // фильтр — и в ссылках порядка «По турнирам / По времени»
  const fq = filtered ? filterQuery(filter) : ''
  const liveAll = listItems.filter((i) => isLive(i.match))
  const liveSorted = [...liveAll].sort((a, b) => liveRank(a.match) - liveRank(b.match) || a.match.ts - b.match.ts)
  // в «Сейчас идут» сверху — только топ-турниры (владелец согласился: на настоящих данных в субботу утром первый экран
  // занимали «Petřín Plzeň — Rokycany» и «6 из 42» без ссылки на остальные), остальные идущие — под раскрывашкой
  // «Ещё 36 матчей в других турнирах» в том же блоке; топ-лиги сверх шести — в своих блоках, как были
  // «Матч в фокусе» (ниже xl, под «Подборками дня»): главный из идущих, нет идущих — главный за день (`mainMatches`); в
  // списке ниже остаётся — на компьютере виджета нет
  // теперь до трёх, лентой с точками (владелец: «Матч в фокусе» листается, как в прототипе ChatGPT): сначала главные идущие,
  // дальше главные за день, разные матчи
  const focusList =
    view === 'home'
      ? [...mainMatches(items.filter((i) => isLive(i.match)), 3), ...mainMatches(items, 3)]
          .filter((it, i, a) => a.findIndex((x) => x.match.id === it.match.id) === i)
          .slice(0, 3)
      : []
  const liveMain = liveSorted.filter((i) => featuredRank(i.match.league) >= 0)
  const liveTop = liveMain.slice(0, LIVE_LIMIT)
  const liveRest = liveSorted.filter((i) => featuredRank(i.match.league) < 0)
  // идущие из «Сейчас идут» в блоках лиг не повторяем (владелец: матчи дублировались); в шапке лиги — «● N в игре»
  const liveShown = new Set([...liveTop, ...liveRest].map((i) => i.match.id))
  const liveIn = new Map<number, number>()
  for (const i of liveTop) liveIn.set(i.match.league.id, (liveIn.get(i.match.league.id) ?? 0) + 1)
  const groups = new Map<number, { league: League; items: FeedItem[]; rank: number }>()
  for (const it of listItems) {
    if (liveShown.has(it.match.id)) continue
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

  // все истории дня — полками на главной, главные теги первыми
  const storyGroups = spreadLeads(mainCircles(buildStoryGroups(items), 99))


  // кэфы в строках — линия конкретного легального партнёра (ячейки — ссылки к нему, реклама): снимки линии из кэша,
  // топ-турниры без снимка догружаем, но ждём не дольше 1,2 с — остальное дойдёт к следующему открытию
  // все ожидания — одновременно (владелец: «чтоб не все сразу грузилось»): по очереди они складывались
  const pre = listItems.filter((i) => i.match.status === 'scheduled')
  const [focusFull, { snaps }, picks] = await Promise.all([
    Promise.all(focusList.map((f) => (f.match.status !== 'scheduled' ? waitMatchFull(f.match.id) : null))),
    daySnaps(
      pre.map((i) => i.match),
      1200,
    ),
    ymd === today ? dayPicks() : null,
  ])
  const lines: Record<number, X12Line> = {}
  {
    for (const it of pre) {
      // линия главного партнёра (PARI — первым в PARTNERS), а не того, у кого выгодна ставка (владелец: «выгодно сегодня тебе
      // как?» — лайм в центре был у Марафона, а «Выгодно сегодня» справа — по PARI: два «выгодно» по одному матчу); нет у
      // PARI линии — следующий партнёр
      const line = x12For(snaps.get(it.match.id), null)
      if (line) lines[it.match.id] = line
    }
  }
  const heading = dayHeading(ymd, today)
  // «Выгодно сегодня» в колонке под списком (ниже xl правой панели нет) — только у сегодняшнего дня
  const values = picks?.values ?? []
  const past = diffDays(ymd, today) < 0
  // заголовок «Все матчи дня» над списком не нужен: на главной в центре — только матчи (владелец: «по центру только лайв
  // и матчи лиг, без матча дня и выгодно сегодня»; «Матч дня» — DayHero, «Выгодно сегодня» — ValueBoard остались в коде)
  const listHead = false
  // красная точка у «Сегодня»: на главной знаем сами, на других днях — из того же кэша матчей
  let liveToday = ymd === today && items.some((i) => isLive(i.match))
  if (ymd !== today) {
    try {
      liveToday = (await getMatchesByDate(today)).some(isLive)
    } catch {
      liveToday = false
    }
  }
  // по времени — только для дней, где матчи ещё впереди; у прошедших порядок по турнирам = главные результаты первыми
  const byTime = sort === 'time' && !past
  const timeList = byTime
    ? [...featured.flatMap((g) => g.items), ...othersAll.flatMap((g) => g.items)]
        .slice(0, TIME_LIMIT)
        .sort((a, b) => a.match.ts - b.match.ts || leagueOrder(a) - leagueOrder(b))
    : []
  const base = dayHref(ymd, today)
  // полный список дня — страница «Матчи»
  const list = listHref(ymd, today)

  // главная — тоже все матчи дня по лигам (владелец: «в центре просто матчи по лигам, а подборки — в боковой виджет»)
  const showList = true
  // «Интересно сегодня» — два факта дня под списком (телефон и планшет)
  const facts = view === 'home' && !past ? pickFacts(items, new Set(focusList.map((f) => f.match.id))) : []
  return (
    <>
      {/* пока на этой странице идут матчи — счёт и минуты обновляются сами, без перезагрузки */}
      {liveAll.length ? <LiveRefresh /> : null}
      {/* главная от xl — без общей подложки центра: баннер, «Сейчас идут» и лиги — отдельными блоками на фоне
          страницы, как боковые панели (владелец: «чтобы не делать блок в блоке»; правила — .bare-page в app/globals.css) */}
      {/* «Матчи» — так же, с шапкой PageHead (владелец: «на всех страницах разные по размеру заголовки?») */}
      <span hidden className="bare-page" />
      {view === 'home' ? (
        <>
          {/* заголовок — тихая строка с датой (на xl — только для поисковиков): главное на экране — матчи */}
          {/* на телефоне — тоже только для поисковиков: день видно во вкладках, а строка отодвигала список (владелец: «а на телефоне главная как?») */}
          <h1 className="sr-only">
            {heading.title} · {heading.date.charAt(0).toLowerCase() + heading.date.slice(1)}
          </h1>

        </>
      ) : null}
      {/* без сводки (в этот день нет ни одного «взрослого» матча) список идёт сразу под заголовком страницы — второй заголовок не нужен */}
      {/* светлая плита (ритм страницы плитами, как у reg.ru): класс bg-panel даёт внутри токены светлой поверхности
          (тёмный текст), фон — на тон темнее карточек, чтобы карточки турниров на ней читались */}
      {view === 'list' ? (
        // страница «Матчи»: заголовок — как на главной, но про список
        <PageHead
          section="/"
          title={
            <>
              {listTitle(heading.title)}
              <span className="sr-only">, {formatDayMonth(ymdToNoonTs(ymd))}</span>
            </>
          }
          sub={
            <>
              <span className="first-letter:uppercase">{heading.date}</span>
              {filtered ? (
                <>
                  {' · '}Своя подборка: {pluralN(listItems.length, ['матч', 'матча', 'матчей'])} из {items.length} ·{' '}
                  <Link href={list} className="font-semibold text-fg underline decoration-edge-2 underline-offset-4 hover:decoration-fg">
                    показать все
                  </Link>
                </>
              ) : null}
            </>
          }
        />
      ) : null}
      {view === 'list' ? (
        // «Своя подборка» — что показывать, турниры, теги и порядок (раньше была в правой панели каркаса)
        <MatchFilter
          day={ymd}
          today={today}
          leagues={FEATURED_LEAGUES.slice(0, 8).map((l) => ({ key: String(l.id), label: l.short }))}
          tags={TAGS.map((t) => ({ key: t.slug, label: t.label.replace(/^#/, '') }))}
        />
      ) : null}
      {showList ? (
      <section
        id="matches"
        className={`scroll-mt-24 ${listHead ? 'mt-12 sm:mt-14' : view === 'home' ? '-mt-4 sm:-mt-6 lg:mt-0' : 'mt-3 sm:mt-6'} xl:mt-0`}
      >
        {/* ниже lg (телефон, планшет) на главной — второй ряд шапки, как чипы у YouTube: только на главной, липкий вплотную
            под шапкой и уходит вместе с ней при прокрутке вниз (владелец: «а может сортировки вернуть в хедер на главной?
            типа как на ютубе там тоже только на главной они есть»; на остальных страницах шапка — одной строкой, `HeaderRow`);
            на «Матчах» — первой строкой страницы; lg–xl — плашкой цвета панели, липкой под шапкой; от xl — правила
            .bare-panel в app/globals.css */}
        <div className={`bare-panel max-lg:-mx-4 ${view === 'home' ? 'hdr-sub max-lg:sticky max-lg:top-[53px] max-lg:z-30' : ''} lg:max-xl:sticky lg:max-xl:top-[57px] lg:max-xl:z-30 lg:max-xl:bg-[#090c10] lg:max-xl:pb-2`}>
        {listHead ? (
          // заголовок — как у полок выше: одна схема на всю страницу
          <h2 className="h2 text-[24px] leading-none sm:text-[28px]">{past ? 'Как сыграли' : 'Все матчи дня'}</h2>
        ) : null}
        {/* выбор дня — и здесь, у списка (как и чип в «Главных матчах», ведёт на страницу дня); рядом — порядок списка */}
        {/* на телефоне дни и порядок — одной строкой: порядок значками (список / часы) слева (владелец: «может сортировку по времени
            влево перенести?»), дни листаются вбок до края экрана */}
        <div
          className={`flex items-center justify-between gap-x-3 gap-y-3 max-lg:pt-0 max-lg:pb-2 max-lg:pl-4 max-lg:pr-0 lg:flex-wrap lg:gap-x-6 lg:max-xl:rounded-card lg:max-xl:bg-panel lg:max-xl:py-1.5 lg:max-xl:pl-4 lg:max-xl:pr-1.5 lg:max-xl:shadow-[0_10px_30px_rgb(0_0_0/0.45)] ${listHead ? 'mt-5' : ''}`}
        >
          <div className="min-w-0 flex-1 lg:w-auto lg:flex-none">
            <DateTabs
              active={ymd}
              today={today}
              liveToday={liveToday}
              fade={!(past || !matches.length)}
              chips
              {...(view === 'list' ? { section: 'all' } : { hash: '#matches' })}
            />
          </div>
          {past || !matches.length ? null : (
            (() => {
              const orders = [
                ['league', 'По турнирам', view === 'list' ? `${list}${fq ? `?${fq}` : ''}` : `${base}#matches`],
                // главная хранится готовой одной на всех и параметров адреса не читает: «По времени» сегодня — своя страница
                ['time', 'По времени', view === 'list' ? `${list}?sort=time${fq ? `&${fq}` : ''}` : ymd === today ? '/matches/po-vremeni#matches' : `${base}?sort=time#matches`],
              ] as const
              const [cur, other] = byTime ? [orders[1], orders[0]] : [orders[0], orders[1]]
              return (
                <>
                  {/* ниже lg — один чип в стиле дней со значком текущего порядка, нажатие — другой порядок (владелец: «посмотри
                      ещё раз визуально на главную» — капсула из двух значков с серым «выбрано» спорила с белым выбранным днём) */}
                  <Link
                    href={other[2]}
                    prefetch={false}
                    scroll={false}
                    title={`${cur[1]} · нажмите — ${other[1].toLowerCase()}`}
                    aria-label={`Порядок: ${cur[1].toLowerCase()}. Показать ${other[1].toLowerCase()}`}
                    className="order-first grid h-[30px] w-11 shrink-0 place-items-center rounded-full bg-white/[0.08] text-fg/85 transition-colors active:bg-white/[0.14] lg:hidden"
                  >
                    <SortIcon k={cur[0]} />
                  </Link>
                  {/* порядок списка — обычными ссылками (?sort=time): работает без JS, у страницы один canonical. Скругления
                      вложены по правилу «внешний = внутренний + отступ»: строка 20px, отступ 10 → переключатель 10px
                      (rounded-ctl), отступ 4 → выбранный 6px */}
                  <nav aria-label="Порядок матчей" className="hidden shrink-0 items-center gap-1 rounded-ctl bg-white/[0.04] p-1 text-[14px] font-medium lg:flex">
                    {orders.map(([k, label, href]) => (
                      <Link
                        key={k}
                        href={href}
                        prefetch={false}
                        scroll={false}
                        aria-current={(k === 'time') === byTime ? 'true' : undefined}
                        className={`rounded-md px-3.5 py-1.5 transition-colors ${(k === 'time') === byTime ? 'bg-white/[0.08] text-fg' : 'text-dim hover:text-fg'}`}
                      >
                        {label}
                      </Link>
                    ))}
                  </nav>
                </>
              )
            })()
          )}
        </div>
        </div>
        {/* кружки историй — под днями и порядком (владелец: «а может на главной сортировки перенести под хедер?»): истории
            собраны из матчей выбранного дня, переключатель управляет и ими; на xl — подборки в правой панели каркаса */}
        {/* своей карточкой «Подборки дня», как правая панель на компьютере с теми же историями (владелец: «а может на
            телефоне истории в свой отдельный блок сделать а то они как сами по себе» — «да»): на фоне между днями и
            «Сейчас идут» кружки висели отдельно от остальной страницы из карточек */}
        {view === 'home' && storyGroups.length ? (
          // заголовок над карточкой, как у лиг и разделов страницы матча
          <section aria-labelledby="picks-title" className="mt-4 min-w-0 sm:mt-6 xl:hidden">
            <BlockTitle
              rows
              id="picks-title"
              title={
                <span className="flex items-center gap-1.5">
                  Подборки дня
                  <PlayAll groups={storyGroups} />
                </span>
              }
              aside={
                <Link href="/tags" className="font-medium text-dim transition-colors hover:text-fg">
                  Все →
                </Link>
              }
            />
            {/* без карточки, на фоне (владелец: «уберем фон и выровняем слева по левому блоку который ниже и справа чтоб
                не обрезалось»): первый кружок — от левого края карточек ниже, ряд листается до края экрана */}
            <div className="-mr-4">
              <StoryCircles groups={storyGroups} />
            </div>
          </section>
        ) : null}
        {focusList.length ? (
          // заголовок над лентой, как у «Интересно сегодня» и блоков ниже (владелец: «странно что у матчей в фокусе нет
          // заголовка»); в самой карточке — только турнир и минута
          <section aria-labelledby="focus-title" className="mt-6 xl:hidden">
            <BlockTitle rows id="focus-title" title="Матч в фокусе" />
            <Carousel label="Матч в фокусе">
              {focusList.map((f, i) => (
                <FocusMatch key={f.match.id} item={f} full={focusFull[i]} />
              ))}
            </Carousel>
          </section>
        ) : null}
        <div
          className={`mt-6 grid gap-8 sm:mt-8 sm:gap-10 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_340px] ${view === 'home' ? 'xl:mt-6 xl:!grid-cols-1 xl:gap-8' : ''}`}
        >
          {/* между блоками 32px, от заголовка до карточки 10px — как на странице матча: заголовки теперь над карточками, и при
              12px заголовок читался подписью к блоку выше */}
          <div className="match-body min-w-0 space-y-8">
            {failed ? (
              <div className="card p-5 text-[15px] text-dim">
                Не удалось загрузить матчи: источник данных временно недоступен. Обновите страницу через минуту.
              </div>
            ) : null}
            {/* матчи избранных команд (звёздочка на странице матча) — первыми; нет избранных — блока нет */}
            <FavMatches ymd={ymd} />
            {liveTop.length || liveRest.length ? <LiveBlock items={liveTop} total={liveMain.length} rest={liveRest} /> : null}
            {byTime && timeList.length ? <TimeBlock items={timeList} lines={lines} /> : null}
            {byTime ? null : featured.map((g) => (
              <LeagueBlock key={g.league.id} league={g.league} items={g.items} lines={lines} live={liveIn.get(g.league.id) ?? 0} featured {...(view === 'home' ? { limit: 3, more: list } : {})} />
            ))}
            {view === 'home' && !byTime && featured.length ? (
              <Link href={list} className="card flex h-12 items-center justify-center gap-1.5 text-[15px] font-semibold transition-colors hover:bg-panel-3 lg:hidden">
                Все матчи {ymd === today ? 'на сегодня' : 'дня'} →
              </Link>
            ) : null}
            {!byTime && others.length ? (
              // «Другие турниры» — раскрывашкой заголовком на фоне, внутри — те же блоки лиг с заголовками над карточками
              // (было — карточка с турнирами-карточками внутри, «блок в блоке»); на главной ниже lg их нет — там
              // «Все матчи на сегодня»
              <details className={`group ${view === 'home' && featured.length ? 'max-lg:hidden' : ''}`} open={!featured.length}>
                <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 sm:px-5 [&::-webkit-details-marker]:hidden">
                  <h2 className="text-[20px] font-bold leading-tight tracking-[-0.01em]">{featured.length ? 'Другие турниры' : 'Все турниры'}</h2>
                  <span className="flex items-center gap-2 text-[13px] text-mute transition-colors group-hover:text-fg">
                    {pluralN(totalOthers, ['матч', 'матча', 'матчей'])}
                    <span className="transition group-open:rotate-180">▾</span>
                  </span>
                </summary>
                <div className="mt-6 space-y-8">
                  {others.map((g) => (
                    <LeagueBlock key={g.league.id} league={g.league} items={g.items} lines={lines} live={liveIn.get(g.league.id) ?? 0} />
                  ))}
                  {shownOthers < totalOthers ? (
                    <p className="px-4 text-[13px] text-dim sm:px-5">
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
            {facts.length ? (
              <div className="lg:hidden">
                <Interesting facts={facts} />
              </div>
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
          {/* на главной от xl «Где ставить» и прочее — не нужно: подборки и вход — в правой панели */}
          <div className="xl:hidden">
            <Sidebar values={values} numbers={picks?.numbers ?? null} />
          </div>
        </div>
      </section>
      ) : null}
    </>
  )
}

/** Значок порядка ниже lg (ряд шапки): «По турнирам» — список с заголовками групп, «По времени» — часы. */
function SortIcon({ k }: { k: 'league' | 'time' }) {
  return (
    <Icon k={k === 'time' ? 'sort-time' : 'sort-list'} size={18} className="lg:hidden" />
  )
}
