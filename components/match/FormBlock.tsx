import { formatDayShort } from '@/lib/format'
import type { Res, TeamForm as TeamFormData } from '@/lib/stats'
import type { Team } from '@/lib/types'
import { TeamLogo } from '../TeamLogo'

/**
 * Результат — яркостью, а не светофором (владелец: «а форма команд как?»): зелёная «В» и красная «П» спорили с красным
 * «идёт» и с правилом «светофор не используем»; как в статистике матча — чем лучше, тем ярче.
 */
const RES: Record<Res, { label: string; cls: string }> = {
  W: { label: 'В', cls: 'bg-white/85 text-ink' },
  D: { label: 'Н', cls: 'bg-white/[0.16] text-fg/80' },
  L: { label: 'П', cls: 'text-mute ring-1 ring-inset ring-white/15' },
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

/**
 * Одна команда: цифры за последние матчи (до 10 — о выборке говорит подпись раздела) и 5 последних матчей, свежий
 * сверху. Значков формы в шапке нет: они шли старый → новый слева направо, а список — новый → старый сверху вниз, и
 * в значках было 5 матчей, в списке 6 — сверить было нельзя; та же форма — столбиком справа в списке.
 */
function TeamForm({ team, form }: { team: Team; form: TeamFormData }) {
  const stat = (label: string, value: string) => (
    <div className="flex flex-col justify-between">
      <dt className="text-[11px] leading-tight text-mute">{label}</dt>
      <dd className="num mt-1 text-[15px] font-semibold">{value}</dd>
    </div>
  )
  return (
    <div>
      <div className="flex items-center gap-2">
        <TeamLogo name={team.name} src={team.logo} size={22} />
        <span className="truncate font-semibold">{team.name}</span>
      </div>
      <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
        {stat('Забивает за\u00a0игру', form.gfAvg.toFixed(1))}
        {stat('Пропускает за\u00a0игру', form.gaAvg.toFixed(1))}
        {stat('3+ гола', `${Math.round(form.over25Rate * 100)}%`)}
        {stat('Обе забили', `${Math.round(form.bttsRate * 100)}%`)}
      </dl>
      <ul className="mt-3 space-y-1">
        {form.games.slice(0, 5).map((g) => (
          <li key={g.id} className="flex items-center gap-2 text-[13px]">
            <span className="num w-10 shrink-0 text-[11px] text-mute">{formatDayShort(g.ts)}</span>
            {/* «Д / Г» новичку не расшифровать — словами */}
            <span className="w-[52px] shrink-0 text-[11px] text-mute">{g.isHome ? 'дома' : 'в гостях'}</span>
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

/** Две колонки через черту, как статистика матча (были две плашки внутри карточки — «блок в блоке»); на телефоне — одна под другой. */
export function FormBlock({ home, away, homeForm, awayForm }: { home: Team; away: Team; homeForm: TeamFormData | null; awayForm: TeamFormData | null }) {
  return (
    <div className="grid md:grid-cols-2">
      <div className="md:pr-10">{homeForm ? <TeamForm team={home} form={homeForm} /> : <p className="text-sm text-dim">Нет данных о форме: {home.name}</p>}</div>
      <div className="mt-5 border-t border-white/[0.08] pt-5 md:mt-0 md:border-l md:border-t-0 md:pl-10 md:pt-0">
        {awayForm ? <TeamForm team={away} form={awayForm} /> : <p className="text-sm text-dim">Нет данных о форме: {away.name}</p>}
      </div>
    </div>
  )
}
