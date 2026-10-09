import Link from 'next/link'
import type { MatchSummary } from '@/lib/data'
import { formatOdd, formatTime } from '@/lib/format'
import { matchHref } from '@/lib/links'
import { fair1x2 } from '@/lib/odds'
import { TAG_BY_SLUG, type TagHit } from '@/lib/tags'
import { buildVerdict, split100 } from '@/lib/verdict'
import type { Match } from '@/lib/types'
import { StoryLink } from './story/StoryLink'

/** Колонки строки матча: время · матч · шансы · коэффициенты (на телефоне — время и матч, кэфы ниже). */
export const ROW_COLS = 'grid-cols-[3.25rem_minmax(0,1fr)] sm:grid-cols-[3.75rem_minmax(0,1fr)_7.5rem_11.25rem]'

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

/**
 * «Кто сильнее» без цифр: полоса хозяева · ничья · гости по шансам без маржи.
 * Слева — первая команда, справа — вторая, как в названии матча; цифры — в подсказке.
 */
function Chances({ m }: { m: Match }) {
  const f = fair1x2(m.odds?.x12)
  if (!f) return <span className="block text-center text-[13px] text-mute">—</span>
  // проценты в подсказке — в сумме ровно 100
  const n = split100(f)
  const seg = [
    { k: 'home', p: f.home, n: n.home, cls: 'bg-home', name: `«${m.home.name}»` },
    { k: 'draw', p: f.draw, n: n.draw, cls: 'bg-tie', name: 'ничья' },
    { k: 'away', p: f.away, n: n.away, cls: 'bg-away', name: `«${m.away.name}»` },
  ]
  const text = seg.map((x) => `${x.name} — ${x.n}%`).join(', ')
  return (
    <span className="flex h-2 gap-0.5" title={text} role="img" aria-label={`Шансы: ${text}`}>
      {seg.map((x) => (
        <span key={x.k} className={`rounded-[3px] ${x.cls}`} style={{ width: `${x.p * 100}%` }} />
      ))}
    </span>
  )
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
            className={`num rounded-[9px] border py-1.5 text-center text-[15px] font-semibold ${
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
      {m.score.home}
      <span className="mx-1 text-mute">:</span>
      {m.score.away}
    </span>
  )
}

/** Теги строкой, как хэштеги: решётка value — лаймовая, прогруза — янтарная. */
export function Hashtags({ tags, max = 3 }: { tags: TagHit[]; max?: number }) {
  if (!tags.length) return null
  return (
    <>
      {tags.slice(0, max).map((t) => {
        const def = TAG_BY_SLUG.get(t.slug)
        if (!def) return null
        const hash = def.kind === 'accent' ? 'text-good' : def.kind === 'hot' ? 'text-hot' : 'text-mute'
        return (
          <Link key={t.slug} href={`/tag/${t.slug}`} prefetch={false} title={t.reason} className="whitespace-nowrap text-dim transition-colors hover:text-fg">
            <span className={hash}>#</span>
            {def.label.replace(/^#/, '')}
          </Link>
        )
      })}
      {tags.length > max ? <span className="text-mute">+{tags.length - max}</span> : null}
    </>
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
  /** В блоке ни у кого нет линии: без шансов и кэфов. */
  noOdds?: boolean
}) {
  const live = isLive(m)
  const played = Boolean(m.score) && (live || m.status === 'finished')
  const homeWon = m.status === 'finished' && m.score && m.score.home > m.score.away
  const awayWon = m.status === 'finished' && m.score && m.score.away > m.score.home
  const pick = m.status === 'scheduled' ? summary?.pick : null
  const hotKey = pick?.kind === 'value' && ['home', 'draw', 'away'].includes(pick.key) ? pick.key : null
  const name = (t: Match['home'], lost: boolean) => <span className={lost ? 'text-fg/55' : ''}>{t.name}</span>

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

  // вывод словами — только до начала матча: кто сильнее и что выгодно.
  // Обычный прогноз модели в строке не пишем: он бывает «против» вывода и путает — он на странице матча.
  const v = m.status === 'scheduled' ? buildVerdict({ match: m, tags, pick: pick?.kind === 'value' ? pick : null }) : null
  const bet = v?.bet
  // 1X2: выгодный кэф горит лаймом в своей ячейке — в тексте только «что выгодно»
  const inCell = Boolean(hotKey)
  const betText = bet ? (inCell && v.side && pick?.key === v.side ? 'выгодно' : `выгодно: ${bet.text}`) : null
  // теги, которые повторяют сказанное словами, не дублируем
  const said = new Set([bet ? 'value' : '', v?.level === 'strong' ? 'favorit' : '', v?.level === 'even' ? 'ravnye' : ''])
  const shownTags = tags.filter((t) => !said.has(t.slug))
  const meta = showLeague || v || shownTags.length
  return (
    <div
      className={`relative grid items-center gap-x-4 gap-y-2.5 px-4 py-3.5 transition-colors hover:bg-white/[0.02] sm:px-5 ${
        noOdds ? 'grid-cols-[3.25rem_minmax(0,1fr)_auto] sm:grid-cols-[3.75rem_minmax(0,1fr)_auto]' : ROW_COLS
      }`}
    >
      <div className="self-start pt-0.5 sm:self-center sm:pt-0">
        <StatusCell m={m} />
      </div>

      <div className="min-w-0">
        <StoryLink
          id={m.id}
          href={matchHref(m)}
          className="block truncate text-[15px] font-semibold after:absolute after:inset-0 after:content-[''] sm:text-[16px]"
        >
          {name(m.home, Boolean(awayWon))}
          <span className="mx-1.5 font-normal text-mute">—</span>
          {name(m.away, Boolean(homeWon))}
        </StoryLink>
        {meta ? (
          <div className="relative z-10 mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12.5px]">
            {showLeague ? <span className="text-mute">{m.league.name}</span> : null}
            {v ? <span className="font-medium text-chalk">{v.headline}</span> : null}
            {betText ? (
              <span className="text-good">
                {betText}
                {bet!.odd && !inCell ? <span className="num ml-1 font-semibold">{bet!.odd.toFixed(2)}</span> : null}
              </span>
            ) : null}
            <Hashtags tags={shownTags} max={v ? 2 : 3} />
          </div>
        ) : null}
      </div>

      {noOdds ? (
        played ? <Score m={m} big /> : <span />
      ) : (
        <>
          <div className="hidden sm:block">{played ? <Score m={m} big /> : <Chances m={m} />}</div>
          <div className="col-start-2 sm:col-start-auto">
            {played ? (
              <div className="flex items-center justify-between gap-3 sm:block">
                <span className="sm:hidden">
                  <Score m={m} big />
                </span>
                <span className="block w-[10.5rem] opacity-70 sm:w-auto">
                  <Odds m={m} hotKey={null} />
                </span>
              </div>
            ) : (
              <Odds m={m} hotKey={hotKey} hotOdd={pick?.odd ?? null} />
            )}
          </div>
        </>
      )}
    </div>
  )
}
