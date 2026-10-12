import type { MatchSummary } from '@/lib/data'
import { formatOdd, formatTime } from '@/lib/format'
import { matchHref } from '@/lib/links'
import type { TagHit } from '@/lib/tags'
import { buildVerdict } from '@/lib/verdict'
import type { Match } from '@/lib/types'
import { StoryLink } from './story/StoryLink'
import { Tick } from './Live'
import { TeamLogo } from './TeamLogo'

/** Колонки строки матча: время · матч · счёт · коэффициенты (на телефоне — время и матч, кэфы ниже). */
export const ROW_COLS = 'grid-cols-[3.25rem_minmax(0,1fr)] sm:grid-cols-[3.75rem_minmax(0,1fr)_4.5rem_11.25rem]'

const isLive = (m: Match) => m.status === 'live' || m.status === 'suspended'

export function StatusCell({ m }: { m: Match }) {
  if (isLive(m)) {
    return (
      <span className="flex flex-col leading-tight">
        <span className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-live">
          <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-live" />
          LIVE
        </span>
        <span className="num text-[17px] font-semibold text-live">{m.statusCode === 4 ? 'Пер.' : m.elapsed ? `${m.elapsed}′` : ''}</span>
      </span>
    )
  }
  if (m.status === 'finished') {
    return (
      <span className="flex flex-col leading-tight">
        <span className="num text-[16px] font-semibold text-mute">{formatTime(m.ts)}</span>
        <span className="text-[10px] uppercase tracking-wide text-mute">итог</span>
      </span>
    )
  }
  if (m.status === 'postponed' || m.status === 'cancelled') {
    return <span className="text-[11px] font-medium leading-tight text-loss">{m.statusLabel}</span>
  }
  return <span className="num text-[18px] font-semibold tracking-tight text-chalk">{formatTime(m.ts)}</span>
}

function Odds({ m, hotKey, hotOdd = null }: { m: Match; hotKey: string | null; hotOdd?: number | null }) {
  const x = m.odds?.x12
  const done = m.status === 'finished'
  return (
    <span className="grid grid-cols-3 gap-1.5">
      {(['home', 'draw', 'away'] as const).map((k) => {
        const q = x?.[k]
        const hot = hotKey === k && !done
        const dropped = q?.opening && q.opening / q.value >= 1.07
        return (
          <span
            key={k}
            className={`num rounded-ctl border py-1.5 text-center text-[15px] font-semibold ${
              hot ? 'border-acid bg-acid text-acid-ink' : `border-transparent bg-white/[0.05] ${done ? 'text-mute' : 'text-fg/90'}`
            }`}
            title={q?.opening ? `Открытие ${q.opening.toFixed(2)}` : undefined}
          >
            {/* в лаймовой ячейке — тот выгодный кэф, о котором написано в строке */}
            {hot && hotOdd ? formatOdd(hotOdd) : q ? formatOdd(q.value) : '—'}
            {dropped && !hot ? <span className="ml-0.5 text-[9px] text-hot">▼</span> : null}
          </span>
        )
      })}
    </span>
  )
}

