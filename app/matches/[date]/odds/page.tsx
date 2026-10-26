import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { dayHeading } from '@/components/DayView'
import { Coverage, Crests, Filters, MatchWhen, PickHead, STAGES, STAGE_LABEL, pickParam, stageOf, withParam, type StageKey } from '@/components/picks/Shared'
import { featuredInfo, isFeatured } from '@/config/leagues'
import { daySnaps, getMatchesByDate, tagsFor, type FeedItem } from '@/lib/data'
import { linePicks } from '@/lib/day-summary'
import { diffDays, formatDayMonth, isYmd, todayYmd, ymdToNoonTs } from '@/lib/format'
import { moveOutcome, periodEndLabel, type LineMove, type MoveKey } from '@/lib/lines'
import { dayHref, listHref, matchHref } from '@/lib/links'
import { NOINDEX } from '@/lib/seo'
import type { Match } from '@/lib/types'

export const dynamic = 'force-dynamic'

type Search = { dir?: string; min?: string; mk?: string; st?: string; top?: string }
type Props = { params: Promise<{ date: string }>; searchParams: Promise<Search> }

const DIRS = ['all', 'down', 'up'] as const
const MINS = ['5', '10', '20'] as const
const MARKETS = ['all', 'x12', 'total'] as const
const TOPS = ['all', 'top'] as const
const KEYS: Record<(typeof MARKETS)[number], MoveKey[] | undefined> = { all: undefined, x12: ['home', 'draw', 'away'], total: ['over25', 'under25'] }

const valid = (date: string) => isYmd(date) && Math.abs(diffDays(date, todayYmd())) <= 365

/** Матчи дня и снимки линии — одни на страницу и её `generateMetadata` (`cache` — один раз за запрос). */
const loadDay = cache(async (date: string) => {
  let failed = false
  const matches = await getMatchesByDate(date).catch(() => {
    failed = true
    return [] as Match[]
  })
  const items: FeedItem[] = matches.map((m) => ({ match: m, ...tagsFor(m) }))
  const { snaps, pending } = await daySnaps(matches)
  return { failed, items, snaps, pending }
})

/** Пустая подборка дня (при фильтрах по умолчанию) — не в индекс: страница «матчей нет» — малополезная (`lib/seo.ts`). */
async function empty(date: string) {
  const d = await loadDay(date)
  return d.failed || !linePicks(d.items, (id) => d.snaps.get(id) ?? null, { min: 0.05 }).picks.length
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params
  if (!valid(date)) return {}
  const d = formatDayMonth(ymdToNoonTs(date))
  return {
    title: `Движение коэффициентов ${d}: как менялась линия на матчи`,
    description: `Как менялись коэффициенты на матчи ${date.split('-').reverse().join('.')}: открытие линии и последнее значение у одного букмекера, по исходам и тоталу 2,5.`,
    alternates: { canonical: `/matches/${date}/odds` },
    ...((await empty(date)) ? { robots: NOINDEX } : {}),
  }
}

/** Мини-график строки: открытие → последнее значение, две точки без кривой; упал — янтарь, вырос — серый. */
function Spark({ mv }: { mv: LineMove }) {
  const k = Math.min(1, Math.max(0.2, Math.abs(mv.change) / 0.35))
  const down = mv.change < 0
  const color = down ? 'var(--color-hot)' : 'var(--color-chalk)'
  const y1 = down ? 3 : 21
  const y2 = down ? 3 + k * 18 : 21 - k * 18
  return (
    <svg viewBox="0 0 72 24" className="h-6 w-[72px] shrink-0 overflow-visible" aria-hidden>
      <line x1="4" y1={y1} x2="68" y2={y1} stroke="rgb(255 255 255 / 0.16)" strokeWidth="1" strokeDasharray="2 3" />
      <line x1="4" y1={y1} x2="68" y2={y2} stroke={color} strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="4" cy={y1} r="2.75" fill="var(--color-panel)" stroke={color} strokeWidth="1.5" />
      <circle cx="68" cy={y2} r="3" fill={color} />
    </svg>
  )
}

