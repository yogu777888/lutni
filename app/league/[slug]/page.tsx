import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { cache } from 'react'
import { BlockHead } from '@/components/BlockHead'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Flag } from '@/components/Flag'
import { MatchRow } from '@/components/MatchRow'
import { Sidebar } from '@/components/Sidebar'
import { StandingsTable } from '@/components/StandingsTable'
import { currentSeason, daySnaps, getLeague, getSeasonGames, getStandings, peekOddsSnap, settle, tagsFor } from '@/lib/data'
import { flagCode, leagueTitle } from '@/lib/flags'
import { appNow, dayLabel, formatDayMonth, idFromSlug, pluralN, todayYmd, ymdInTz } from '@/lib/format'
import { x12For, type X12Line } from '@/lib/lines'
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

/** Сколько ближайших матчей видно сразу; остальные — под раскрывашкой, чтобы таблица была ближе к первому экрану. */
const SHOWN = 8

/**
 * Подпись дня над строками: «Сегодня», «Завтра · 18 октября», «пн, 19 октября» — у будних дней число уже в подписи
 * (было «пн, 19 октября · 19.10.2026»).
 */
function dayHead(ymd: string, ts: number, today: string) {
  const l = dayLabel(ymd, today)
  return l === 'Завтра' || l === 'Вчера' ? `${l} · ${formatDayMonth(ts)}` : l
}

/** Строки матчей с подписью дня, когда день сменился (`prev` — матч перед первым: у раскрывашки день мог не смениться). */
function Rows({ list, prev, lines, today }: { list: Match[]; prev?: Match; lines: Record<number, X12Line>; today: string }) {
  return list.map((m, i) => {
    const day = ymdInTz(m.ts)
    const before = i ? list[i - 1] : prev
    return (
      <div key={m.id}>
        {!before || ymdInTz(before.ts) !== day ? (
          <div className="bg-white/[0.02] px-4 py-2 text-[12px] font-medium text-mute sm:px-5">{dayHead(day, m.ts, today)}</div>
        ) : null}
        {/* кэфы — линия партнёра, как на главной; линии нет — без кэфов (не прочерками «– – –», как было на всех матчах) */}
        <MatchRow m={m} {...tagsFor(m)} line={lines[m.id] ?? null} noOdds={m.status === 'scheduled' && !lines[m.id]} />
      </div>
    )
  })
}

/**
 * Страница турнира — в виде главной (владелец: «страница лиги как?», согласился на пять правок): от xl без подложки
 * центра (`.bare-sub`), разделы — панелями; шапка — флаг, название и «Англия · сезон 2026/27» вместо плаката Oswald 56px;
 * заголовки блоков — как у блоков на главной (`BlockHead`); кэфы — линия партнёра (`x12For`, как `DayView`): раньше
 * строки брали кэфы из списка сезона — на настоящем API их там нет, и у всех матчей стояли прочерки, а в демо горел
 * лаймом кэф, которого нет ни у одного легального букмекера.
 */
