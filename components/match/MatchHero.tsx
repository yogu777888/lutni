import Link from 'next/link'
import { SITE } from '@/config/site'
import { formatDateLong, formatTime, formatWeekdayLong } from '@/lib/format'
import { leagueHref } from '@/lib/links'
import type { MatchFull } from '@/lib/types'
import { TeamLogo } from '../TeamLogo'

/** Ячейка табло: шанс исхода, лучший коэффициент и честная цена; hot — платят больше честного. */
export type BoardCell = {
  key: 'home' | 'draw' | 'away'
  label: string
  p: number
  odd: number | null
  fair: number
  hot: boolean
}

const signed = (ev: number) => `${ev >= 0 ? '+' : '−'}${Math.abs(ev * 100).toFixed(1).replace('.', ',')}%`

/**
 * Табло матча (как на стадионе): команды, шансы на исход крупно, полоса
 * и коэффициенты с честной ценой — тот, что выше честного, горит лаймом.
 */
export function MatchHero({
  full,
  cells,
  books,
  children,
}: {
  full: MatchFull
  cells: BoardCell[] | null
  books: number
  children?: React.ReactNode
}) {
  const m = full.match
  const live = m.status === 'live' || m.status === 'suspended'
  const played = Boolean(m.score) && (live || m.status === 'finished')
  const team = (t: typeof m.home, right = false) => (
    <div className={`flex min-w-0 items-center gap-3 ${right ? 'flex-row-reverse text-right' : ''}`}>
      {t.logo ? <TeamLogo name={t.name} src={t.logo} size={44} /> : null}
      <span className="min-w-0 hyphens-auto break-words text-[18px] font-extrabold uppercase leading-[1.05] tracking-[-0.02em] sm:text-[32px]">
        {t.name}
      </span>
    </div>
  )
  return (
    <section className="card overflow-hidden p-5 shadow-[0_40px_80px_-40px_#000] sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[13px] text-dim">
        <Link
          href={leagueHref(m.league)}
          className="inline-flex items-center gap-2 rounded-md border border-edge bg-panel-2 px-2.5 py-1 font-semibold text-fg transition-colors hover:border-edge-2"
        >
          <span className={`h-1.5 w-1.5 rounded-full ${live ? 'animate-pulse-live bg-live' : 'bg-acid'}`} />
          {m.league.name}
        </Link>
        <span>
          {m.round ? `${m.round} · ` : ''}
          <span className="capitalize">{formatWeekdayLong(m.ts)}</span>, {formatDateLong(m.ts)} · {formatTime(m.ts)} {SITE.tzLabel}
        </span>
      </div>

      <div className="mt-7 grid grid-cols-2 items-center gap-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-6">
        {team(m.home)}
        <span className="hidden text-center text-[13px] text-mute sm:block">{played ? (live ? 'идёт матч' : 'итог') : 'шансы из 10'}</span>
        {team(m.away, true)}
      </div>

      {played ? (
        <div className="mt-4 text-center">
          <span className={`display num text-[76px] sm:text-[124px] ${live ? 'text-live' : ''}`}>
            {m.score!.home}
            <span className="mx-2 text-mute">:</span>
            {m.score!.away}
          </span>
          <div className={`mt-1 text-[13px] font-semibold ${live ? 'text-live' : 'text-dim'}`}>
            {live && m.elapsed && m.statusCode !== 4 ? `${m.elapsed}′ · ` : ''}
            {m.statusLabel}
            {m.scoreHT ? <span className="font-normal text-mute"> · 1-й тайм {m.scoreHT.home}:{m.scoreHT.away}</span> : null}
          </div>
        </div>
      ) : m.status !== 'scheduled' ? (
        <p className="mt-4 text-center text-[15px] font-semibold text-loss">{m.statusLabel}</p>
      ) : null}

      {cells ? (
        <>
          {played ? <p className="eyebrow mt-6">Шансы до матча</p> : null}
          <div className={`grid grid-cols-3 gap-2 sm:gap-3 ${played ? 'mt-3' : 'mt-5'}`}>
            {cells.map((c) => (
              <div key={c.key} className="min-w-0 rounded-xl border border-edge bg-panel-2 px-2 pb-3 pt-3 text-center">
                <div
                  className={`num font-extrabold leading-[0.95] tracking-[-0.045em] ${played ? 'text-[34px] sm:text-[48px]' : 'text-[46px] sm:text-[88px]'} ${
                    c.key === 'draw' ? 'text-chalk' : 'text-fg'
                  }`}
                >
                  {/* шанс «из 10»: так понятнее, чем проценты; точная цифра — в подсказке */}
                  <span title={`${Math.round(c.p * 100)}%`}>{Math.min(9, Math.max(1, Math.round(c.p * 10)))}</span>
                  <span className="ml-1 text-[0.32em] font-bold tracking-normal text-dim">из 10</span>
                </div>
                <div className="mt-1.5 truncate text-[12px] text-dim">
                  <span className="sm:hidden">{c.key === 'home' ? 'хозяева' : c.key === 'away' ? 'гости' : 'ничья'}</span>
                  <span className="hidden sm:inline">{c.label}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex h-1.5 gap-0.5 overflow-hidden rounded-full" aria-hidden>
            {cells.map((c) => (
              <span key={c.key} className={c.key === 'home' ? 'bg-home' : c.key === 'away' ? 'bg-away' : 'bg-tie'} style={{ width: `${c.p * 100}%` }} />
            ))}
          </div>
          {cells.some((c) => c.odd) ? (
            <div className="mt-5 grid grid-cols-[auto_repeat(3,minmax(0,1fr))] items-center gap-2 sm:gap-3">
              <span className="pr-1 text-[12px] leading-tight text-dim sm:pr-3 sm:text-[13px]">
                Кэф
                <br className="sm:hidden" />
                <span className="hidden sm:inline"> букмекера</span>
              </span>
              {cells.map((c) => (
                <div
                  key={c.key}
                  className={`rounded-xl border px-1 py-2.5 text-center ${c.hot ? 'border-acid bg-acid text-acid-ink' : 'border-edge bg-panel-2'}`}
                  title={c.hot ? 'Коэффициент выше честного' : undefined}
                >
                  <div className="num text-[22px] font-bold leading-none tracking-[-0.02em] sm:text-[30px]">{c.odd ? c.odd.toFixed(2) : '—'}</div>
                  <div className={`mt-1.5 text-[11px] ${c.hot ? 'font-semibold text-acid-ink/70' : 'text-mute'}`}>
                    стоит {c.fair.toFixed(2)}
                    {c.hot && c.odd ? <span className="hidden sm:inline"> · {signed(c.odd / c.fair - 1)}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <p className="mt-4 text-[12px] text-mute">
            Шансы — из коэффициентов{books > 1 ? ` ${books} букмекеров` : ''} без их наценки. Лаймом горит кэф, который выше, чем стоит исход.
          </p>
        </>
      ) : null}

      {full.venue || full.referee ? (
        <p className="mt-2 text-[12px] text-mute">
          {full.venue ? `${full.venue.name}${full.venue.city ? `, ${full.venue.city}` : ''}` : ''}
          {full.venue && full.referee ? ' · ' : ''}
          {full.referee ? `судья ${full.referee}` : ''}
        </p>
      ) : null}
      {children}
    </section>
  )
}