const signed = (c: number) => `${c > 0 ? '+' : '−'}${Math.abs(Math.round(c * 100))}%`

export default async function OddsMovesPage({ params, searchParams }: Props) {
  const { date } = await params
  if (!valid(date)) notFound()
  const sp = await searchParams
  const today = todayYmd()
  const dir = pickParam(sp.dir, DIRS, 'all')
  const min = pickParam(sp.min, MINS, '5')
  const mk = pickParam(sp.mk, MARKETS, 'all')
  const st = pickParam<StageKey>(sp.st, STAGES, 'all')
  const top = pickParam(sp.top, TOPS, 'all')

  const { failed, items, snaps, pending } = await loadDay(date)
  const { picks, covered } = linePicks(items, (id) => snaps.get(id) ?? null, { min: Number(min) / 100, keys: KEYS[mk] })
  const rows = picks
    .filter((p) => dir === 'all' || (dir === 'down' ? p.mv.change < 0 : p.mv.change > 0))
    .filter((p) => st === 'all' || stageOf(p.it.match) === st)
    .filter((p) => top === 'all' || isFeatured(p.it.match.league))

  const base = `/matches/${date}/odds`
  const q = { dir: sp.dir, min: sp.min, mk: sp.mk, st: sp.st, top: sp.top }
  const heading = dayHeading(date, today)

  return (
    <>
      <span hidden className="bare-sub" />
      <PickHead ymd={date} today={today} date={heading.date} title="Движение коэффициентов" icon="pick-moves" section="odds"
        crumbs={[{ href: '/matches', label: 'Матчи' }, ...(dayHref(date, today) === '/' ? [] : [{ href: dayHref(date, today), label: heading.title }]), { href: base, label: 'Движение коэффициентов' }]}
        how={
          <>
            Это доматчевая линия: у ещё не начавшихся матчей — до момента, когда мы её взяли, у начавшихся — до начала матча. LIVE-коэффициенты здесь не
          сравниваем. На мини-графике — две точки (открытие и последнее значение); подробная история линии по времени — на странице матча, где
          матч есть в линии PARI.
          </>
        }
      >
        Как менялась линия на матчи дня: коэффициент открытия и последнее значение у одного букмекера — по исходам и тоталу 2,5.
      </PickHead>

      <div className="card mt-4 xl:mt-2 space-y-4 p-4 sm:p-5">
        <Filters
          groups={[
            {
              label: 'Изменение',
              options: [
                { label: 'Все', href: withParam(base, q, 'dir', 'all', 'all'), on: dir === 'all' },
                { label: 'Упали', href: withParam(base, q, 'dir', 'down', 'all'), on: dir === 'down' },
                { label: 'Выросли', href: withParam(base, q, 'dir', 'up', 'all'), on: dir === 'up' },
              ],
            },
            { label: 'От', options: MINS.map((v) => ({ label: `${v}%`, href: withParam(base, q, 'min', v, '5'), on: v === min })) },
            {
              label: 'Исходы',
              options: [
                { label: 'Все', href: withParam(base, q, 'mk', 'all', 'all'), on: mk === 'all' },
                { label: 'Победа и ничья', href: withParam(base, q, 'mk', 'x12', 'all'), on: mk === 'x12' },
                { label: 'Тотал 2,5', href: withParam(base, q, 'mk', 'total', 'all'), on: mk === 'total' },
              ],
            },
            { label: 'Матчи', options: STAGES.map((v) => ({ label: STAGE_LABEL[v], href: withParam(base, q, 'st', v, 'all'), on: v === st })) },
            {
              label: 'Турниры',
              options: [
                { label: 'Все', href: withParam(base, q, 'top', 'all', 'all'), on: top === 'all' },
                { label: 'Топ-турниры', href: withParam(base, q, 'top', 'top', 'all'), on: top === 'top' },
              ],
            },
          ]}
        />
        <Coverage covered={covered} total={items.length} pending={pending} what="Кэфы открытия" />
      </div>

      {failed ? <div className="card mt-6 xl:mt-2 p-5 text-[15px] text-dim">Не удалось загрузить матчи: источник данных временно недоступен. Обновите страницу через минуту.</div> : null}

      {rows.length ? (
        <div className="card mt-6 xl:mt-2 overflow-hidden">
          <div className="hidden grid-cols-[72px_minmax(0,1fr)_minmax(0,0.8fr)_150px_88px_minmax(0,0.9fr)] gap-4 gap-x-6 border-b border-edge px-5 py-3 text-[12px] font-medium uppercase tracking-[0.06em] text-mute lg:grid">
            <span>Время</span>
            <span>Матч</span>
            <span>Исход</span>
            <span>Было → стало</span>
            <span className="text-right">Изменение</span>
            <span>Доматчевая линия</span>
          </div>
          <ul>
            {rows.map(({ it, mv }) => {
              const m = it.match
              const down = mv.change < 0
              return (
                <li key={`${m.id}:${mv.key}`} className="relative border-b border-edge last:border-b-0 transition-colors hover:bg-white/[0.02]">
                  <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-x-4 gap-y-2 px-4 py-3.5 lg:grid-cols-[72px_minmax(0,1fr)_minmax(0,0.8fr)_150px_88px_minmax(0,0.9fr)] lg:gap-x-6 lg:items-center lg:px-5">
                    <MatchWhen m={m} />
                    <span className="flex min-w-0 items-center gap-3">
                      <Crests m={m} />
                      <span className="min-w-0">
                      <Link href={matchHref(m)} prefetch={false} className="block truncate text-[15px] font-semibold text-fg after:absolute after:inset-0 after:content-['']">
                        {m.home.name} — {m.away.name}
                      </Link>
                      <span className="block truncate text-[13px] text-mute">{featuredInfo(m.league)?.short || m.league.name}</span>
                      </span>
                    </span>
                    <span className="col-start-2 truncate text-[14px] text-chalk lg:col-start-auto">{moveOutcome(mv.key, { home: m.home.name, away: m.away.name })}</span>
                    <span className="col-start-2 flex items-center gap-3 lg:col-start-auto">
                      <span className="num whitespace-nowrap text-[15px] text-dim">
                        {mv.from.toFixed(2)} → <span className={`font-semibold ${down ? 'text-hot' : 'text-fg'}`}>{mv.to.toFixed(2)}</span>
                      </span>
                      <Spark mv={mv} />
                    </span>
                    <span className={`num col-start-2 text-[15px] font-semibold lg:col-start-auto lg:text-right ${down ? 'text-hot' : 'text-fg'}`}>{signed(mv.change)}</span>
                    <span className="col-start-2 text-[13px] leading-snug text-dim lg:col-start-auto">
                      {mv.bookmaker}
                      <span className="block text-mute">открытие → {periodEndLabel(mv.at, m.ts)}</span>
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <div className="card mt-6 xl:mt-2 p-8 text-center">
          <p className="text-[16px] font-semibold">{covered ? 'Таких изменений линии нет' : 'Линии с кэфами открытия пока нет'}</p>
          {covered && (min !== '5' || dir !== 'all' || mk !== 'all' || st !== 'all' || top !== 'all') ? (
            <Link href={base} className="mt-3 inline-block border-b-2 border-acid pb-0.5 text-[15px] font-semibold">
              Сбросить фильтры →
            </Link>
          ) : null}
        </div>
      )}

      <p className="mt-6 text-[13px] leading-relaxed text-mute">
        Падение кэфа — факт из линии, а не сигнал «ставить»: букмекер меняет линию по многим причинам. Коэффициенты меняются — проверяйте актуальные у
        букмекера. 18+
      </p>
      <p className="mt-4">
        <Link href={listHref(date, today)} className="text-[14px] font-medium text-fg transition-colors hover:text-good">
          ← Все матчи дня
        </Link>
      </p>
    </>
  )
}
