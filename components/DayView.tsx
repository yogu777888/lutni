import Link from 'next/link'
import { countryRank, FEATURED_LEAGUES, featuredRank } from '@/config/leagues'
import { getMatchesByDate, tagsFor, type FeedItem } from '@/lib/data'
import { dayHref, listHref } from '@/lib/links'
import { applyListFilter, filterQuery, isEmptyFilter, type ListFilter } from '@/lib/list-filter'
import { diffDays, formatDayMonth, formatWeekdayLong, pluralN, weekdayWhen, ymdToNoonTs } from '@/lib/format'
import { isLive, liveRank } from '@/lib/rank'
import { soonMatches } from '@/lib/day-summary'
import { buildStoryGroups, mainCircles, statFor } from '@/lib/story-groups'
import type { League, Match } from '@/lib/types'
import { DateTabs } from './DateTabs'
import { LiveRefresh } from './Live'
import { FavMatches } from './FavMatches'
import { LeagueBlock, LiveBlock, TimeBlock } from './LeagueBlock'
import { Sidebar } from './Sidebar'
import { StoryShelves } from './story/StoryShelves'
import { ValueBoard } from './ValueBoard'
import { SoonShelf } from './SoonShelf'
import { MatchFilter } from './MatchFilter'
import { TAGS } from '@/lib/tags'

const OTHER_LIMIT = 160
/** В списке «по времени» — не больше стольких матчей: сначала топ-лиги, потом остальные с линией. */
const TIME_LIMIT = 200

