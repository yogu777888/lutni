import type { TeamPoints, Point } from '@/lib/team-xg'
import { TeamLogo } from '../TeamLogo'
import { XgText } from './Xg'

type Side = { name: string; logo?: string | null }

function Row({ label, p }: { label: string; p: Point }) {
  return (
    <div>
      <p className="text-[13px] text-mute">{label}</p>
      <p className="mt-0.5 text-[16px] font-semibold leading-snug">{p.title}</p>
      <p className="mt-0.5 text-[14px] leading-snug text-dim"><XgText text={p.text} /></p>
    </div>
  )
}

/**
 * «Сильное и слабое место» — по команде: одно сильное и одно слабое, только заметные (`teamPoints` в lib/team-xg.ts:
 * по xG прошлых матчей, без него — по голам). От 48rem ширины блока — две колонки через черту, уже — одна под другой.
 */
export function Strengths({ home, away, points }: { home: Side; away: Side; points: { home: TeamPoints; away: TeamPoints } }) {
  const col = (s: Side, t: TeamPoints) => (
    <div className="relative space-y-3.5 py-4 first:pt-0 last:pb-0 @3xl:py-0 @3xl:first:pr-6 @3xl:last:pl-6">
      <div className="flex items-center gap-2.5">
        <TeamLogo name={s.name} src={s.logo ?? null} size={28} />
        <span className="min-w-0 truncate text-[16px] font-semibold">{s.name}</span>
      </div>
      {t.strong ? <Row label="Сильное место" p={t.strong} /> : null}
      {t.weak ? <Row label="Слабое место" p={t.weak} /> : null}
      {!t.strong && !t.weak ? <p className="text-[14px] text-dim">Ничем заметно не выделяется — ни в плюс, ни в минус.</p> : null}
    </div>
  )
  return (
    <div className="@container">
      <div className="divide-y divide-edge @3xl:grid @3xl:grid-cols-2 @3xl:divide-x @3xl:divide-y-0">
        {col(home, points.home)}
        {col(away, points.away)}
      </div>
    </div>
  )
}
