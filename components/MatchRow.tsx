import type { MatchSummary } from '@/lib/data'
import { formatOdd, formatTime } from '@/lib/format'
import { matchHref } from '@/lib/links'
import type { Quote } from '@/lib/odds'
import type { TagHit } from '@/lib/tags'
import type { Match } from '@/lib/types'
import { StoryLink } from './story/StoryLink'
import { TagPill } from './TagPill'
import { TeamLogo } from './TeamLogo'

export function StatusCell({ m }: { m: Match }) {
  if (m.status === 'live' || m.status === 'suspended') {
    return (
      <div className="flex flex-col items-center leading-tight">
        <span className="flex items-center gap-1 text-[10px] font-extrabold tracking-wide text-live">
          <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-live" />
          LIVE
        </span>
        <span className="num text-[13px] font-bold text-live">
          {m.statusCode === 4 ? 'Пер.' : m.elapsed ? `${m.elapsed}′` : ''}
        </span>
      </div>
    )
  }
  if (m.status === 'finished') {
    return (
      <div className="flex flex-col items-center leading-tight">
        <span className="num text-[12px] text-mute">{formatTime(m.ts)}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-mute">итог</span>
      </div>
    )
  }
  if (m.status === 'postponed' || m.status === 'cancelled') {
    return <span className="text-center text-[10px] font-semibold leading-tight text-loss">{m.statusLabel}</span>
  }
  return <span className="num text-[14px] font-bold">{formatTime(m.ts)}</span>
}

function OddCell({ label, q, fav }: { label: string; q?: Quote; fav: boolean }) {
  if (!q) {
    return (
      <span className="flex h-[38px] w-[42px] flex-col items-center justify-center sm:w-[48px]" aria-hidden>
        <span className="text-[9px] font-semibold text-mute/70">{label}</span>
        <span className="text-[13px] text-mute/60">—</span>
      </span>
    )
  }
  const dropped = q.opening && q.opening / q.value >= 1.07
  return (
    <span className="flex h-[38px] w-[42px] flex-col items-center justify-center rounded-lg bg-panel-2 ring-1 ring-inset ring-edge sm:w-[48px]">
      <span className="text-[9px] font-semibold text-mute">{label}</span>
      <span className={`num text-[13px] leading-tight ${fav ? 'font-bold text-fg' : 'font-semibold text-fg/80'}`}>
        {formatOdd(q.value)}
        {dropped ? (
          <span className="ml-px text-[9px] text-hot" title={`Открытие ${q.opening?.toFixed(2)}`}>
            ▼
          </span>
        ) : null}
      </span>
    </span>
  )
}

export function MatchRow({
  m,
  tags,
  summary,
  showLeague = false,
  compact = false,
  noOdds = false,
}: {
  m: Match
  tags: TagHit[]
  summary?: MatchSummary | null
  /** Подпись турнира под командами — для смешанных списков (live, «другие матчи»). */
  showLeague?: boolean
  /** Без колонки коэффициентов — для узкой боковой колонки. */
  compact?: boolean
  /** В блоке ни у кого нет линии: колонку кэфов убираем, счёт ставим рядом с командами. */
  noOdds?: boolean
}) {
  const x = m.odds?.x12
  const values = [x?.home?.value, x?.draw?.value, x?.away?.value].filter((v): v is number => Boolean(v))
  const min = values.length === 3 ? Math.min(...values) : 0
  const live = m.status === 'live' || m.status === 'suspended'
  const showScore = Boolean(m.score) && (live || m.status === 'finished')
  const homeWon = m.status === 'finished' && m.score && m.score.home > m.score.away
  const awayWon = m.status === 'finished' && m.score && m.score.away > m.score.home
  const pick = m.status === 'scheduled' ? summary?.pick : null

  const team = (t: Match['home'], won: boolean | null | undefined) => (
    <span className="flex h-[21px] items-center gap-2">
      <TeamLogo name={t.name} src={t.logo} size={18} />
      <span className={`truncate text-[14px] ${won ? 'font-bold' : 'font-medium'} ${m.status === 'finished' && !won ? 'text-fg/70' : ''}`}>
        {t.name}
      </span>
    </span>
  )

  return (
    <div
      className={`relative grid items-center gap-x-2.5 px-3 py-2.5 transition-colors hover:bg-panel-2/60 ${
        compact
          ? 'grid-cols-[44px_minmax(0,1fr)_auto]'
          : noOdds
            ? 'grid-cols-[40px_minmax(0,1fr)_auto] sm:grid-cols-[48px_minmax(0,20rem)_auto] sm:gap-x-3 sm:px-4'
            : 'grid-cols-[40px_minmax(0,1fr)_auto_auto] sm:grid-cols-[48px_minmax(0,1fr)_auto_auto] sm:gap-x-3 sm:px-4'
      }`}
    >
      <div className="flex justify-center">
        <StatusCell m={m} />
      </div>

      <StoryLink id={m.id} href={matchHref(m)} className="min-w-0 after:absolute after:inset-0 after:content-['']">
        <span className="sr-only">
          {m.home.name} — {m.away.name}
        </span>
        <span aria-hidden>
          {team(m.home, homeWon)}
          {team(m.away, awayWon)}
        </span>
      </StoryLink>

      <div className={`num flex w-5 flex-col items-end text-[14px] font-extrabold leading-[21px] ${live ? 'text-live' : ''}`}>
        {showScore ? (
          <>
            <span className={m.status === 'finished' && !homeWon ? 'text-fg/60' : ''}>{m.score!.home}</span>
            <span className={m.status === 'finished' && !awayWon ? 'text-fg/60' : ''}>{m.score!.away}</span>
          </>
        ) : null}
      </div>

      {compact || noOdds ? null : (
        <div className="flex gap-1">
          <OddCell label="П1" q={x?.home} fav={x?.home?.value === min} />
          <OddCell label="Х" q={x?.draw} fav={x?.draw?.value === min} />
          <OddCell label="П2" q={x?.away} fav={x?.away?.value === min} />
        </div>
      )}

      {tags.length || pick || showLeague ? (
        <div className="relative z-10 mt-1.5 flex flex-wrap items-center gap-1 [grid-column:2/-1]">
          {showLeague ? <span className="mr-1 truncate text-[11px] text-mute">{m.league.name}</span> : null}
          {pick ? (
            <span className="inline-flex h-6 items-center rounded-full bg-acid/10 px-2 text-[12px] font-semibold text-acid ring-1 ring-inset ring-acid/35">
              Прогноз {pick.label}
              {pick.odd ? <span className="num ml-1 font-bold">{pick.odd.toFixed(2)}</span> : null}
            </span>
          ) : null}
          {tags.slice(0, 3).map((t) => (
            <TagPill key={t.slug} slug={t.slug} reason={t.reason} />
          ))}
          {tags.length > 3 ? <span className="text-[11px] text-mute">+{tags.length - 3}</span> : null}
        </div>
      ) : null}
    </div>
  )
}
