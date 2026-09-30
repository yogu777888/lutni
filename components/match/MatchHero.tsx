import Link from 'next/link'
import { SITE } from '@/config/site'
import { formatDateLong, formatTime, formatWeekdayLong } from '@/lib/format'
import { leagueHref } from '@/lib/links'
import type { MatchFull } from '@/lib/types'
import { TeamLogo } from '../TeamLogo'

export function MatchHero({ full, children }: { full: MatchFull; children?: React.ReactNode }) {
  const m = full.match
  const live = m.status === 'live' || m.status === 'suspended'
  const showScore = m.score && (live || m.status === 'finished')
  return (
    <div className="pitch-bg card overflow-hidden p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs text-dim">
        <Link href={leagueHref(m.league)} className="font-semibold text-fg hover:text-acid">
          {m.league.name}
        </Link>
        {m.round ? <span>· {m.round}</span> : null}
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <TeamLogo name={m.home.name} src={m.home.logo} size={56} />
          <span className="font-display text-[15px] font-bold leading-tight sm:text-xl">{m.home.name}</span>
          <span className="text-[11px] text-mute">хозяева</span>
        </div>
        <div className="flex min-w-[96px] flex-col items-center">
          {showScore ? (
            <>
              <span className={`num font-display text-4xl font-bold sm:text-5xl ${live ? 'text-live' : ''}`}>
                {m.score!.home}:{m.score!.away}
              </span>
              <span className={`mt-1 text-xs font-bold ${live ? 'text-live' : 'text-dim'}`}>
                {live && m.elapsed && m.statusCode !== 4 ? `${m.elapsed}′ · ` : ''}
                {m.statusLabel}
              </span>
              {m.scoreHT ? <span className="num mt-0.5 text-[11px] text-mute">1-й тайм {m.scoreHT.home}:{m.scoreHT.away}</span> : null}
            </>
          ) : (
            <>
              <span className="num font-display text-3xl font-bold sm:text-4xl">{formatTime(m.ts)}</span>
              <span className="mt-1 text-xs text-dim">{SITE.tzLabel}</span>
              {m.status !== 'scheduled' ? <span className="mt-1 text-xs font-bold text-loss">{m.statusLabel}</span> : null}
            </>
          )}
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <TeamLogo name={m.away.name} src={m.away.logo} size={56} />
          <span className="font-display text-[15px] font-bold leading-tight sm:text-xl">{m.away.name}</span>
          <span className="text-[11px] text-mute">гости</span>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-dim">
        <span className="capitalize">{formatWeekdayLong(m.ts)}</span>, {formatDateLong(m.ts)}
        {full.venue ? ` · ${full.venue.name}${full.venue.city ? `, ${full.venue.city}` : ''}` : ''}
        {full.referee ? ` · судья ${full.referee}` : ''}
      </p>
      {children}
    </div>
  )
}
