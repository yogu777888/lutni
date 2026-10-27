import type { Metadata } from 'next'
import Link from 'next/link'
import { BlockTitle } from '@/components/Section'
import { LeagueFilter } from '@/components/LeagueFilter'
import { Chevron, Disc, Group, SHOWN } from '@/components/LeagueGroup'
import { MoreCountries } from '@/components/MoreCountries'
import { PageHead } from '@/components/PageHead'
import { getLeagues } from '@/lib/data'
import { pluralN } from '@/lib/format'
import { leagueIndex } from '@/lib/league-index'
import type { LeagueInfo } from '@/lib/types'
import { moreCountries } from './actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Футбольные лиги: таблицы, расписание и прогнозы',
  description: 'Турнирные таблицы, расписание, результаты и прогнозы на матчи АПЛ, Ла Лиги, Серии A, Бундеслиги, РПЛ, Лиги чемпионов и других турниров.',
  alternates: { canonical: '/leagues' },
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

        {/* заголовки блоков — на фоне страницы над карточкой, как на главной и странице матча (владелец: «заголовок топ турниры
            и страны вынеси за блок что единый стиль был»); между блоками — 32px, как там; текст от lg крупнее (`match-body`), как
            на главной — фильтр в заголовке без увеличения (`keep-size`) */}
        <div className="match-body space-y-8 pt-4 xl:pt-6">
          {top.length ? (
            <section>
              <BlockTitle rows title="Топ-турниры" />
              <ul className="card @container overflow-hidden [&>li:first-child]:border-t-0">
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
            <section id="league-index">
              {/* одной колонкой, как «Букмекеры» (владелец: «лиги и страны в 1 строку… изза того что 2 на строке то логотипы еще меньше»);
                  фильтр — в строке заголовка, рядом с тем, что он сужает */}
              <BlockTitle
                rows
                title={
                  <>
                    Страны и турниры <span className="text-[13px] font-normal text-mute">{pluralN(countries, ['страна', 'страны', 'стран'])}</span>
                  </>
                }
                aside={<div className="keep-size"><LeagueFilter target="league-index" /></div>}
              />
              <div className="card @container overflow-hidden">
              <ul className="[&>li:first-child]:border-t-0">
                {shown.map((g) => (
                  <Group key={g.key} g={g} />
                ))}
              </ul>
              {/* остальные страны — не в первой отдаче (владелец: «чтоб на странице лиги не все сразу грузилось а например при
                  скроллинге остальное подгружалось»): это ~85% страницы (3,6 из 4,2 МБ), догружаются на подходе к блоку,
                  при раскрытии или вводе в фильтр; их турниры — вне индекса (`indexLeague`), ссылки в первой отдаче не нужны */}
              {more.length ? <MoreCountries count={more.length} load={moreCountries} /> : null}
              {/* текст ставит фильтр: найденное среди топ-турниров (их фильтр не прячет — они в отдельном блоке выше) */}
              <p data-empty hidden className="border-t border-edge px-4 py-4 text-[14px] text-dim sm:px-5" />
              </div>
            </section>
          ) : null}

        </div>
      </div>
    </>
  )
}