export default async function LeaguePage({ params }: Props) {
  const { slug } = await params
  const id = idFromSlug(slug)
  if (!id) notFound()
  const data = await load(id)
  if (!data) notFound()
  const { league, year, games, standings } = data
  const canonical = leagueHref(league)
  if (`/league/${slug}` !== canonical) permanentRedirect(canonical)

  const now = appNow()
  const upcoming = games.filter((g) => g.status === 'live' || (g.status === 'scheduled' && g.ts > now - 3 * 3600_000)).slice(0, 12)
  const results = games
    .filter((g) => g.status === 'finished')
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 10)
  const today = todayYmd()

  // линия партнёра — как в строках главной: матчам ближайших двух суток догружаем снимки (ждём ≤1,2 с; `daySnaps` грузит
  // только топ-турниры), дальше — только то, что уже в кэше: ради неразыгранного через неделю тура в API не ходим
  const scheduled = upcoming.filter((m) => m.status === 'scheduled')
  const { snaps } = await daySnaps(
    scheduled.filter((m) => m.ts < now + 48 * 3600_000),
    1200,
  )
  const lines: Record<number, X12Line> = {}
  for (const m of scheduled) {
    const line = x12For(snaps.get(m.id) ?? peekOddsSnap(m.id), null)
    if (line) lines[m.id] = line
  }
  const books = [...new Set(Object.values(lines).map((l) => l.bookmaker))]
  const shown = upcoming.slice(0, SHOWN)
  const more = upcoming.slice(SHOWN)

  // «Англия. Премьер-лига» → флаг, «Премьер-лига» и «Англия» в подписи; без флага (еврокубки) — название целиком
  const flag = flagCode(league)
  const title = flag ? leagueTitle(league.name) : league.name
  const country = flag ? (league.name.match(/^([^.]+)\.\s+/)?.[1] ?? null) : null
  const season = year ? `сезон ${year}/${String(year + 1).slice(2)}` : null

  return (
    <>
      <span hidden className="bare-sub" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-1 xl:gap-2">
        <div className="min-w-0 space-y-4 xl:space-y-2">
          <section className="card px-4 py-4 sm:px-5">
            <Breadcrumbs items={[{ href: '/leagues', label: 'Лиги' }, { href: canonical, label: league.name }]} className="mb-3" />
            <div className="flex items-center gap-3">
              <Flag league={league} className="!h-9 !w-9" />
              <div className="min-w-0">
                <h1 className="h1-block text-[24px] leading-tight sm:text-[28px]">{title}</h1>
                {country || season ? (
                  <p className="mt-0.5 text-[13px] text-dim first-letter:uppercase">{[country, season].filter(Boolean).join(' · ')}</p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="card overflow-hidden">
            <BlockHead title="Ближайшие матчи" aside={books.length ? `Кэфы ${books.join(', ')} · Реклама` : null} line />
            {upcoming.length ? (
              <>
                <div className="divide-y divide-edge">
                  <Rows list={shown} lines={lines} today={today} />
                </div>
                {/* остальные — под раскрывашкой, как «Ещё N матчей в других турнирах» на главной: 12 строк на неделю вперёд
                    (~900px) отодвигали таблицу на второй экран */}
                {more.length ? (
                  <details className="group/more border-t border-edge">
                    <summary className="flex items-center justify-between gap-3 px-4 py-3.5 text-[14px] text-dim transition-colors hover:text-fg sm:px-5">
                      <span>Ещё {pluralN(more.length, ['матч', 'матча', 'матчей'])}</span>
                      <span aria-hidden className="text-mute transition-transform group-open/more:rotate-180">
                        ▾
                      </span>
                    </summary>
                    <div className="divide-y divide-edge border-t border-edge">
                      <Rows list={more} prev={shown[shown.length - 1]} lines={lines} today={today} />
                    </div>
                  </details>
                ) : null}
              </>
            ) : (
              <p className="px-4 py-4 text-[14px] text-dim sm:px-5">Ближайших матчей нет.</p>
            )}
          </section>

          {standings ? (
            <section className="card overflow-hidden">
              <BlockHead title="Турнирная таблица" />
              <div className="px-4 pb-5 sm:px-5">
                <StandingsTable standings={standings} />
              </div>
            </section>
          ) : null}

          {results.length ? (
            <section className="card overflow-hidden">
              {/* по дням, как ближайшие: без дат время скакало 22:00, 18:30, 16:00, 19:30… и было непонятно, когда игрались */}
              <BlockHead title="Последние результаты" line />
              <div className="divide-y divide-edge">
                <Rows list={results} lines={{}} today={today} />
              </div>
            </section>
          ) : null}
        </div>
        {/* «Где ставить» — ниже xl (от xl справа панель с «Выгодно сегодня», как на главной); «Как читать теги» не нужен —
            тегов в строках нет */}
        <div className="xl:hidden">
          <Sidebar tags={false} />
        </div>
      </div>
    </>
  )
}
