import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { dayHeading } from '@/components/DayView'
import { Coverage, Filters, MatchWhen, PickHead, STAGES, STAGE_LABEL, pickParam, stageOf, withParam, type StageKey } from '@/components/picks/Shared'
import { featuredInfo, isFeatured } from '@/config/leagues'
import { daySnaps, getMatchesByDate, tagsFor, type FeedItem } from '@/lib/data'
import { goalsPicks } from '@/lib/day-summary'
import { diffDays, formatDayMonth, formatTime, isYmd, pct, pluralN, todayYmd, ymdInTz, ymdToNoonTs } from '@/lib/format'
import { dayHref, matchHref } from '@/lib/links'

export const dynamic = 'force-dynamic'

type Search = { min?: string; st?: string; top?: string; sort?: string }
type Props = { params: Promise<{ date: string }>; searchParams: Promise<Search> }

const MINS = ['50', '55', '60', '65'] as const
const SORTS = ['chance', 'time'] as const
const TOPS = ['all', 'top'] as const

const valid = (date: string) => isYmd(date) && Math.abs(diffDays(date, todayYmd())) <= 365

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params
  if (!valid(date)) return {}
  const d = formatDayMonth(ymdToNoonTs(date))
  return {
    title: `Голевые матчи ${d}: шанс 3+ голов по линии букмекера`,
    description: `Матчи ${date.split('-').reverse().join('.')}, где по линии букмекера вероятнее 3 гола и больше: шанс из пары коэффициентов «больше 2,5 / меньше 2,5» одного букмекера без маржи.`,
    alternates: { canonical: `/matches/${date}/goals` },
  }
}

/** Время снимка линии: в день матча — «19:25», иначе с датой. */
const snapAt = (at: number, kickoff: number) => (ymdInTz(at) === ymdInTz(kickoff) ? formatTime(at) : `${formatDayMonth(at)}, ${formatTime(at)}`)

/** Итог по голам у сыгранного матча — факт, без «угадали»: «4 гола — 3+», «1 гол — меньше 3». */
function goalsResult(it: FeedItem): string | null {
  const m = it.match
  if (m.status !== 'finished') return null
  const s = m.scoreFT ?? m.score
  if (!s) return null
  const n = s.home + s.away
  return `${pluralN(n, ['гол', 'гола', 'голов'])} — ${n >= 3 ? '3+' : 'меньше 3'}`
}

