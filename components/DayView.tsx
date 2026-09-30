import Link from 'next/link'
import { featuredRank } from '@/config/leagues'
import { getMatchesByDate, tagsFor, type FeedItem } from '@/lib/data'
import { dayLabel, diffDays, formatDayMonth, plural, pluralN, ymdToNoonTs } from '@/lib/format'
import type { League, Match } from '@/lib/types'
import { DateTabs } from './DateTabs'
import { LeagueBlock } from './LeagueBlock'
import { Sidebar } from './Sidebar'
import { TagStrip } from './TagStrip'
import { ValuePicks } from './ValuePicks'

const OTHER_LIMIT = 160

export function dayTitle(ymd: string, today: string) {
  const d = diffDays(ymd, today)
  const date = formatDayMonth(ymdToNoonTs(ymd))
  if (d === 0) return `Футбол сегодня, ${date}`
  if (d === 1) return `Футбол завтра, ${date}`
  if (d < 0) return `Футбол ${date}: результаты матчей`
  return `Футбол ${date}: ${dayLabel(ymd, today).split(',')[0]}`
}

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
    // сначала турниры с коэффициентами — они интереснее для ставок
    .sort(
      (a, b) =>
        Number(b.items.some((i) => i.match.odds)) - Number(a.items.some((i) => i.match.odds)) ||
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
  const counts = new Map<string, number>()
  for (const it of open) for (const t of it.tags) counts.set(t.slug, (counts.get(t.slug) ?? 0) + 1)
  const tagCounts = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const values = open
    .filter((i) => i.summary?.pick?.kind === 'value' && i.match.status === 'scheduled')
    .sort((a, b) => (b.summary!.pick!.ev ?? 0) - (a.summary!.pick!.ev ?? 0))
    .slice(0, 4)
  const live = items.filter((i) => i.match.status === 'live').length
  const featuredCount = featured.reduce((s, g) => s + g.items.length, 0)

  return (
    <>
      <div className="pitch-bg -mx-4 mb-5 border-b border-edge px-4 pb-5 pt-3 sm:mx-0 sm:rounded-3xl sm:border sm:p-6">
        <h1 className="font-display text-[22px] font-bold leading-tight tracking-tight sm:text-3xl">{dayTitle(ymd, today)}</h1>
        <p className="mt-2 text-sm text-dim">
          {matches.length
            ? `${pluralN(matches.length, ['матч', 'матча', 'матчей'])}, ${featuredCount} — в топ-турнирах${live ? ` · ${live} ${plural(live, ['идёт', 'идут', 'идут'])} сейчас` : ''}. Коэффициенты, теги и прогнозы обновляются автоматически.`
            : 'Коэффициенты, теги ставок и прогнозы на футбол.'}
        </p>
        <div className="mt-4">
          <DateTabs active={ymd} today={today} />
        </div>
      </div>

      <TagStrip counts={tagCounts} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          {failed ? (
            <div className="card border-loss/40 p-4 text-sm">
              Не удалось загрузить матчи: источник данных временно недоступен. Обновите страницу через минуту.
            </div>
          ) : null}
          <ValuePicks items={values} />
          {featured.map((g) => (
            <LeagueBlock key={g.league.id} league={g.league} items={g.items} featured />
          ))}
          {others.length ? (
            <details className="card group overflow-hidden" open={!featured.length}>
              <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-bold hover:bg-panel-2">
                <span>Другие турниры</span>
                <span className="flex items-center gap-2 text-xs font-semibold text-dim">
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
