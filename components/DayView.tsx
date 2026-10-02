import Link from 'next/link'
import { countryRank, featuredRank } from '@/config/leagues'
import { getMatchesByDate, tagsFor, type FeedItem } from '@/lib/data'
import { diffDays, formatDayMonth, formatWeekdayLong, plural, pluralN, ymdToNoonTs } from '@/lib/format'
import { isLive, liveRank } from '@/lib/rank'
import { buildStoryGroups } from '@/lib/story-groups'
import type { League, Match } from '@/lib/types'
import { DateTabs } from './DateTabs'
import { LeagueBlock, LiveBlock } from './LeagueBlock'
import { Sidebar } from './Sidebar'
import { StoryCircles } from './story/StoryCircles'
import { ValueBoard } from './ValueBoard'

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

  const open = items.filter((i) => i.match.status === 'scheduled' || i.match.status === 'live')
  const storyGroups = buildStoryGroups(items)
  const values = open
    .filter((i) => i.summary?.pick?.kind === 'value' && i.match.status === 'scheduled')
    .sort((a, b) => (b.summary!.pick!.ev ?? 0) - (a.summary!.pick!.ev ?? 0))
    .slice(0, 5)

  const liveAll = items.filter((i) => isLive(i.match))
  // в «Сейчас в игре» — сначала топ-лиги, потом матчи с линией; женские и молодёжные — в конец
  const liveTop = [...liveAll].sort((a, b) => liveRank(a.match) - liveRank(b.match) || a.match.ts - b.match.ts).slice(0, LIVE_LIMIT)
  const featuredCount = featured.reduce((s, g) => s + g.items.length, 0)

  const summary = matches.length
    ? [
        pluralN(matches.length, ['матч', 'матча', 'матчей']),
        featuredCount ? `${featuredCount} — в топ-турнирах` : null,
        liveAll.length ? `${liveAll.length} ${plural(liveAll.length, ['идёт', 'идут', 'идут'])} сейчас` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Коэффициенты, теги ставок и прогнозы на футбол'

  const [line1, line2] = dayTitleLines(ymd, today)
  const past = diffDays(ymd, today) < 0

  return (
    <>
      <section className="pb-12 pt-8 sm:pb-16 sm:pt-16">
        <a
          href={liveAll.length ? '#live' : undefined}
          className="fade-up inline-flex max-w-full items-center gap-2 rounded-full border border-edge py-1 pl-1.5 pr-3.5 text-[13px] text-dim transition-colors hover:border-edge-2"
        >
          {liveAll.length ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-live/10 px-2 py-0.5 text-[12px] font-semibold text-live">
              <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-live" />
              LIVE
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-acid/10 px-2 py-0.5 text-[12px] font-semibold text-acid">
              <span className="h-1.5 w-1.5 rounded-full bg-acid" />
              {past ? 'итоги' : 'линия'}
            </span>
          )}
          <span className="truncate">{summary}</span>
        </a>
        <h1 className="display mt-6 text-[46px] sm:text-[72px] lg:text-[84px]">
          <span className="rise">
            <span>{line1}</span>
          </span>
          <span className="rise">
            <span className="text-chalk" style={{ animationDelay: '120ms' }}>
              {line2}
            </span>
          </span>
        </h1>
        <p className="fade-up mt-6 max-w-[34em] text-[17px] leading-relaxed text-dim sm:text-[19px]" style={{ animationDelay: '300ms' }}>
          Честные шансы, теги ставок и перевес по каждому матчу. Без «экспертов» — только цифры рынка и статистика.
        </p>
        <div className="fade-up mt-9" style={{ animationDelay: '420ms' }}>
          <DateTabs active={ymd} today={today} />
        </div>
      </section>

      {storyGroups.length ? (
        <section className="border-y border-edge py-7">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="eyebrow">Истории дня</p>
            <span className="text-[13px] text-mute">нажмите на кружок — пролистайте лучшие матчи тега</span>
          </div>
          <StoryCircles groups={storyGroups} />
        </section>
      ) : null}

      <ValueBoard items={values} />

      <section className="mt-16 sm:mt-20">
        <p className="eyebrow">{past ? 'Результаты' : 'Матчи'}</p>
        <h2 className="h2 mt-3 text-[30px] sm:text-[44px]">{past ? 'Как сыграли' : 'Все матчи дня'}</h2>
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
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