/** Слово перед цифрой метки на обложке: «3+ гола · 62%», «серия 8». */
const BADGE_WORD: Record<string, string> = {
  'tb-2-5': '3+ гола · ',
  'tm-2-5': 'до 2 голов · ',
  'obe-zabyut': 'обе забьют · ',
  favorit: 'фаворит · ',
  seriya: 'серия ',
  'top-match': 'места ',
  krepost: 'дома без поражений ',
}

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
  const groups = new Map<number, { league: League; items: FeedItem[]; rank: number }>()
  for (const it of listItems) {
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
  // все истории дня — полками на главной, главные теги первыми
  const storyGroups = mainCircles(buildStoryGroups(items), 99)
  const values = open
    .filter((i) => i.summary?.pick?.kind === 'value' && i.match.status === 'scheduled')
    .sort((a, b) => (b.summary!.pick!.ev ?? 0) - (a.summary!.pick!.ev ?? 0))
    .slice(0, 5)

  const liveAll = listItems.filter((i) => isLive(i.match))
  // в «Сейчас в игре» — сначала топ-лиги, потом матчи с линией; женские и молодёжные — в конец
  const liveTop = [...liveAll].sort((a, b) => liveRank(a.match) - liveRank(b.match) || a.match.ts - b.match.ts).slice(0, LIVE_LIMIT)

  const heading = dayHeading(ymd, today)
  const past = diffDays(ymd, today) < 0
  // заголовок «Все матчи дня» над списком — когда на главной над ним есть что-то ещё (выгодные ставки)
  const listHead = view === 'home' && values.length > 0
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

  // полки историй: без «Выгодно» (у него своя полка с кэфами), по 12 матчей; «Показать все» — страница тега, у «В игре» — список
  const shelfGroups = storyGroups.filter((g) => g.key !== 'value')
  const byId = new Map(items.map((it) => [it.match.id, it.match]))
  const shelfMatches = Object.fromEntries(
    shelfGroups.flatMap((g) => g.items.slice(0, 12).map((x) => [x.id, byId.get(x.id)])).filter((e) => e[1]),
  ) as Record<number, (typeof items)[number]['match']>
  const shelfMore = Object.fromEntries(
    shelfGroups.map((g) => [g.key, g.key === 'live' ? list : g.key === 'top' ? undefined : `/tag/${g.key}`]),
  )
  // метка в углу обложки — главная цифра (голое «62%» непонятно — к цифре короткое слово) матча в истории («−17%», «62%»); только если в ней есть число
  const shelfStats: Record<string, string> = {}
  for (const g of shelfGroups)
    for (const x of g.items.slice(0, 12)) {
      const st = x.focus ? statFor(x.focus.slug, x.focus.reason) : ''
      if (g.key === 'live' || g.key === 'top' || !/\d/.test(st)) continue
      shelfStats[`${g.key}:${x.id}`] = g.key === 'kadry' ? `без ${st.replace(/\D/g, '')} игроков` : (BADGE_WORD[g.key] ?? '') + st
    }
  // «Скоро начнутся» — без матчей из «В игре» и «Топ дня»
  const soon =
    view === 'home' && !past
      ? soonMatches(items, new Set([...shelfGroups.filter((g) => g.key === 'top' || g.key === 'live').flatMap((g) => g.items.slice(0, 12).map((x) => x.id))]))
      : []
  // список — на странице «Матчи»; на главной — только если полок нет (в этот день нет «взрослых» матчей)
  const showList = view === 'list' || (!shelfGroups.length && !soon.length && !values.length)
  return (
    <>
      {/* пока на этой странице идут матчи — счёт и минуты обновляются сами, без перезагрузки */}
      {liveAll.length ? <LiveRefresh /> : null}
      {view === 'home' ? (
        <>
          {/* главная — как у Spotify: заголовок с датой (сверху — мягкий градиент центральной панели) и сразу полки */}
          <section className="min-w-0 pt-1 sm:pt-0">
            <p className="fade-up text-[14px] font-medium text-dim">{heading.date}</p>
            <h1 className="mt-1.5 text-[30px] font-bold leading-[1.08] tracking-[-0.03em] sm:text-[34px]">
              <span className="rise">
                <span>
                  {heading.title}
                  {/* дата — и в заголовке для поисковиков */}
                  <span className="sr-only">, {formatDayMonth(ymdToNoonTs(ymd))}</span>
                </span>
              </span>
            </h1>
          </section>

      {/* истории — полками, как «Скоро начнутся»: «В игре», «Топ дня», потом «Скоро начнутся» и «Выгодно сегодня»,
          потом остальные истории (у «Выгодно» своя полка с кэфами — история-дубль не нужна) */}
      <StoryShelves groups={shelfGroups} show={['live', 'top']} matches={shelfMatches} more={shelfMore} stats={shelfStats} />
      {past ? null : <SoonShelf items={soon} allHref={`${list}?sort=time`} />}
      <ValueBoard items={values} />
      <StoryShelves groups={shelfGroups} show={shelfGroups.map((g) => g.key).filter((k) => k !== 'live' && k !== 'top')} matches={shelfMatches} more={shelfMore} stats={shelfStats} />

        </>
      ) : null}
      {/* без сводки (в этот день нет ни одного «взрослого» матча) список идёт сразу под заголовком страницы — второй заголовок не нужен */}
      {/* светлая плита (ритм страницы плитами, как у reg.ru): класс bg-panel даёт внутри токены светлой поверхности
          (тёмный текст), фон — на тон темнее карточек, чтобы карточки турниров на ней читались */}
      {view === 'list' ? (
        // страница «Матчи»: заголовок — как на главной, но про список
        <section className="min-w-0 pt-1 sm:pt-0">
          <p className="fade-up text-[14px] font-medium text-dim">{heading.date}</p>
          <h1 className="mt-1.5 text-[30px] font-bold leading-[1.08] tracking-[-0.03em] sm:text-[34px]">
            {listTitle(heading.title)}
            <span className="sr-only">, {formatDayMonth(ymdToNoonTs(ymd))}</span>
          </h1>
          {filtered ? (
            <p className="mt-2 text-[14px] text-dim">
              Своя подборка: {pluralN(listItems.length, ['матч', 'матча', 'матчей'])} из {items.length} ·{' '}
              <Link href={list} className="font-semibold text-fg underline decoration-edge-2 underline-offset-4 hover:decoration-fg">
                показать все
              </Link>
            </p>
          ) : null}
        </section>
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
        className={`scroll-mt-24 ${listHead ? 'mt-12 sm:mt-14' : 'mt-5 sm:mt-6'}`}
      >
        {listHead ? (
          // заголовок — как у полок выше: одна схема на всю страницу
          <h2 className="h2 text-[24px] leading-none sm:text-[28px]">{past ? 'Как сыграли' : 'Все матчи дня'}</h2>
        ) : null}
        {/* выбор дня — и здесь, у списка (как и чип в «Главных матчах», ведёт на страницу дня); рядом — порядок списка */}
        <div className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-3 ${listHead ? 'mt-5' : ''}`}>
          <div className="w-full min-w-0 sm:w-auto">
            <DateTabs active={ymd} today={today} liveToday={liveToday} {...(view === 'list' ? { section: 'all' } : { hash: '#matches' })} />
          </div>
          {past || !matches.length ? null : (
            // порядок списка — обычными ссылками (?sort=time): работает без JS, у страницы один canonical
            <nav aria-label="Порядок матчей" className="flex items-center gap-1 rounded-full bg-white/[0.04] p-1 text-[14px] font-medium">
              {(
                [
                  ['league', 'По турнирам', view === 'list' ? `${list}${fq ? `?${fq}` : ''}` : `${base}#matches`],
                  ['time', 'По времени', view === 'list' ? `${list}?sort=time${fq ? `&${fq}` : ''}` : `${base}?sort=time#matches`],
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
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-5">
            {failed ? (
              <div className="card p-5 text-[15px] text-dim">
                Не удалось загрузить матчи: источник данных временно недоступен. Обновите страницу через минуту.
              </div>
            ) : null}
            {/* матчи избранных команд (звёздочка на странице матча) — первыми; нет избранных — блока нет */}
            <FavMatches ymd={ymd} />
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
      ) : null}
    </>
  )
}
