import type { TeamStatRow } from '@/components/match/TeamStatsPanel'
import type { StripGame } from '@/components/match/FormStrip'
import { formatDayShort } from './format'
import type { TeamForm } from './stats'
import type { TeamSetPieces, TeamXg } from './team-xg'

type Side<T> = { home: T | null; away: T | null }

/**
 * Строки «Статистики команд» до матча: голы и результаты — по форме (последние до 10 матчей, очки — за 5), xG —
 * по последним 5 с цифрами (от 3), угловые и жёлтые — так же. Строку без цифр у обеих команд не показываем; в
 * «Основных» — то, что есть из очков, голов, xG, угловых и жёлтых.
 */
export function teamStatRows(form: Side<TeamForm>, xg: Side<TeamXg>, sp: Side<TeamSetPieces>): TeamStatRow[] {
  const f = (get: (t: TeamForm) => number) => [form.home ? get(form.home) : null, form.away ? get(form.away) : null] as const
  const x = (get: (t: TeamXg) => number) => [xg.home ? get(xg.home) : null, xg.away ? get(xg.away) : null] as const
  const c = (get: (t: TeamSetPieces) => number) => [sp.home?.cornersN ? get(sp.home) : null, sp.away?.cornersN ? get(sp.away) : null] as const
  const y = (get: (t: TeamSetPieces) => number) => [sp.home?.cardsN ? get(sp.home) : null, sp.away?.cardsN ? get(sp.away) : null] as const
  const rows: TeamStatRow[] = []
  const add = (r: Omit<TeamStatRow, 'h' | 'a'>, [h, a]: readonly [number | null, number | null]) => {
    if (h != null || a != null) rows.push({ ...r, h, a })
  }
  add({ key: 'points5', label: 'Очки из 15', group: 'results', main: true, fmt: 'int', scale: 15, better: 'more' }, f((t) => t.points5))
  add({ key: 'cleanSheet', label: 'Матчи на ноль', group: 'results', fmt: 'pct', scale: 1, better: 'more' }, f((t) => t.cleanSheetRate))
  add({ key: 'failedToScore', label: 'Без забитых', group: 'results', fmt: 'pct', scale: 1, better: 'less' }, f((t) => t.failedToScoreRate))
  add({ key: 'gf', label: 'Забивает за игру', group: 'goals', main: true, fmt: 'dec', better: 'more' }, f((t) => t.gfAvg))
  add({ key: 'ga', label: 'Пропускает за игру', group: 'goals', main: true, fmt: 'dec', better: 'less' }, f((t) => t.gaAvg))
  add({ key: 'over25', label: '3 гола и больше', group: 'goals', fmt: 'pct', scale: 1, better: 'none' }, f((t) => t.over25Rate))
  add({ key: 'btts', label: 'Обе забили', group: 'goals', fmt: 'pct', scale: 1, better: 'none' }, f((t) => t.bttsRate))
  add({ key: 'xgFor', label: 'xG за игру', group: 'chances', main: true, fmt: 'dec', better: 'more' }, x((t) => t.xgFor))
  add({ key: 'xgAgainst', label: 'xG соперников', group: 'chances', fmt: 'dec', better: 'less' }, x((t) => t.xgAgainst))
  add({ key: 'cornersFor', label: 'Угловые за игру', group: 'corners', main: true, fmt: 'dec', better: 'more' }, c((t) => t.cornersFor))
  add({ key: 'cornersAgainst', label: 'Угловые соперника', group: 'corners', fmt: 'dec', better: 'less' }, c((t) => t.cornersAgainst))
  add({ key: 'cards', label: 'Жёлтые за игру', group: 'discipline', main: true, fmt: 'dec', better: 'less' }, y((t) => t.cards))
  add({ key: 'cardsAgainst', label: 'Жёлтые у соперника', group: 'discipline', fmt: 'dec', better: 'none' }, y((t) => t.cardsAgainst))
  return rows
}

/** «Последние 5 матчей» значками: свежий справа. */
export function formStrip(f: TeamForm | null): StripGame[] | null {
  return f
    ? f.games
        .slice(0, 5)
        .reverse()
        .map((g) => ({ id: g.id, date: formatDayShort(g.ts), opponent: g.opponent.name, score: `${g.gf}:${g.ga}`, home: g.isHome, result: g.result }))
    : null
}
