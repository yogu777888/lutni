import { formatDayShort } from '@/lib/format'
import type { Res, TeamForm } from '@/lib/stats'
import type { Team } from '@/lib/types'
import { TeamLogo } from '../TeamLogo'

const RES: Record<Res, { label: string; cls: string }> = {
  W: { label: 'В', cls: 'bg-win/[0.16] text-win' },
  D: { label: 'Н', cls: 'bg-draw/[0.14] text-draw' },
  L: { label: 'П', cls: 'bg-loss/[0.16] text-loss' },
}

export function ResBadge({ r, size = 'sm' }: { r: Res; size?: 'sm' | 'xs' }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-[6px] font-semibold ${RES[r].cls} ${
        size === 'sm' ? 'h-6 w-6 text-[11px]' : 'h-5 w-5 text-[10px]'
      }`}
      title={r === 'W' ? 'Победа' : r === 'D' ? 'Ничья' : 'Поражение'}
    >
      {RES[r].label}
    </span>
  )
}

function TeamFormCard({ team, form }: { team: Team; form: TeamForm }) {
  return (
    <div className="rounded-2xl bg-panel-2 p-4">
      <div className="flex items-center gap-2">
        <TeamLogo name={team.name} src={team.logo} size={22} />
        <span className="truncate font-semibold">{team.name}</span>
        <span className="ml-auto flex gap-1">
          {[...form.last5].reverse().map((r, i) => (
            <ResBadge key={i} r={r} size="xs" />
          ))}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-4 gap-1 text-center text-[11px]">
        <div>
          <dt className="text-mute">Забивает</dt>
          <dd className="num mt-0.5 text-[15px] font-semibold">{form.gfAvg.toFixed(1)}</dd>
        </div>
        <div>
          <dt className="text-mute">Пропускает</dt>
          <dd className="num mt-0.5 text-[15px] font-semibold">{form.gaAvg.toFixed(1)}</dd>
        </div>
        <div>
          <dt className="text-mute">ТБ 2.5</dt>
          <dd className="num mt-0.5 text-[15px] font-semibold">{Math.round(form.over25Rate * 100)}%</dd>
        </div>
        <div>
          <dt className="text-mute">Обе заб.</dt>
          <dd className="num mt-0.5 text-[15px] font-semibold">{Math.round(form.bttsRate * 100)}%</dd>
        </div>
      </dl>
      <ul className="mt-3 space-y-1">
        {form.games.slice(0, 6).map((g) => (
          <li key={g.id} className="flex items-center gap-2 text-[13px]">
            <span className="num w-10 shrink-0 text-[11px] text-mute">{formatDayShort(g.ts)}</span>
            <span className="w-4 shrink-0 text-[11px] text-mute">{g.isHome ? 'Д' : 'Г'}</span>
            <span className="min-w-0 flex-1 truncate">{g.opponent.name}</span>
            <span className="num shrink-0 font-medium">
              {g.gf}:{g.ga}
            </span>
            <ResBadge r={g.result} size="xs" />
          </li>
        ))}
      </ul>
    </div>
  )
}

export function FormBlock({ home, away, homeForm, awayForm }: { home: Team; away: Team; homeForm: TeamForm | null; awayForm: TeamForm | null }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {homeForm ? <TeamFormCard team={home} form={homeForm} /> : <p className="text-sm text-dim">Нет данных о форме: {home.name}</p>}
      {awayForm ? <TeamFormCard team={away} form={awayForm} /> : <p className="text-sm text-dim">Нет данных о форме: {away.name}</p>}
    </div>
  )
}
