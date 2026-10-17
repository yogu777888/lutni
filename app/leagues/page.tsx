import type { Metadata } from 'next'
import Link from 'next/link'
import { BlockHead } from '@/components/BlockHead'
import { LeagueFilter } from '@/components/LeagueFilter'
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

/** Флаг кругом 22px, как в левой панели; международные — знак глобуса. */
function Mark({ flag }: { flag: string | null }) {
  if (flag)
    // eslint-disable-next-line @next/next/no-img-element -- маленький SVG, оптимизация next/image не нужна
    return <img src={`/flags/${flag}.svg`} alt="" width={22} height={22} loading="lazy" className="h-[22px] w-[22px] shrink-0 rounded-full object-cover ring-1 ring-white/15" />
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
          title="Лиги и турниры"
          sub={
            failed
              ? 'Список лиг временно недоступен.'
              : `Таблицы, расписание и результаты — ${pluralN(total, ['турнир', 'турнира', 'турниров'])} из ${pluralN(countries, ['страны', 'стран', 'стран'])}.`
          }
        >
          {failed ? null : <LeagueFilter target="league-index" />}
        </PageHead>

        <div id="league-index" className="space-y-4 xl:space-y-2">
          {top.length ? (
            <section data-section className="card @container overflow-hidden">
              <BlockHead title="Топ-турниры" />
              <ul className="grid @xl:grid-cols-2">
                {top.map((l) => (
                  <li key={l.id} data-item data-q={l.q} className="border-t border-edge">
                    <Link href={l.href} prefetch={false} className="flex h-full items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02] sm:px-5">
                      <Mark flag={l.flag} />
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
            <section data-section className="card @container overflow-hidden">
              {/* колонки — по ширине самого блока: на 1280 с панелями в три колонки обрезались «Саудовская Аравия», «Турниры сборных» */}
              <BlockHead title="Страны и турниры" aside={pluralN(countries, ['страна', 'страны', 'стран'])} />
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
            </section>
          ) : null}

          <p data-empty hidden className="card px-4 py-4 text-[14px] text-dim sm:px-5">
            Ничего не нашлось. Попробуйте название страны или турнира по-английски — например, «Premier League».
          </p>
        </div>
      </div>
    </>
  )
}
