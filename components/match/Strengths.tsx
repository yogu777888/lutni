import { Fragment } from 'react'
import { mainPoint, type TeamPoints, type Point } from '@/lib/team-xg'
import { TeamLogo } from '../TeamLogo'
import { XgText } from './Xg'

type Side = { name: string; logo?: string | null }

function Row({ label, p }: { label: string | null; p: Point }) {
  return (
    <div>
      {label ? <p className="text-[13px] text-mute">{label}</p> : null}
      <p className="mt-0.5 text-[16px] font-semibold leading-snug">{p.title}</p>
      <p className="mt-0.5 text-[14px] leading-snug text-dim"><XgText text={p.text} /></p>
    </div>
  )
}

/**
 * «Сильное и слабое место» — по команде одно место, самое заметное (`mainPoint`), только заметные (`teamPoints` в lib/team-xg.ts:
 * по xG прошлых матчей, без него — по голам). От 48rem ширины блока — две колонки через черту, уже — одна под другой.
 */
export function Strengths({ home, away, points }: { home: Side; away: Side; points: { home: TeamPoints; away: TeamPoints } }) {
  const col = (s: Side, t: TeamPoints, solo: boolean) => {
    const one = mainPoint(t)
    return (
      <div className={`relative space-y-3.5 ${solo ? '' : 'py-4 first:pt-0 last:pb-0 @3xl:py-0 @3xl:first:pr-6 @3xl:last:pl-6'}`}>
        <div className="flex items-center gap-2.5">
          <TeamLogo name={s.name} src={s.logo ?? null} size={28} />
          <span className="min-w-0 truncate text-[16px] font-semibold">{s.name}</span>
        </div>
        {one ? <Row label={mixed ? (one.kind === 'strong' ? 'Сильное место' : 'Слабое место') : null} p={one.p} /> : null}
      </div>
    )
  }
  // команду, которой нечего сказать, не показываем (владелец: «если у одной команды есть сильное место то писать только о
  // нем»): пустая колонка «Ничем заметно не выделяется» занимала полблока
  const sides = ([[home, points.home], [away, points.away]] as const).filter(([, t]) => mainPoint(t))
  // одного вида у всех — подпись уже в заголовке раздела («Сильное место»)
  const mixed = new Set(sides.map(([, t]) => mainPoint(t)?.kind)).size > 1
  return (
    <div className="@container">
      <div className={sides.length === 2 ? 'divide-y divide-edge @3xl:grid @3xl:grid-cols-2 @3xl:divide-x @3xl:divide-y-0' : ''}>
        {sides.map(([s, t]) => <Fragment key={s.name}>{col(s, t, sides.length === 1)}</Fragment>)}
      </div>
    </div>
  )
}
