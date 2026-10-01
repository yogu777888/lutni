import Link from 'next/link'
import { countryRank, featuredRank } from '@/config/leagues'
import { getMatchesByDate, tagsFor, type FeedItem } from '@/lib/data'
import { dayLabel, diffDays, formatDayMonth, plural, pluralN, ymdToNoonTs } from '@/lib/format'
import { isLive, liveRank } from '@/lib/rank'
import { buildStoryGroups } from '@/lib/story-groups'
import type { League, Match } from '@/lib/types'
import { DateTabs } from './DateTabs'
import { LeagueBlock, LiveBlock } from './LeagueBlock'
import { Sidebar } from './Sidebar'
import { StoryCircles } from './story/StoryCircles'
import { ValuePicks } from './ValuePicks'

const OTHER_LIMIT = 160
const LIVE_LIMIT = 6

export function dayTitle(ymd: string, today: string) {
  const d = diffDays(ymd, today)
  const date = formatDayMonth(ymdToNoonTs(ymd))
  if (d === 0) return `Футбол сегодня, ${date}`
  if (d === 1) return `Футбол завтра, ${date}`
  if (d < 0) return `Футбол ${date}: результаты матчей`
  return `Футбол ${date}: ${dayLabel(ymd, today).split(',')[0]}`
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
    .slice(0, 4)

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

  return (
    <>
      <header className="mb-5">
        <h1 className="text-[24px] font-extrabold leading-tight sm:text-[30px]">{dayTitle(ymd, today)}</h1>
        <p className="mt-1 text-sm text-dim">{summary}</p>
        <div className="mt-4">
          <DateTabs active={ymd} today={today} />
        </div>
      </header>

      <StoryCircles groups={storyGroups} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          {failed ? (
            <div className="card border-loss/40 p-4 text-sm">
              Не удалось загрузить матчи: источник данных временно недоступен. Обновите страницу через минуту.
            </div>
          ) : null}
          {liveTop.length ? <LiveBlock items={liveTop} total={liveAll.length} /> : null}
          <ValuePicks items={values} />
          {featured.map((g) => (
            <LeagueBlock key={g.league.id} league={g.league} items={g.items} featured />
          ))}
          {others.length ? (
            <details className="card group overflow-hidden" open={!featured.length}>
              <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-[14px] font-bold hover:bg-panel-2">
                <span>{featured.length ? 'Другие турниры' : 'Все турниры'}</span>
                <span className="flex items-center gap-2 text-[12px] font-medium text-dim">
                  {pluralN(totalOthers, ['матч', 'матча', 'матчей'])}
                  <span className="transition group-open:rotate-180">▾</span>
                </span>
              </summary>
              <div className="space-y-3 border-t border-edge p-3">
                {others.map((g) => (
                  <LeagueBlock key={g.league.id} league={g.league} items={g.items} />
                ))}
                {shownOthers < totalOthers ? (
                  <p className="px-1 text-xs text-dim">
                    Показаны {shownOthers} из {totalOthers} матчей. Остальные — на страницах{' '}
                    <Link href="/leagues" className="text-acid hover:underline">
                      турниров
                    </Link>
                    .
                  </p>
                ) : null}
              </div>
            </details>
          ) : null}
          {!matches.length && !failed ? (
            <div className="card p-8 text-center">
              <p className="font-semibold">На этот день матчей не найдено.</p>
              <Link href="/" className="mt-2 inline-block text-sm text-acid hover:underline">
                Матчи сегодня →
              </Link>
            </div>
          ) : null}
        </div>
        <Sidebar />
      </div>
    </>
  )
}
