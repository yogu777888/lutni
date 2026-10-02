import type { Metadata } from 'next'
import Link from 'next/link'
import { FEATURED_LEAGUES, featuredRank } from '@/config/leagues'
import { getLeagues } from '@/lib/data'
import { ruCountry } from '@/lib/i18n/ru'
import { leagueHref } from '@/lib/links'
import type { LeagueInfo } from '@/lib/types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Футбольные лиги: таблицы, расписание и прогнозы',
  description: 'Турнирные таблицы, расписание, результаты и прогнозы на матчи АПЛ, Ла Лиги, Серии A, Бундеслиги, РПЛ, Лиги чемпионов и других турниров.',
  alternates: { canonical: '/leagues' },
}

export default async function LeaguesPage() {
  let leagues: LeagueInfo[] = []
  let failed = false
  try {
    leagues = await getLeagues()
  } catch {
    failed = true
  }
  const featured = leagues.filter((l) => featuredRank(l) >= 0).sort((a, b) => featuredRank(a) - featuredRank(b))
  const byCountry = new Map<string, LeagueInfo[]>()
  for (const l of leagues) {
    if (featuredRank(l) >= 0) continue
    const c = /^world$/i.test(l.country) || !l.country ? 'Международные' : ruCountry(l.country)
    byCountry.set(c, [...(byCountry.get(c) ?? []), l])
  }
  const countries = [...byCountry.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ru'))

  return (
    <>
      <h1 className="pt-2 display text-[36px] sm:text-[56px]">Лиги и турниры</h1>
      <p className="mt-2 text-[15px] text-dim">Таблицы, расписание, результаты и прогнозы на матчи.</p>
      {failed ? <div className="card mt-4 p-4 text-sm text-dim">Список лиг временно недоступен.</div> : null}

      <h2 className="mb-3 mt-8 text-[13px] font-medium text-mute">Топ-турниры</h2>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {(featured.length ? featured : FEATURED_LEAGUES.map((f) => ({ id: f.id, name: f.short, original: f.name, country: f.country }))).map((l) => (
          <Link key={l.id} href={leagueHref(l)} className="card flex items-center justify-between gap-3 p-4 transition-colors hover:bg-panel-2">
            <span className="font-medium">{l.name}</span>
            <span className="text-mute" aria-hidden>
              ›
            </span>
          </Link>
        ))}
      </div>

      {countries.length ? (
        <>
          <h2 className="mb-3 mt-10 text-[13px] font-medium text-mute">Все турниры по странам</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {countries.map(([country, list]) => (
              <details key={country} className="card group">
                <summary className="flex cursor-pointer items-center justify-between rounded-[18px] px-4 py-3.5 text-sm font-medium transition-colors hover:bg-panel-2">
                  {country}
                  <span className="text-[12px] text-mute">
                    {list.length} <span className="inline-block transition group-open:rotate-180">▾</span>
                  </span>
                </summary>
                <ul className="border-t border-edge px-4 py-2 text-sm">
                  {list.map((l) => (
                    <li key={l.id}>
                      <Link href={leagueHref(l)} prefetch={false} className="block py-1.5 text-dim transition-colors hover:text-fg">
                        {l.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </>
      ) : null}
    </>
  )
}
