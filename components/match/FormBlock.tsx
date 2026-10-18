import { formatDayShort } from '@/lib/format'
import type { TeamForm as TeamFormData } from '@/lib/stats'
import type { Team } from '@/lib/types'
import { FormStrip, type StripGame } from './FormStrip'
import { TeamLogo } from '../TeamLogo'

/**
 * Сравнение, как статистика в «Сейчас в матче» (владелец: «блок форма команд тоже как то не очень выглядит» — «да»):
 * хозяева слева, гости справа, подпись по центру в одну строку («0,7 · Забивает за игру · 2,1»; таблицей с подписью слева
 * пустовала середина на компьютере, а на телефоне подписи переносились); у кого лучше — белым, другая цифра — серая
 * (у «Пропускает» лучше меньше, у остальных ярче больше — как в статистике матча). Последняя строка — значки В/Н/П,
 * свежий справа у обеих, соперник и счёт — по нажатию (`FormStrip`).
 */
export function FormBlock({ home, away, homeForm, awayForm }: { home: Team; away: Team; homeForm: TeamFormData | null; awayForm: TeamFormData | null }) {
  const dec = (n: number) => n.toFixed(1).replace('.', ',')
  const row = (label: string, get: (f: TeamFormData) => number, show: (n: number) => string, lowerBetter = false) => {
    const h = homeForm ? get(homeForm) : null
    const a = awayForm ? get(awayForm) : null
    const tone = (me: number | null, them: number | null) =>
      me == null ? 'text-mute' : them == null || me === them || (lowerBetter ? me < them : me > them) ? 'font-semibold text-fg' : 'font-medium text-dim'
    const better = (me: number | null, them: number | null) => me != null && them != null && me !== them && (lowerBetter ? me < them : me > them)
    const eq = h != null && h === a
    const bar = (good: boolean) => (eq ? 'bg-white/45' : good ? 'bg-white/85' : 'bg-white/30')
    const total = (h ?? 0) + (a ?? 0) || 1
    return (
      <div className="border-t border-edge py-3">
        <div className="grid grid-cols-[56px_minmax(0,1fr)_56px] items-center gap-x-2 text-[16px]">
          <span className={`num ${tone(h, a)}`}>{h == null ? '—' : show(h)}</span>
          <span className="truncate text-center text-[14px] text-dim">{label}</span>
          <span className={`num text-right ${tone(a, h)}`}>{a == null ? '—' : show(a)}</span>
        </div>
        {/* полоса сравнения, как в статистике «Сейчас в матче»: перевес видно раньше, чем прочитаны цифры (владелец:
            «просто сейчас реально настройки из айос напоминает» — «да» на полосы и крупные цифры) */}
        {h != null && a != null ? (
          <div className="mt-2 flex h-1.5 gap-0.5" aria-hidden>
            <div className="flex flex-1 justify-end overflow-hidden rounded-l-full bg-white/[0.09]">
              <div className={`h-full rounded-l-full ${bar(better(h, a))}`} style={{ width: `${(h / total) * 100}%` }} />
            </div>
            <div className="flex-1 overflow-hidden rounded-r-full bg-white/[0.09]">
              <div className={`h-full rounded-r-full ${bar(better(a, h))}`} style={{ width: `${(a / total) * 100}%` }} />
            </div>
          </div>
        ) : null}
      </div>
    )
  }
  const strip = (f: TeamFormData | null): StripGame[] | null =>
    f
      ? f.games
          .slice(0, 5)
          .reverse()
          .map((g) => ({ id: g.id, date: formatDayShort(g.ts), opponent: g.opponent.name, score: `${g.gf}:${g.ga}`, home: g.isHome, result: g.result }))
      : null
  const pct = (n: number) => `${Math.round(n * 100)}%`
  return (
    <div>
      <div className="flex items-center justify-between gap-3 pb-3">
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="shrink-0"><TeamLogo name={home.name} src={home.logo} size={32} /></span>
          <span className="line-clamp-2 break-words text-[16px] font-semibold leading-tight">{home.name}</span>
        </span>
        <span className="flex min-w-0 items-center gap-2">
          <span className="line-clamp-2 break-words text-right text-[16px] font-semibold leading-tight">{away.name}</span>
          <span className="shrink-0"><TeamLogo name={away.name} src={away.logo} size={32} /></span>
        </span>
      </div>
      {row('Забивает за\u00a0игру', (f) => f.gfAvg, dec)}
      {row('Пропускает за\u00a0игру', (f) => f.gaAvg, dec, true)}
      {row('3 гола и больше', (f) => f.over25Rate, pct)}
      {row('Обе забили', (f) => f.bttsRate, pct)}
      <FormStrip home={strip(homeForm)} away={strip(awayForm)} />
    </div>
  )
}
