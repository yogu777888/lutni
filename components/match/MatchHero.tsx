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
  const team = (t: typeof m.home, role: string) => (
    <div className="flex min-w-0 flex-col items-center gap-2.5 text-center">
      <TeamLogo name={t.name} src={t.logo} size={60} />
      <span className="max-w-full text-[16px] font-semibold leading-tight sm:text-[20px]">{t.name}</span>
      <span className="text-[11px] text-mute">{role}</span>
    </div>
  )
  return (
    <div className="pitch-bg card overflow-hidden px-4 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-center text-[12px] text-mute">
        <Link href={leagueHref(m.league)} className="font-medium text-dim transition-colors hover:text-fg">
          {m.league.name}
        </Link>
        {m.round ? <span>· {m.round}</span> : null}
      </div>
      <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-8">
        {team(m.home, 'хозяева')}
        <div className="flex min-w-[96px] flex-col items-center">
          {showScore ? (
            <>
              <span className={`num text-[44px] font-semibold leading-none tracking-[-0.04em] sm:text-[56px] ${live ? 'text-live' : ''}`}>
                {m.score!.home}:{m.score!.away}
              </span>
              <span className={`mt-2 text-[12px] font-medium ${live ? 'text-live' : 'text-dim'}`}>
                {live && m.elapsed && m.statusCode !== 4 ? `${m.elapsed}′ · ` : ''}
                {m.statusLabel}
              </span>
              {m.scoreHT ? <span className="num mt-0.5 text-[11px] text-mute">1-й тайм {m.scoreHT.home}:{m.scoreHT.away}</span> : null}
            </>
          ) : (
            <>
              <span className="num text-[38px] font-semibold leading-none tracking-[-0.04em] sm:text-[48px]">{formatTime(m.ts)}</span>
              <span className="mt-2 text-[12px] text-mute">{SITE.tzLabel}</span>
              {m.status !== 'scheduled' ? <span className="mt-1 text-[12px] font-medium text-loss">{m.statusLabel}</span> : null}
            </>
          )}
        </div>
        {team(m.away, 'гости')}
      </div>
      <p className="mt-6 text-center text-[12px] text-mute">
        <span className="capitalize">{formatWeekdayLong(m.ts)}</span>, {formatDateLong(m.ts)}
        {full.venue ? ` · ${full.venue.name}${full.venue.city ? `, ${full.venue.city}` : ''}` : ''}
        {full.referee ? ` · судья ${full.referee}` : ''}
      </p>
      {children}
    </div>
  )
}
