import type { Metadata } from 'next'
import Link from 'next/link'
import { BlockHead } from '@/components/BlockHead'
import { LeagueFilter } from '@/components/LeagueFilter'
import { LeagueMark } from '@/components/LeagueMark'
import { leagueLogo } from '@/lib/league-logos'
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

/**
 * Знак в сером круге, как в Apple Sports (владелец: «добавь круглые подложки как в эппл спортс»): логотип турнира — во весь
 * круг (`LeagueMark`, 64% круга), нет логотипа — флаг кругом поменьше внутри, у международных — глобус.
 */
function Disc({ id = 0, flag, size }: { id?: number; flag: string | null; size: number }) {
  if (id && leagueLogo(id)) return <LeagueMark id={id} flag={flag} size={size} />
  return (
    <span aria-hidden className="grid shrink-0 place-items-center rounded-full bg-white/[0.1]" style={{ width: size, height: size }}>
      <LeagueMark id={0} flag={flag} size={Math.round(size * 0.55)} fallback={<Globe size={Math.round(size * 0.5)} />} />
    </span>
  )
}

function Globe({ size }: { size: number }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="text-dim" style={{ width: size, height: size }} fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.8 2.5 15.2 0 18M12 3c-2.5 2.8-2.5 15.2 0 18" />
    </svg>
  )
}

/** Шеврон у края строки — строка ведёт на страницу турнира, как в списках iOS. */
const Chevron = ({ className = 'transition-colors group-hover/r:text-fg' }: { className?: string }) => (
  <svg aria-hidden viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 text-mute ${className}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 6 6 6-6 6" />
  </svg>
)

function Group({ g }: { g: IndexGroup }) {
  return (
    <li data-group data-q={g.q} className="border-t border-edge">
      <details className="group/c">
        <summary className="flex min-h-[72px] items-center gap-3.5 px-4 py-3 transition-colors hover:bg-white/[0.02] sm:px-5">
          <Disc flag={g.flag} size={44} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[16px] font-semibold">{g.name}</span>
            <span className="block text-[13px] leading-snug text-mute">{pluralN(g.leagues.length, ['турнир', 'турнира', 'турниров'])}</span>
          </span>
          {/* раскрывается — шеврон вниз, тем же значком, что у строк-ссылок */}
          <Chevron className="rotate-90 transition-transform group-open/c:-rotate-90" />
        </summary>
        {/* оформление ссылок — у списка, а не у каждой из 1249: страница и так ~1 МБ; знак — в круге 36px, под знаком страны */}
        <ul className="pb-2 [&_a]:flex [&_a]:min-h-[56px] [&_a]:items-center [&_a]:gap-3.5 [&_a]:py-2 [&_a]:pl-[calc(1rem+4px)] [&_a]:pr-4 [&_a]:text-[15px] [&_a]:text-dim [&_a]:transition-colors [&_a:hover]:bg-white/[0.02] [&_a:hover]:text-fg [&_a:hover_svg]:text-fg sm:[&_a]:pl-[calc(1.25rem+4px)] sm:[&_a]:pr-5">
          {g.leagues.map((l) => (
            <li key={l.id} data-league data-q={l.q || undefined}>
              <Link href={l.href} prefetch={false}>
                <Disc id={l.id} flag={g.flag} size={36} />
                <span className="min-w-0 flex-1">{l.name}</span>
                <Chevron />
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
              <ul>
                {top.map((l) => (
                  <li key={l.id} data-top={l.name} data-q={l.q} className="border-t border-edge">
                    <Link href={l.href} prefetch={false} className="group/r flex min-h-[72px] items-center gap-3.5 px-4 py-3 transition-colors hover:bg-white/[0.02] sm:px-5">
                      <Disc id={l.id} flag={l.flag} size={44} />
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-[16px] font-semibold ${l.over ? 'text-dim' : ''}`}>{l.name}</span>
                        {/* подпись у каждой строки: страна (две «Премьер-лиги») и состояние, если есть матчи сегодня или завтра */}
                        <span className="block text-[13px] leading-snug text-mute">{l.state ? `${l.place} · ${l.state}` : l.place}</span>
                      </span>
                      <Chevron />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {groups.length ? (
            <section id="league-index" className="card @container overflow-hidden">
              {/* одной колонкой, как «Букмекеры» (владелец: «лиги и страны в 1 строку… изза того что 2 на строке то логотипы еще меньше»);
                  фильтр — в шапке блока, рядом с тем, что он сужает */}
              <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4 sm:px-5">
                <h2 className="text-[20px] font-bold tracking-tight">
                  Страны и турниры <span className="text-[12px] font-normal text-mute">{pluralN(countries, ['страна', 'страны', 'стран'])}</span>
                </h2>
                <LeagueFilter target="league-index" />
              </header>
              <ul>
                {shown.map((g) => (
                  <Group key={g.key} g={g} />
                ))}
              </ul>
              {more.length ? (
                <details data-more className="group/more border-t border-edge">
                  <summary className="flex items-center justify-between gap-3 px-4 py-3.5 text-[14px] text-dim transition-colors hover:text-fg sm:px-5">
                    <span>Ещё {pluralN(more.length, ['страна', 'страны', 'стран'])}</span>
                    <Chevron className="rotate-90 transition-transform group-open/more:-rotate-90" />
                  </summary>
                  <ul>
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
