import Link from 'next/link'
import { countryRank, featuredRank } from '@/config/leagues'
import { getMatchesByDate, tagsFor, type FeedItem } from '@/lib/data'
import { diffDays, formatDayMonth, formatWeekdayLong, pluralN, weekdayWhen, ymdToNoonTs } from '@/lib/format'
import { isLive, liveRank } from '@/lib/rank'
import { buildDaySummary } from '@/lib/day-summary'
import { storyCovers } from '@/lib/story-covers'
import { buildStoryGroups } from '@/lib/story-groups'
import type { League, Match } from '@/lib/types'
import { DateTabs } from './DateTabs'
import { DaySummary } from './DaySummary'
import { LeagueBlock, LiveBlock } from './LeagueBlock'
import { Sidebar } from './Sidebar'
import { StoryCircles } from './story/StoryCircles'

const OTHER_LIMIT = 160
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

export async function DayView({ ymd, today }: { ymd: string; today: string }) {
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

  const storyGroups = buildStoryGroups(items)
  const daySummary = buildDaySummary(items)

  const liveAll = items.filter((i) => isLive(i.match))
  // в «Сейчас в игре» — сначала топ-лиги, потом матчи с линией; женские и молодёжные — в конец
  const liveTop = [...liveAll].sort((a, b) => liveRank(a.match) - liveRank(b.match) || a.match.ts - b.match.ts).slice(0, LIVE_LIMIT)

  const heading = dayHeading(ymd, today)
  const past = diffDays(ymd, today) < 0

  return (
    <>
      <section className="pt-4 sm:pt-5">
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
        {/* выбор дня — календарём прямо под заголовком: меняет всю страницу */}
        <div className="fade-up mt-5" style={{ animationDelay: '150ms' }}>
          <DateTabs active={ymd} today={today} />
        </div>
      </section>

      {storyGroups.length ? (
        <section aria-label="Истории дня" className="mt-6 sm:mt-7">
          <p className="mb-3 text-[13px] font-medium text-dim">Истории дня</p>
          <StoryCircles groups={storyGroups} covers={storyCovers()} />
        </section>
      ) : null}

      <DaySummary s={daySummary} className="mt-6" />

      <section id="matches" className={`scroll-mt-24 ${past ? 'mt-8' : 'mt-16 sm:mt-20'}`}>
        {/* у прошедшего дня заголовок страницы уже «Как сыграли» — второй не нужен */}
        {past ? (
          <h2 className="sr-only">Результаты матчей</h2>
        ) : (
          <>
            <p className="eyebrow">Матчи</p>
            <h2 className="h2 mt-3 text-[30px] sm:text-[44px]">Все матчи дня</h2>
          </>
        )}
        <div className={`grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] ${past ? '' : 'mt-8'}`}>
          <div className="min-w-0 space-y-5">
            {failed ? (
              <div className="card p-5 text-[15px] text-dim">
                Не удалось загрузить матчи: источник данных временно недоступен. Обновите страницу через минуту.
              </div>
            ) : null}
            {liveTop.length ? <LiveBlock items={liveTop} total={liveAll.length} /> : null}
            {featured.map((g) => (
              <LeagueBlock key={g.league.id} league={g.league} items={g.items} featured />
            ))}
            {others.length ? (
              <details className="card group overflow-hidden" open={!featured.length}>
                <summary className="flex cursor-pointer items-center justify-between px-5 py-4 transition-colors hover:bg-white/[0.02]">
                  <span className="text-[17px] font-bold tracking-tight">{featured.length ? 'Другие турниры' : 'Все турниры'}</span>
                  <span className="flex items-center gap-2 text-[13px] text-mute">
                    {pluralN(totalOthers, ['матч', 'матча', 'матчей'])}
                    <span className="transition group-open:rotate-180">▾</span>
                  </span>
                </summary>
                <div className="space-y-4 border-t border-edge p-3 sm:p-4">
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
