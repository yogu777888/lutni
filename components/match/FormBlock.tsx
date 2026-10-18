import { formatDayShort } from '@/lib/format'
import type { TeamForm as TeamFormData } from '@/lib/stats'
import type { Team } from '@/lib/types'
import { FormStrip, type StripGame } from './FormStrip'
import { TeamLogo } from '../TeamLogo'

/**
 * Одна таблица на две команды, как список в iOS (владелец: «виджеты довольно грязно выглядят», потом «блок форма команд
 * длинный»): сверху эмблемы, строки «Забивает за игру — 2.1 | 1.7» — каждая подпись один раз; последняя строка — форма
 * значками В/Н/П, свежий справа, соперник и счёт — по нажатию (`FormStrip`). Списка матчей с переключателем команд нет:
 * блок ~300px вместо ~710 на телефоне.
 */
export function FormBlock({ home, away, homeForm, awayForm }: { home: Team; away: Team; homeForm: TeamFormData | null; awayForm: TeamFormData | null }) {
  // колонка команды — под пять значков (5 × 20px и зазоры)
  const GRID = 'grid grid-cols-[minmax(0,1fr)_108px_108px] items-center gap-x-3 sm:grid-cols-[minmax(0,1fr)_140px_140px]'
  const v = (f: TeamFormData | null, get: (f: TeamFormData) => string) => <span className="num text-center text-[15px] font-semibold">{f ? get(f) : '—'}</span>
  const row = (label: string, get: (f: TeamFormData) => string) => (
    <div className={`${GRID} min-h-11 border-t border-edge py-1`}>
      <span className="text-[14px] leading-tight text-dim">{label}</span>
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
  const strip = (f: TeamFormData | null): StripGame[] | null =>
    f
      ? f.games
          .slice(0, 5)
          .reverse()
          .map((g) => ({ id: g.id, date: formatDayShort(g.ts), opponent: g.opponent.name, score: `${g.gf}:${g.ga}`, home: g.isHome, result: g.result }))
      : null
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
      <FormStrip grid={GRID} home={strip(homeForm)} away={strip(awayForm)} />
    </div>
  )
}
