import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { cache } from 'react'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { MatchRow } from '@/components/MatchRow'
import { Section } from '@/components/Section'
import { Sidebar } from '@/components/Sidebar'
import { StandingsTable } from '@/components/StandingsTable'
import { currentSeason, getLeague, getSeasonGames, getStandings, settle, tagsFor } from '@/lib/data'
import { dayLabel, formatDateShort, idFromSlug, todayYmd, ymdInTz } from '@/lib/format'
import { leagueHref } from '@/lib/links'
import type { Match } from '@/lib/types'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

const load = cache(async (id: number) => {
  const league = await getLeague(id)
  if (!league) return null
  const year = currentSeason(league)
  if (!year) return { league, year: null, games: [] as Match[], standings: null }
  const [games, standings] = await Promise.all([
    settle(getSeasonGames(id, year), [] as Match[]),
    settle(getStandings(id, year), null),
  ])
  return { league, year, games, standings }
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const id = idFromSlug(slug)
  const data = id ? await load(id).catch(() => null) : null
  if (!data) return {}
  const name = data.league.name
  return {
    title: `${name}: таблица, расписание, результаты и прогнозы`,
    description: `${name}${data.year ? ` ${data.year}/${String(data.year + 1).slice(2)}` : ''}: турнирная таблица, ближайшие матчи с коэффициентами и тегами ставок, результаты туров.`,
    alternates: { canonical: leagueHref(data.league) },
  }
}

export default async function LeaguePage({ params }: Props) {
  const { slug } = await params
  const id = idFromSlug(slug)
  if (!id) notFound()
  const data = await load(id)
  if (!data) notFound()
  const { league, year, games, standings } = data
  const canonical = leagueHref(league)
  if (`/league/${slug}` !== canonical) permanentRedirect(canonical)

  const now = Date.now()
  const upcoming = games.filter((g) => g.status === 'live' || (g.status === 'scheduled' && g.ts > now - 3 * 3600_000)).slice(0, 12)
  const results = games
    .filter((g) => g.status === 'finished')
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 12)
  const today = todayYmd()

  return (
    <>
      <Breadcrumbs items={[{ href: '/leagues', label: 'Лиги' }, { href: canonical, label: league.name }]} />
      <div className="pitch-bg card mb-6 p-5 sm:p-7">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{league.name}</h1>
        <p className="mt-2 text-sm text-dim">
          {year ? `Сезон ${year}/${String(year + 1).slice(2)} · ` : ''}таблица, расписание, результаты и прогнозы на матчи
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <section className="card overflow-hidden">
            <h2 className="border-b border-edge px-4 py-3 font-display text-[15px] font-semibold">Ближайшие матчи</h2>
            {upcoming.length ? (
              <div className="divide-y divide-edge/70">
                {upcoming.map((m, i) => {
                  const day = ymdInTz(m.ts)
                  const showDay = i === 0 || ymdInTz(upcoming[i - 1].ts) !== day
                  return (
                    <div key={m.id}>
                      {showDay ? (
                        <div className="bg-panel-2/60 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-dim">
                          {dayLabel(day, today)}
                          {day !== today ? ` · ${formatDateShort(m.ts)}` : ''}
                        </div>
                      ) : null}
                      <MatchRow m={m} {...tagsFor(m)} />
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="p-4 text-sm text-dim">Ближайших матчей нет.</p>
            )}
          </section>
          {standings ? (
            <Section title="Турнирная таблица">
              <StandingsTable standings={standings} />
            </Section>
          ) : null}
          {results.length ? (
            <section className="card overflow-hidden">
              <h2 className="border-b border-edge px-4 py-3 font-display text-[15px] font-semibold">Последние результаты</h2>
              <div className="divide-y divide-edge/70">
                {results.map((m) => (
                  <MatchRow key={m.id} m={m} tags={[]} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
        <Sidebar />
      </div>
    </>
  )
}
