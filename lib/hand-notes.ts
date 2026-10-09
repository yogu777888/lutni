/**
 * Приписки «от руки» над командами в «Главных матчах»: у каждой команды — один самый яркий факт до этого матча
 * («лидер», «4 победы подряд», «лучшая атака»…). Только факты из таблицы и прошедших матчей, без прогнозов;
 * нечего сказать — без приписки. Текст короткий: он пишется рукописным шрифтом над эмблемой.
 */
import { pluralN } from './format'
import type { TeamForm } from './stats'
import type { Standings, StandingRow } from './types'

export type HandNotes = { home: string | null; away: string | null }

type Note = { text: string; score: number }

/** Строка команды в таблице и её группа (у турниров с группами лучшая атака — внутри группы). */
function rowOf(st: Standings | null, teamId: number): { row: StandingRow; rows: StandingRow[] } | null {
  for (const g of st?.groups ?? []) {
    const row = g.rows.find((r) => r.teamId === teamId)
    if (row) return { row, rows: g.rows }
  }
  return null
}

function candidates(teamId: number, isHome: boolean, st: Standings | null, form: TeamForm | null): Note[] {
  const out: Note[] = []
  const t = rowOf(st, teamId)
  // таблица после 1–2 туров ничего не значит
  if (t && t.row.played >= 3) {
    const { row, rows } = t
    if (row.rank === 1) out.push({ text: 'лидер', score: 100 })
    else if (row.rank <= 3) out.push({ text: `${row.rank}-е место`, score: 40 })
    const most = Math.max(...rows.map((r) => r.goalsFor))
    const least = Math.min(...rows.map((r) => r.goalsAgainst))
    if (row.goalsFor === most && rows.filter((r) => r.goalsFor === most).length === 1) out.push({ text: 'лучшая атака', score: 75 })
    if (row.goalsAgainst === least && rows.filter((r) => r.goalsAgainst === least).length === 1)
      out.push({ text: 'лучшая защита', score: 74 })
    if (row.zone === 'Зона вылета') out.push({ text: 'в зоне вылета', score: 50 })
  }
  const s = form?.streak
  if (s?.kind === 'W' && s.len >= 3) out.push({ text: `${pluralN(s.len, ['победа', 'победы', 'побед'])} подряд`, score: 90 })
  if (s?.kind === 'unbeaten' && s.len >= 5) out.push({ text: `${pluralN(s.len, ['матч', 'матча', 'матчей'])} без поражений`, score: 80 })
  if (s?.kind === 'L' && s.len >= 3) out.push({ text: `${pluralN(s.len, ['поражение', 'поражения', 'поражений'])} подряд`, score: 70 })
  if (s?.kind === 'winless' && s.len >= 5) out.push({ text: `${pluralN(s.len, ['матч', 'матча', 'матчей'])} без побед`, score: 60 })
  if (isHome && form && form.home.unbeatenRun >= 5 && form.home.unbeatenRun === Math.min(8, form.home.played))
    out.push({ text: 'дома не проигрывает', score: 65 })
  return out
}

/** Сравнение соперников по голам за последние матчи — когда ярких фактов нет (разница от 0,6 гола за матч). */
function versus(a: TeamForm | null, b: TeamForm | null): Note | null {
  if (!a || !b || a.games.length < 5 || b.games.length < 5) return null
  if (a.gfAvg - b.gfAvg >= 0.6) return { text: 'забивает больше', score: 30 }
  if (b.gaAvg - a.gaAvg >= 0.6) return { text: 'пропускает меньше', score: 29 }
  return null
}

export function handNotes(input: {
  homeId: number
  awayId: number
  standings: Standings | null
  homeForm: TeamForm | null
  awayForm: TeamForm | null
}): HandNotes {
  const { homeId, awayId, standings, homeForm, awayForm } = input
  const best = (list: (Note | null)[], not?: string | null) =>
    list.filter((n): n is Note => !!n && n.text !== not).sort((x, y) => y.score - x.score)[0]?.text ?? null
  const home = best([...candidates(homeId, true, standings, homeForm), versus(homeForm, awayForm)])
  // одинаковая приписка над обеими командами ничего не говорит — у гостей тогда следующий факт
  const away = best([...candidates(awayId, false, standings, awayForm), versus(awayForm, homeForm)], home)
  return { home, away }
}