export default async function GoalsPage({ params, searchParams }: Props) {
  const { date } = await params
  if (!valid(date)) notFound()
  const sp = await searchParams
  const today = todayYmd()
  const min = pickParam(sp.min, MINS, '55')
  const st = pickParam<StageKey>(sp.st, STAGES, 'all')
  const top = pickParam(sp.top, TOPS, 'all')
  const sort = pickParam(sp.sort, SORTS, 'chance')

  let failed = false
  const matches = await getMatchesByDate(date).catch(() => {
    failed = true
    return []
  })
  const items: FeedItem[] = matches.map((m) => ({ match: m, ...tagsFor(m) }))
  const { snaps, pending } = await daySnaps(matches)
  const { picks, covered } = goalsPicks(items, (id) => snaps.get(id) ?? null, Number(min) / 100)
  const rows = picks
    .filter((p) => st === 'all' || stageOf(p.it.match) === st)
    .filter((p) => top === 'all' || isFeatured(p.it.match.league))
    .sort((a, b) => (sort === 'time' ? a.it.match.ts - b.it.match.ts : 0))

  const base = `/matches/${date}/goals`
  const q = { min: sp.min, st: sp.st, top: sp.top, sort: sp.sort }
  const heading = dayHeading(date, today)

  return (
    <>
      <Breadcrumbs
        items={[
          { href: dayHref(date, today), label: heading.title },
          { href: base, label: 'Голевые матчи' },
        ]}
      />
      <PickHead ymd={date} today={today} date={heading.date} title="Голевые матчи" section="goals">
        <p>Матчи дня, где по линии букмекера вероятнее 3 гола и больше. Сравнивайте шанс, коэффициенты и время матчей в одной таблице.</p>
        <p className="text-[14px] text-mute">
          Шанс — из пары коэффициентов «больше 2,5 / меньше 2,5» одного букмекера в одном снимке линии, без маржи: (1/ТБ) ÷ (1/ТБ + 1/ТМ). Средние голы команд
          вероятность не подменяют. У начавшихся матчей — линия перед началом.
        </p>
      </PickHead>

      <div className="mt-8 space-y-4">
        <Filters
          groups={[
            { label: 'Шанс от', options: MINS.map((v) => ({ label: `${v}%`, href: withParam(base, q, 'min', v, '55'), on: v === min })) },
            { label: 'Матчи', options: STAGES.map((v) => ({ label: STAGE_LABEL[v], href: withParam(base, q, 'st', v, 'all'), on: v === st })) },
            {
              label: 'Турниры',
              options: [
                { label: 'Все', href: withParam(base, q, 'top', 'all', 'all'), on: top === 'all' },
                { label: 'Топ-турниры', href: withParam(base, q, 'top', 'top', 'all'), on: top === 'top' },
              ],
            },
            {
              label: 'Порядок',
              options: [
                { label: 'По шансу', href: withParam(base, q, 'sort', 'chance', 'chance'), on: sort === 'chance' },
                { label: 'По времени', href: withParam(base, q, 'sort', 'time', 'chance'), on: sort === 'time' },
              ],
            },
          ]}
        />
        <Coverage covered={covered} total={matches.length} pending={pending} what="Линия на тотал 2,5" />
      </div>

      {failed ? <div className="card mt-6 p-5 text-[15px] text-dim">Не удалось загрузить матчи: источник данных временно недоступен. Обновите страницу через минуту.</div> : null}

      {rows.length ? (
        <div className="card mt-6 overflow-hidden">
          {/* шапка таблицы — только на широком экране; на телефоне каждая строка — карточка с подписями */}
          <div className="hidden grid-cols-[72px_minmax(0,1fr)_120px_96px_96px_150px] gap-4 border-b border-edge px-5 py-3 text-[12px] font-medium uppercase tracking-[0.06em] text-mute md:grid">
            <span>Время</span>
            <span>Матч</span>
            <span>Шанс 3+</span>
            <span className="text-right">Больше 2,5</span>
            <span className="text-right">Меньше 2,5</span>
            <span>Линия</span>
          </div>
          <ul>
            {rows.map(({ it, g }) => {
              const m = it.match
              const result = goalsResult(it)
              return (
                <li key={m.id} className="relative border-b border-edge last:border-b-0 transition-colors hover:bg-white/[0.02]">
                  <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-x-4 gap-y-2 px-4 py-3.5 md:grid-cols-[72px_minmax(0,1fr)_120px_96px_96px_150px] md:items-center md:px-5">
                    <MatchWhen m={m} />
                    <span className="min-w-0">
                      <Link href={matchHref(m)} prefetch={false} className="block truncate text-[15px] font-semibold text-fg after:absolute after:inset-0 after:content-['']">
                        {m.home.name} — {m.away.name}
                      </Link>
                      <span className="block truncate text-[13px] text-mute">
                        {featuredInfo(m.league)?.short || m.league.name}
                        {result ? ` · ${result}` : ''}
                      </span>
                    </span>
                    <span className="col-start-2 flex items-center gap-3 md:col-start-auto">
                      <span className="num w-10 text-[16px] font-semibold text-fg">{pct(g.p)}</span>
                      <span className="h-1.5 w-full max-w-[64px] overflow-hidden rounded-full bg-white/[0.08]" aria-hidden>
                        <span className="block h-full rounded-full bg-chalk" style={{ width: `${Math.round(g.p * 100)}%` }} />
                      </span>
                    </span>
                    <span className="col-start-2 flex gap-4 text-[13px] text-dim md:contents">
                      <span className="md:text-right">
                        <span className="md:hidden">больше 2,5 </span>
                        <span className="num text-[15px] text-fg">{g.over.toFixed(2)}</span>
                      </span>
                      <span className="md:text-right">
                        <span className="md:hidden">меньше 2,5 </span>
                        <span className="num text-[15px] text-fg">{g.under.toFixed(2)}</span>
                      </span>
                    </span>
                    <span className="col-start-2 text-[13px] leading-snug text-dim md:col-start-auto">
                      {g.bookmaker}
                      <span className="block text-mute">{g.at >= m.ts ? 'линия перед началом' : `линия на ${snapAt(g.at, m.ts)}`}</span>
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <div className="card mt-6 p-8 text-center">
          <p className="text-[16px] font-semibold">{covered ? `Матчей с шансом 3+ голов от ${min}% нет` : 'Линии букмекеров на тотал пока нет'}</p>
          {covered && min !== '50' ? (
            <Link href={withParam(base, q, 'min', '50', '55')} className="mt-3 inline-block border-b-2 border-acid pb-0.5 text-[15px] font-semibold">
              Показать от 50% →
            </Link>
          ) : null}
        </div>
      )}

      <p className="mt-6 text-[13px] leading-relaxed text-mute">
        Шанс — оценка по коэффициентам, а не обещание: и при 65% матч может закончиться с 1–2 голами. Коэффициенты меняются — проверяйте актуальную линию у
        букмекера. 18+
      </p>
      <p className="mt-4">
        <Link href={`${dayHref(date, today)}#matches`} className="text-[14px] font-medium text-fg transition-colors hover:text-good">
          ← Все матчи дня
        </Link>
      </p>
    </>
  )
}
