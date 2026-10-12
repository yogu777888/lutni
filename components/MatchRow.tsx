import type { MatchSummary } from '@/lib/data'
import { formatOdd, formatTime } from '@/lib/format'
import { matchHref } from '@/lib/links'
import type { TagHit } from '@/lib/tags'
import { buildVerdict } from '@/lib/verdict'
import type { Match } from '@/lib/types'
import { StoryLink } from './story/StoryLink'
import { Tick } from './Live'
import { TeamLogo } from './TeamLogo'

/**
 * Колонки строки матча — одни и те же у каждой строки, в любом состоянии (владелец: «время везде по-разному, кэфы не
 * везде есть, счёт не везде есть»): время · матч · счёт · кэфы. На телефоне — время · команды в две строки · счёт, кэфы ниже.
 */
export const ROW_COLS = 'grid-cols-[3.25rem_minmax(0,1fr)_auto] sm:grid-cols-[3.75rem_minmax(0,1fr)_4.5rem_11.25rem]'
const ROW_COLS_NO_ODDS = 'grid-cols-[3.25rem_minmax(0,1fr)_auto] sm:grid-cols-[3.75rem_minmax(0,1fr)_4.5rem]'

const isLive = (m: Match) => m.status === 'live' || m.status === 'suspended'

/** Время — одной строкой одного размера: начало / минута красным / «итог». */
export function StatusCell({ m }: { m: Match }) {
  const base = 'num block whitespace-nowrap text-[15px] font-semibold leading-none'
  if (isLive(m))
    return (
      <span className={`${base} flex items-center gap-1.5 text-live`} title="Идёт">
        <span className="h-1.5 w-1.5 shrink-0 animate-pulse-live rounded-full bg-live" />
        {m.statusCode === 4 ? 'пер.' : m.elapsed ? `${m.elapsed}′` : 'LIVE'}
      </span>
    )
  if (m.status === 'finished')
    return (
      <span className={`${base} text-mute`} title={`Начало ${formatTime(m.ts)}`}>
        итог
      </span>
    )
  if (m.status === 'postponed' || m.status === 'cancelled') return <span className={`${base} text-[12px] text-loss`}>{m.statusLabel}</span>
  return <span className={`${base} text-fg`}>{formatTime(m.ts)}</span>
}

/**
 * Кэфы 1X2. До начала — обычные (выгодный — лаймом); у идущих — те же кэфы до матча, приглушённые. У сыгранных кэфов нет.
 */
function Odds({ m, hotKey, hotOdd = null }: { m: Match; hotKey: string | null; hotOdd?: number | null }) {
  const x = m.odds?.x12
  const pre = m.status === 'scheduled'
  return (
    <span className="grid grid-cols-3 gap-1.5" title={pre ? undefined : 'Коэффициенты до матча'}>
      {(['home', 'draw', 'away'] as const).map((k) => {
        const q = x?.[k]
        const hot = pre && hotKey === k
        const dropped = pre && q?.opening && q.opening / q.value >= 1.07
        const tone = hot
          ? 'bg-acid text-acid-ink'
          : pre
            ? 'bg-white/[0.05] text-fg/90'
            : 'bg-white/[0.03] text-mute/70'
        return (
          <span
            key={k}
            className={`num rounded-ctl py-1.5 text-center text-[15px] font-semibold ${tone}`}
            title={hot ? 'Выгодно: кэф выше честной цены' : pre && q?.opening ? `Открытие ${q.opening.toFixed(2)}` : undefined}
          >
            {hot && hotOdd ? formatOdd(hotOdd) : q ? formatOdd(q.value) : '—'}
            {dropped && !hot ? <span className="ml-0.5 text-[9px] text-hot">▼</span> : null}
          </span>
        )
      })}
    </span>
  )
}

/** Счёт — у каждой строки на одном месте: до начала — тихое «– : –». */
function Score({ m, big = false }: { m: Match; big?: boolean }) {
  const cls = `num whitespace-nowrap text-center font-bold ${big ? 'text-[20px]' : 'text-[16px]'}`
  if (!m.score || m.status === 'scheduled')
    return (
      <span className={`${cls} text-mute/40`} aria-label="Ещё не начался">
        –<span className="mx-1">:</span>–
      </span>
    )
  return (
    <span className={`${cls} ${isLive(m) ? 'text-live' : 'text-fg'}`}>
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

  // Каждая строка устроена одинаково: время · матч · счёт · кэфы (владелец: «криво — время везде по-разному, кэфы
  // не везде есть, счёт не везде есть»). Подпись «выгодно» — коротко в той же строке, высота строк одна.
  const v = m.status === 'scheduled' && hotKey ? buildVerdict({ match: m, tags, pick: pick?.kind === 'value' ? pick : null }) : null
  const bet = v?.bet
  return (
    <div
      className={`relative grid items-center gap-x-4 gap-y-2.5 px-4 py-3 transition-colors hover:bg-white/[0.02] sm:px-5 ${noOdds ? ROW_COLS_NO_ODDS : ROW_COLS}`}
    >
      <div className="self-start pt-1 sm:self-center sm:pt-0">
        <StatusCell m={m} />
      </div>

      <div className="min-w-0">
        <StoryLink
          id={m.id}
          href={matchHref(m)}
          // на телефоне команды в две строки — справа счёт, иначе названия обрезаются
          className="flex min-w-0 flex-col items-start gap-1 text-[15px] font-semibold after:absolute after:inset-0 after:content-[''] sm:flex-row sm:items-center sm:gap-0 sm:text-[16px]"
        >
          {name(m.home, Boolean(awayWon))}
          <span className="mx-1.5 hidden shrink-0 font-normal text-mute sm:inline">—</span>
          {name(m.away, Boolean(homeWon))}
          {bet ? (
            <span className="ml-3 hidden shrink-0 text-[12.5px] font-medium text-good sm:inline" title={`Выгодно: ${bet.text}`}>
              выгодно
            </span>
          ) : null}
        </StoryLink>
        {showLeague ? <div className="mt-1 truncate text-[12.5px] text-mute">{m.league.name}</div> : null}
      </div>

      <div className="sm:text-center">
        <Score m={m} big />
      </div>
      {/* у сыгранных кэфов нет (владелец: «а кэфы у сыгранных может вообще убрать?») — место колонки остаётся пустым */}
      {noOdds ? null : m.status === 'finished' ? (
        // пустое место высотой ячейки кэфа — строки одной высоты
        <span className="hidden h-[34px] sm:block" />
      ) : (
        <div className="col-span-2 col-start-2 sm:col-span-1 sm:col-start-auto">
          <Odds m={m} hotKey={hotKey} hotOdd={pick?.odd ?? null} />
        </div>
      )}
    </div>
  )
}
