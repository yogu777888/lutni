import Link from 'next/link'
import { SITE } from '@/config/site'
import { formatDateLong, formatTime, formatWeekdayLong } from '@/lib/format'
import { leagueHref } from '@/lib/links'
import { split100 } from '@/lib/verdict'
import type { MatchFull } from '@/lib/types'
import { TeamLogo } from '../TeamLogo'
import { HandNote } from '../FactChip'
import type { HandNotes } from '@/lib/hand-notes'
import { Tick } from '../Live'
import { FavStar } from '../FavStar'

/** Ячейка табло: шанс исхода, лучший коэффициент и честная цена; hot — платят больше честного. */
export type BoardCell = {
  key: 'home' | 'draw' | 'away'
  label: string
  p: number
  odd: number | null
  fair: number
  hot: boolean
}

/** На телефоне колонка команды узкая: длинное слово («Саутгемптон») — мельче шрифт, а не перенос по букве. */
const phoneSize = (name: string) => {
  const longest = Math.max(...name.split(/[\s-]+/).map((w) => w.length))
  return longest >= 12 ? 'text-[13px]' : longest >= 10 ? 'text-[14px]' : 'text-[16px]'
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
  tint,
  notes,
  children,
}: {
  full: MatchFull
  cells: BoardCell[] | null
  books: number
  /** цвета клубов — мягкое свечение за командами, как в «Главных матчах» */
  tint?: { home: string; away: string } | null
  /** метки-факты над эмблемами (lib/hand-notes.ts) */
  notes?: HandNotes | null
  children?: React.ReactNode
}) {
  const m = full.match
  // проценты трёх исходов — целые и в сумме ровно 100
  const n = cells ? split100({ home: cells[0].p, draw: cells[1].p, away: cells[2].p }) : null
  const live = m.status === 'live' || m.status === 'suspended'
  const played = Boolean(m.score) && (live || m.status === 'finished')
  const lead = played && m.score!.home !== m.score!.away ? (m.score!.home > m.score!.away ? 'home' : 'away') : null
  // команда, как в «Главных матчах»: эмблема на матовом круге, название под ней, над кругом — метка-факт
  const team = (t: typeof m.home, k: 'home' | 'away') => (
    <div className={`flex min-w-0 flex-col items-center gap-3 text-center ${lead && lead !== k ? 'opacity-70' : ''}`}>
      <span className="relative grid h-[var(--disc)] w-[var(--disc)] place-items-center rounded-full bg-white/[0.08] ring-1 ring-white/15 [--disc:68px] sm:[--disc:104px]">
        {notes?.[k] ? <HandNote text={notes[k]!} short={notes[k]!.length <= 12} /> : null}
        <TeamLogo name={t.name} src={t.logo} size="calc(var(--disc) * 0.6)" />
      </span>
      <span className={`line-clamp-2 max-w-full hyphens-auto break-words font-semibold leading-tight tracking-[-0.02em] sm:text-[26px] ${phoneSize(t.name)}`}>{t.name}</span>
      <FavStar id={t.id} name={t.name} logo={t.logo} className="-mt-1" />
    </div>
  )
  return (
    <section className="card relative overflow-hidden p-5 sm:p-7">
      {tint ? (
        <div
          aria-hidden
          className="hero-tint pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(60% 120% at 0% 40%, color-mix(in oklab, ${tint.home} 20%, transparent), transparent 70%), radial-gradient(60% 120% at 100% 40%, color-mix(in oklab, ${tint.away} 20%, transparent), transparent 70%)`,
          }}
        />
      ) : null}
      <div className="relative">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[13px] text-dim">
        <Link
          href={leagueHref(m.league)}
          className="inline-flex items-center gap-2 rounded-ctl border border-transparent bg-white/[0.07] px-2.5 py-1 font-semibold text-fg transition-colors hover:bg-white/[0.11]"
        >
          <span className={`h-1.5 w-1.5 rounded-full ${live ? 'animate-pulse-live bg-live' : 'bg-acid'}`} />
          {m.league.name}
        </Link>
        <span>
          {m.round ? `${m.round} · ` : ''}
          <span className="capitalize">{formatWeekdayLong(m.ts)}</span>, {formatDateLong(m.ts)}
        </span>
      </div>

      {/* табло по центру, как в «Главных матчах»: хозяева слева, гости справа, в середине время или счёт */}
      <div className="mt-12 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-3 sm:mt-14 sm:gap-x-8">
        {team(m.home, 'home')}
        <div className="text-center">
          {played ? (
            <>
              <div className="num display-num whitespace-nowrap text-[44px] font-semibold leading-none tracking-[-0.03em] sm:text-[76px]">
                <Tick v={m.score!.home} />
                <span className="mx-1.5 text-mute sm:mx-3">:</span>
                <Tick v={m.score!.away} />
              </div>
              <div className={`mt-2 flex items-center justify-center gap-1.5 text-[13px] font-medium sm:text-[14px] ${live ? 'text-fg' : 'text-dim'}`}>
                {live ? <span className="h-1.5 w-1.5 rounded-full bg-live" /> : null}
                {live && m.elapsed && m.statusCode !== 4 ? `${m.elapsed}-я минута` : m.statusLabel}
              </div>
              {m.scoreHT ? <div className="mt-1 text-[12px] text-mute">1-й тайм {m.scoreHT.home}:{m.scoreHT.away}</div> : null}
            </>
          ) : m.status !== 'scheduled' ? (
            <p className="text-[15px] font-semibold text-loss">{m.statusLabel}</p>
          ) : (
            <>
              <div className="text-[13px] text-dim">Начало</div>
              <div className="num display-num mt-1 text-[40px] font-semibold leading-none tracking-[-0.03em] sm:text-[68px]">{formatTime(m.ts)}</div>
              <div className="mt-2 text-[13px] text-dim">{SITE.tzLabel.toLowerCase()}</div>
            </>
          )}
        </div>
        {team(m.away, 'away')}
      </div>

      {cells ? (
        <>
          <p className="eyebrow mt-9">{played ? 'До матча · шансы на исход' : 'Шансы на исход'}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
            {cells.map((c) => (
              <div key={c.key} className="min-w-0 rounded-tile bg-white/[0.04] px-2 pb-3 pt-3 text-center">
                <div className={`num font-semibold leading-none tracking-[-0.03em] text-[26px] sm:text-[34px] ${c.key === 'draw' ? 'text-chalk' : 'text-fg'}`}>
                  {/* проценты трёх исходов в сумме — ровно 100 */}
                  {n?.[c.key]}
                  <span className="ml-0.5 text-[0.42em] tracking-normal">%</span>
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
                  className={`rounded-tile border px-1 py-2.5 text-center ${c.hot ? 'border-acid bg-acid text-acid-ink' : 'border-transparent bg-white/[0.05]'}`}
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
      </div>
    </section>
  )
}
