import Link from 'next/link'
import type { MatchSummary } from '@/lib/data'
import { formatOdd, formatTime } from '@/lib/format'
import { matchHref } from '@/lib/links'
import type { Quote } from '@/lib/odds'
import type { TagHit } from '@/lib/tags'
import type { Match } from '@/lib/types'
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
        <span className="num text-xs font-semibold text-live">
          {m.statusCode === 4 ? 'Пер.' : m.elapsed ? `${m.elapsed}′` : ''}
        </span>
      </div>
    )
  }
  if (m.status === 'finished') {
    return (
      <div className="flex flex-col items-center leading-tight">
        <span className="num text-xs text-dim">{formatTime(m.ts)}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-mute">итог</span>
      </div>
    )
  }
  if (m.status === 'postponed' || m.status === 'cancelled') {
    return <span className="text-[10px] font-semibold text-loss">{m.statusLabel}</span>
  }
  return <span className="num text-sm font-bold">{formatTime(m.ts)}</span>
}

function OddCell({ label, q, fav }: { label: string; q?: Quote; fav: boolean }) {
  const dropped = q?.opening && q.value && q.opening / q.value >= 1.07
  return (
    <span className="flex w-[42px] flex-col items-center rounded-lg bg-panel-2 py-1 ring-1 ring-inset ring-edge sm:w-12">
      <span className="text-[9px] font-semibold text-mute">{label}</span>
      <span className={`num text-[13px] font-bold ${fav ? 'text-acid' : 'text-fg'}`}>
        {formatOdd(q?.value)}
        {dropped ? <span className="ml-0.5 text-[9px] text-loss" title={`Открытие ${q?.opening?.toFixed(2)}`}>▼</span> : null}
      </span>
    </span>
  )
}

export function MatchRow({ m, tags, summary }: { m: Match; tags: TagHit[]; summary?: MatchSummary | null }) {
  const x = m.odds?.x12
  const values = [x?.home?.value, x?.draw?.value, x?.away?.value].filter((v): v is number => Boolean(v))
  const min = values.length === 3 ? Math.min(...values) : 0
  const showScore = m.score && (m.status === 'live' || m.status === 'finished' || m.status === 'suspended')
  const homeWon = m.status === 'finished' && m.score && m.score.home > m.score.away
  const awayWon = m.status === 'finished' && m.score && m.score.away > m.score.home
  const pick = summary?.pick

  return (
    <div className="group relative flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-panel-2/70 sm:gap-3">
      <div className="flex w-10 shrink-0 justify-center sm:w-11">
        <StatusCell m={m} />
      </div>
      <div className="min-w-0 flex-1">
        <Link href={matchHref(m)} prefetch={false} className="block after:absolute after:inset-0 after:content-['']">
          <span className="sr-only">
            {m.home.name} — {m.away.name}
          </span>
          {[
            { t: m.home, s: m.score?.home, won: homeWon },
            { t: m.away, s: m.score?.away, won: awayWon },
          ].map(({ t, s, won }, i) => (
            <span key={i} className="flex items-center gap-2 py-[1px]" aria-hidden>
              <TeamLogo name={t.name} src={t.logo} size={18} />
              <span className={`truncate text-[14px] ${won ? 'font-bold' : 'font-medium'} ${m.status === 'finished' && !won ? 'text-fg/80' : ''}`}>
                {t.name}
              </span>
              {showScore ? (
                <span className={`num ml-auto pl-2 text-[14px] font-extrabold ${m.status === 'live' ? 'text-live' : ''}`}>{s}</span>
              ) : null}
            </span>
          ))}
        </Link>
        {tags.length || pick ? (
          <div className="relative z-10 mt-1.5 flex flex-wrap items-center gap-1">
            {pick && m.status === 'scheduled' ? (
              <span className="rounded-full bg-acid/10 px-2 py-0.5 text-[11px] font-bold text-acid ring-1 ring-inset ring-acid/30">
                Прогноз: {pick.label}
                {pick.odd ? <span className="num font-semibold text-acid/80"> · {pick.odd.toFixed(2)}</span> : null}
              </span>
            ) : null}
            {tags.slice(0, 3).map((t) => (
              <TagPill key={t.slug} slug={t.slug} reason={t.reason} />
            ))}
            {tags.length > 3 ? <span className="text-[11px] text-mute">+{tags.length - 3}</span> : null}
          </div>
        ) : null}
      </div>
      {x ? (
        <div className="flex shrink-0 gap-1">
          <OddCell label="П1" q={x.home} fav={x.home?.value === min} />
          <OddCell label="Х" q={x.draw} fav={x.draw?.value === min} />
          <OddCell label="П2" q={x.away} fav={x.away?.value === min} />
        </div>
      ) : null}
    </div>
  )
}
