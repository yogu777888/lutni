import { formatDayShort } from '@/lib/format'
import type { Res, TeamForm as TeamFormData } from '@/lib/stats'
import type { Team } from '@/lib/types'
import { Segmented } from '../Segmented'
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

/** Последние 5 матчей команды, свежий сверху: соперник, ниже дата и «дома / в гостях»; справа счёт и результат. */
function Games({ form }: { form: TeamFormData }) {
  return (
    <ul>
      {form.games.slice(0, 5).map((g) => (
        <li key={g.id} className="flex min-h-12 items-center gap-3 border-t border-edge py-1.5 first:border-t-0">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px]">{g.opponent.name}</div>
            {/* «Д / Г» новичку не расшифровать — словами */}
            <div className="text-[13px] text-mute">
              <span className="num">{formatDayShort(g.ts)}</span> · {g.isHome ? 'дома' : 'в гостях'}
            </div>
          </div>
          <span className="num shrink-0 text-[15px] font-semibold">
            {g.gf}:{g.ga}
          </span>
          <ResBadge r={g.result} />
        </li>
      ))}
    </ul>
  )
}

/**
 * Одна таблица на две команды, как список в iOS (владелец: «виджеты довольно грязно выглядят и тяжело читаются … куча
 * мелкого текста»): сверху эмблемы, строки «Забивает за игру — 2.1 | 1.7» — каждая подпись один раз и одной строкой
 * (было по четыре подписи 11px в две строки у каждой команды); последние матчи — сегментами «Ливерпуль | Арсенал»,
 * пять строк вместо десяти. Значков формы в шапке нет: последние матчи — списком, свежий сверху.
 */
export function FormBlock({ home, away, homeForm, awayForm }: { home: Team; away: Team; homeForm: TeamFormData | null; awayForm: TeamFormData | null }) {
  const GRID = 'grid grid-cols-[minmax(0,1fr)_72px_72px] items-center gap-x-2 sm:grid-cols-[minmax(0,1fr)_120px_120px]'
  const v = (f: TeamFormData | null, get: (f: TeamFormData) => string) => <span className="num text-center text-[15px] font-semibold">{f ? get(f) : '—'}</span>
  const row = (label: string, get: (f: TeamFormData) => string) => (
    <div className={`${GRID} min-h-11 border-t border-edge py-1`}>
      <span className="text-[14px] text-dim">{label}</span>
      {v(homeForm, get)}
      {v(awayForm, get)}
    </div>
  )
  const head = (t: Team) => (
    <span className="flex min-w-0 flex-col items-center gap-1 self-end" title={t.name}>
      <TeamLogo name={t.name} src={t.logo} size={24} />
      <span className="line-clamp-2 max-w-full break-words text-center text-[13px] leading-tight text-mute">{t.name}</span>
    </span>
  )
  const tab = (t: Team) => (
    <>
      <TeamLogo name={t.name} src={t.logo} size={18} />
      <span className="truncate">{t.name}</span>
    </>
  )
  return (
    <div>
      <div className={`${GRID} pb-2`}>
        <span />
        {head(home)}
        {head(away)}
      </div>
      {row('Забивает за\u00a0игру', (f) => f.gfAvg.toFixed(1))}
      {row('Пропускает за\u00a0игру', (f) => f.gaAvg.toFixed(1))}
      {row('3 гола и больше', (f) => `${Math.round(f.over25Rate * 100)}%`)}
      {row('Обе забили', (f) => `${Math.round(f.bttsRate * 100)}%`)}

      <h3 className="mb-3 mt-6 text-[15px] font-semibold">Последние матчи</h3>
      <Segmented
        label="Команда"
        items={[
          ...(homeForm ? [{ key: 'home', label: tab(home), content: <Games form={homeForm} /> }] : []),
          ...(awayForm ? [{ key: 'away', label: tab(away), content: <Games form={awayForm} /> }] : []),
        ]}
      />
    </div>
  )
}
