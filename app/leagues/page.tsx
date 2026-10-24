import type { Metadata } from 'next'
import Link from 'next/link'
import { BlockHead } from '@/components/BlockHead'
import { LeagueFilter } from '@/components/LeagueFilter'
import { LeagueMark } from '@/components/LeagueMark'
import { PageHead } from '@/components/PageHead'
import { getLeagues } from '@/lib/data'
import { pluralN } from '@/lib/format'
import { leagueIndex, type IndexGroup } from '@/lib/league-index'
import type { LeagueInfo } from '@/lib/types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Футбольные лиги: таблицы, расписание и прогнозы',
  description: 'Турнирные таблицы, расписание, результаты и прогнозы на матчи АПЛ, Ла Лиги, Серии A, Бундеслиги, РПЛ, Лиги чемпионов и других турниров.',
  alternates: { canonical: '/leagues' },
}

/** Сколько стран видно сразу; остальные — под «Ещё N стран» (на телефоне 170 раскрывашек давали ~12 000px). */
const SHOWN = 20

/** Знак кругом 22px, как в левой панели: у турнира — логотип лиги или флаг, у страны — флаг; международные — знак глобуса. */
function Mark({ id = 0, flag }: { id?: number; flag: string | null }) {
  return <LeagueMark id={id} flag={flag} size={22} fallback={<Globe />} />
}

function Globe() {
  return (
    <span aria-hidden className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-white/[0.08] text-mute">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.8 2.5 15.2 0 18M12 3c-2.5 2.8-2.5 15.2 0 18" />
      </svg>
    </span>
  )
}

function Group({ g }: { g: IndexGroup }) {
  return (
    <li data-group data-q={g.q} className="border-t border-edge">
      <details className="group/c">
        <summary className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02] sm:px-5">
          <Mark flag={g.flag} />
          <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{g.name}</span>
          <span className="text-[12.5px] text-mute">{g.leagues.length}</span>
          <span aria-hidden className="text-mute transition-transform group-open/c:rotate-180">
            ▾
          </span>
        </summary>
        {/* оформление ссылок — у списка, а не у каждой из 1249: страница и так ~1 МБ */}
        <ul className="pb-2 [&_a]:block [&_a]:py-1.5 [&_a]:pl-[50px] [&_a]:pr-4 [&_a]:text-[14px] [&_a]:text-dim [&_a]:transition-colors [&_a:hover]:text-fg sm:[&_a]:pl-[54px]">
          {g.leagues.map((l) => (
            <li key={l.id} data-league data-q={l.q || undefined}>
              <Link href={l.href} prefetch={false}>
                {l.name}
              </Link>
            </li>
          ))}
        </ul>
      </details>
    </li>
  )
}

/**
 * «Лиги и турниры» — в виде главной (владелец: «а страница лиги где типа все лиги как?», согласился на шесть правок):
 * от xl без подложки (`.bare-sub`), разделы — панелями; шапка с поиском; топ-турниры — строками, как в левой панели, с
 * подписью «идут 2 матча» / «сегодня 5 матчей» (закончившиеся ЧМ и Евро — в конце, «сейчас не играется»); страны — по-русски,
 * с флагами, в порядке главной (Россия, Англия, Испания…), 20 сразу, остальные — под «Ещё N стран». Данные —
 * `leagueIndex` в `lib/league-index.ts`.
 */
export default async function LeaguesPage() {
  let leagues: LeagueInfo[] = []
  let failed = false
  try {
    leagues = await getLeagues()
  } catch {
    failed = true
  }
  const { top, groups, countries } = await leagueIndex(leagues)
  const shown = groups.slice(0, SHOWN)
  const more = groups.slice(SHOWN)
  const total = groups.reduce((s, g) => s + g.leagues.length, 0) + top.length

  return (
    <>
      <span hidden className="bare-sub" />
      <div className="space-y-4 xl:space-y-2">
        <PageHead
          section="/leagues"
          title="Лиги и турниры"
          sub={
            failed
              ? 'Список лиг временно недоступен.'
              : `Таблицы, расписание и результаты — ${pluralN(total, ['турнир', 'турнира', 'турниров'])} из ${pluralN(countries, ['страны', 'стран', 'стран'])}.`
          }
        />

        <div className="space-y-4 xl:space-y-2">
          {top.length ? (
            <section className="card @container overflow-hidden">
              <BlockHead title="Топ-турниры" />
              <ul className="grid @xl:grid-cols-2">
                {top.map((l) => (
                  <li key={l.id} data-top={l.name} data-q={l.q} className="border-t border-edge">
                    <Link href={l.href} prefetch={false} className="flex h-full items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02] sm:px-5">
                      <Mark id={l.id} flag={l.flag} />
                      <span className="min-w-0">
                        <span className={`block truncate text-[15px] font-semibold ${l.over ? 'text-dim' : ''}`}>{l.name}</span>
                        {l.state ? <span className="block text-[12.5px] leading-snug text-mute">{l.state}</span> : null}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {groups.length ? (
            <section id="league-index" className="card @container overflow-hidden">
              {/* колонки — по ширине самого блока: на 1280 с панелями в три колонки обрезались «Саудовская Аравия», «Турниры сборных»;
                  фильтр — в шапке блока, рядом с тем, что он сужает */}
              <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4 sm:px-5">
                <h2 className="text-[20px] font-bold tracking-tight">
                  Страны и турниры <span className="text-[12px] font-normal text-mute">{pluralN(countries, ['страна', 'страны', 'стран'])}</span>
                </h2>
                <LeagueFilter target="league-index" />
              </header>
              <ul className="grid items-start @xl:grid-cols-2 @5xl:grid-cols-3">
                {shown.map((g) => (
                  <Group key={g.key} g={g} />
                ))}
              </ul>
              {more.length ? (
                <details data-more className="group/more border-t border-edge">
                  <summary className="flex items-center justify-between gap-3 px-4 py-3.5 text-[14px] text-dim transition-colors hover:text-fg sm:px-5">
                    <span>Ещё {pluralN(more.length, ['страна', 'страны', 'стран'])}</span>
                    <span aria-hidden className="text-mute transition-transform group-open/more:rotate-180">
                      ▾
                    </span>
                  </summary>
                  <ul className="grid items-start @xl:grid-cols-2 @5xl:grid-cols-3">
                    {more.map((g) => (
                      <Group key={g.key} g={g} />
                    ))}
                  </ul>
                </details>
              ) : null}
              {/* текст ставит фильтр: найденное среди топ-турниров (их фильтр не прячет — они в отдельном блоке выше) */}
              <p data-empty hidden className="border-t border-edge px-4 py-4 text-[14px] text-dim sm:px-5" />
            </section>
          ) : null}

        </div>
      </div>
    </>
  )
}
