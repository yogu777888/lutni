import { formatDayShort } from '@/lib/format'
import type { TeamForm as TeamFormData } from '@/lib/stats'
import type { Team } from '@/lib/types'
import { FormStrip, type StripGame } from './FormStrip'
import { MirrorBars, mirrorWidths } from './SplitBar'
import { TeamHead } from './TeamHead'

/**
 * Сравнение, как статистика в «Сейчас в матче» (владелец: «блок форма команд тоже как то не очень выглядит» — «да»):
 * хозяева слева, гости справа, подпись по центру в одну строку («0,7 · Забивает за игру · 2,1»; таблицей с подписью слева
 * пустовала середина на компьютере, а на телефоне подписи переносились); у кого лучше — белым, другая цифра — серая
 * (у «Пропускает» лучше меньше, у остальных ярче больше — как в статистике матча). Последняя строка — значки В/Н/П,
 * свежий справа у обеих, соперник и счёт — по нажатию (`FormStrip`).
 */
export function FormBlock({ home, away, homeForm, awayForm }: { home: Team; away: Team; homeForm: TeamFormData | null; awayForm: TeamFormData | null }) {
  const dec = (n: number) => n.toFixed(1).replace('.', ',')
  // строка — тем же видом, что в «Статистике» (владелец: «по шрифту и отступам они все равно отличаются, сделай как в
  // статистике»): цифры 16px, подпись 14px по центру, `py-2`, полоса `MirrorBars` с теми же ширинами (`mirrorWidths`:
  // средние — от большего в строке, проценты — по шкале 0–100); у кого лучше — цветом клуба, другая — серая
  const row = (label: string, get: (f: TeamFormData) => number, show: (n: number) => string, pctRow = false, lowerBetter = false) => {
    const h = homeForm ? get(homeForm) : null
    const a = awayForm ? get(awayForm) : null
    const both = h != null && a != null
    const lead = (me: number | null, them: number | null) => both && me !== them && (lowerBetter ? me! < them! : me! > them!)
    const num = (v: number | null, o: number | null, right: boolean) => (
      <span className={`num min-w-0 text-[16px] leading-snug ${right ? 'text-right' : ''} ${v == null ? 'text-mute' : lead(v, o) ? 'font-bold text-fg' : lead(o, v) ? 'font-semibold text-dim' : 'font-semibold text-fg'}`}>
        {v == null ? '—' : show(v)}
      </span>
    )
    const tone = !both || h === a ? null : lead(h, a) ? 'home' : 'away'
    const k = pctRow ? 100 : 1
    return (
      <li className="relative border-t border-edge py-2 first:border-t-0">
        <div className="grid grid-cols-[minmax(3.5rem,1fr)_minmax(0,auto)_minmax(3.5rem,1fr)] items-baseline gap-x-2 sm:gap-x-3">
          {num(h, a, false)}
          <span className="text-balance text-center text-[14px] leading-snug text-dim">{label}</span>
          {num(a, h, true)}
        </div>
        <div className="mt-2">
          <MirrorBars widths={both ? mirrorWidths(h! * k, a! * k, pctRow) : null} lead={tone} />
        </div>
      </li>
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
      {/* шапка — как в «Статистике»: эмблема 28px, название 16px, звёздочка «в избранное», черта снизу */}
      <div className="flex items-center justify-between gap-4 border-b border-edge pb-3">
        <TeamHead t={home} />
        <TeamHead t={away} right />
      </div>
      <ul className="mt-1.5">
        {row('Забивает за\u00a0игру', (f) => f.gfAvg, dec)}
        {row('Пропускает за\u00a0игру', (f) => f.gaAvg, dec, false, true)}
        {row('3 гола и больше', (f) => f.over25Rate, pct, true)}
        {row('Обе забили', (f) => f.bttsRate, pct, true)}
      </ul>
      <FormStrip home={strip(homeForm)} away={strip(awayForm)} />
    </div>
  )
}