function Score({ m, big = false }: { m: Match; big?: boolean }) {
  if (!m.score) return null
  return (
    <span className={`num text-center font-bold ${big ? 'text-[20px]' : 'text-[16px]'} ${isLive(m) ? 'text-live' : 'text-fg'}`}>
      <Tick v={m.score.home} />
      <span className="mx-1 text-mute">:</span>
      <Tick v={m.score.away} />
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
  /** Подпись турнира — для смешанных списков (live, «другие матчи»). */
  showLeague?: boolean
  /** Узкая боковая колонка: время, команды, счёт. */
  compact?: boolean
  /** В блоке ни у кого нет линии: без кэфов. */
  noOdds?: boolean
}) {
  const live = isLive(m)
  const played = Boolean(m.score) && (live || m.status === 'finished')
  const homeWon = m.status === 'finished' && m.score && m.score.home > m.score.away
  const awayWon = m.status === 'finished' && m.score && m.score.away > m.score.home
  const pick = m.status === 'scheduled' ? summary?.pick : null
  const hotKey = pick?.kind === 'value' && ['home', 'draw', 'away'].includes(pick.key) ? pick.key : null
  // эмблема перед названием — матч узнаётся глазами раньше, чем прочитан
  const name = (t: Match['home'], lost: boolean) => (
    <span className={`flex min-w-0 items-center gap-1.5 ${lost ? 'text-fg/55' : ''}`}>
      <span className={`shrink-0 ${lost ? 'opacity-60' : ''}`}>
        <TeamLogo name={t.name} src={t.logo} size={18} />
      </span>
      <span className="truncate">{t.name}</span>
    </span>
  )

  if (compact) {
    return (
      <div className="relative grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-3 transition-colors hover:bg-white/[0.02]">
        <StatusCell m={m} />
        <StoryLink id={m.id} href={matchHref(m)} className="min-w-0 after:absolute after:inset-0 after:content-['']">
          <span className="block truncate text-[14px] font-semibold">{m.home.name}</span>
          <span className="block truncate text-[14px] font-semibold">{m.away.name}</span>
          {showLeague ? <span className="block truncate text-[11px] text-mute">{m.league.name}</span> : null}
        </StoryLink>
        {played ? <Score m={m} /> : null}
      </div>
    )
  }

  // Одна строка — одно правило по состоянию матча (владелец: «в центральных блоках логическая каша»):
  // до начала — одна подпись (выгодная ставка, иначе кто сильнее) и кэфы; идёт и сыгран — только счёт,
  // без доматчевых кэфов и тегов (после стартового свистка они уже ничего не говорят). Теги — в «Подборках дня».
  const v = m.status === 'scheduled' ? buildVerdict({ match: m, tags, pick: pick?.kind === 'value' ? pick : null }) : null
  const bet = v?.bet
  // выгодная ставка — словами и лаймовой ячейкой; тогда «кто сильнее» не пишем: два вывода в строке спорили
  const note = bet ? (
    <span className="text-good">
      Выгодно: {bet.text}
      {bet.odd && !hotKey ? <span className="num ml-1 font-semibold">{bet.odd.toFixed(2)}</span> : null}
    </span>
  ) : v ? (
    <span className="text-dim">{v.headline}</span>
  ) : null
  const meta = showLeague || note
  const upcoming = m.status === 'scheduled'
  return (
    <div
      className={`relative grid items-center gap-x-4 gap-y-2.5 px-4 py-3.5 transition-colors hover:bg-white/[0.02] sm:px-5 ${
        noOdds
          ? 'grid-cols-[3.25rem_minmax(0,1fr)_auto] sm:grid-cols-[3.75rem_minmax(0,1fr)_auto]'
          : played
            ? // на телефоне счёт — справа в той же строке, на компьютере — в колонке «Счёт»
              'grid-cols-[3.25rem_minmax(0,1fr)_auto] sm:grid-cols-[3.75rem_minmax(0,1fr)_4.5rem_11.25rem]'
            : ROW_COLS
      }`}
    >
      <div className="self-start pt-0.5 sm:self-center sm:pt-0">
        <StatusCell m={m} />
      </div>

      <div className="min-w-0">
        <StoryLink
          id={m.id}
          href={matchHref(m)}
          // у начавшихся на телефоне справа счёт — команды в две строки, иначе названия обрезаются («Барсел… — Лева…»)
          className={`flex min-w-0 text-[15px] font-semibold after:absolute after:inset-0 after:content-[''] sm:flex-row sm:items-center sm:text-[16px] ${
            played ? 'flex-col items-start gap-1' : 'items-center'
          } sm:gap-0`}
        >
          {name(m.home, Boolean(awayWon))}
          <span className={`mx-1.5 shrink-0 font-normal text-mute ${played ? 'hidden sm:inline' : ''}`}>—</span>
          {name(m.away, Boolean(homeWon))}
        </StoryLink>
        {meta ? (
          <div className="relative z-10 mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12.5px]">
            {showLeague ? <span className="text-mute">{m.league.name}</span> : null}
            {note}
          </div>
        ) : null}
      </div>

      {noOdds ? (
        played ? <Score m={m} big /> : <span />
      ) : played ? (
        <>
          <div className="sm:text-center">
            <Score m={m} big />
          </div>
          <span className="hidden sm:block" />
        </>
      ) : (
        <>
          <span className="hidden sm:block" />
          <div className="col-start-2 sm:col-start-auto">{upcoming ? <Odds m={m} hotKey={hotKey} hotOdd={pick?.odd ?? null} /> : null}</div>
        </>
      )}
    </div>
  )
}
