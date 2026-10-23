/**
 * «Сильное и слабое место» (владелец прислал прототип ChatGPT со «Слабым местом» по xG за 5 матчей — «да» на сбор
 * истории xG): xG прошлых матчей берём из полных карточек матчей (`/Games/{id}`, в `/Games/list` статистики нет) —
 * `getTeamXg` в `lib/data.ts`; здесь только расчёт. Нет xG хотя бы в 3 матчах — считаем по голам из формы.
 * Только заметное: средняя команда не получает ни сильного, ни слабого места. Названия — в именительном, глаголы —
 * в настоящем времени (род у названий разный).
 */
import type { TeamForm } from './stats'

export type GameXg = { id: number; xgFor: number; xgAgainst: number; gf: number; ga: number }
export type TeamXg = { n: number; xgFor: number; xgAgainst: number; gf: number; ga: number }
/** `key` — какая это сторона игры: по ней «Главное» идущего матча сверяет сегодняшние цифры (`historyNotes` в lib/match-notes.ts). */
export type PointKey = 'attack+' | 'attack-' | 'defense+' | 'defense-' | 'finish+' | 'finish-' | 'goals'
/** `xg` — средние за последние матчи: по ним «Главное» пишет «сегодня — в последних 5 матчах» своими словами */
export type Point = { key: PointKey; title: string; text: string; xg?: TeamXg }
export type TeamPoints = { strong: Point | null; weak: Point | null; byXg: boolean }

const dec = (v: number, d = 1) => v.toFixed(d).replace('.', ',')
const per = (v: number) => `${dec(v)} за игру`
// «В последних 3 матчах» / «В последнем матче» не бывает: n ≥ 3
export const lastN = (n: number) => `В последних ${n} ${n % 10 === 1 && n % 100 !== 11 ? 'матче' : 'матчах'}`

export function teamXg(games: GameXg[]): TeamXg | null {
  if (games.length < 3) return null
  const n = games.length
  const avg = (f: (g: GameXg) => number) => games.reduce((a, g) => a + f(g), 0) / n
  return { n, xgFor: avg((g) => g.xgFor), xgAgainst: avg((g) => g.xgAgainst), gf: avg((g) => g.gf), ga: avg((g) => g.ga) }
}

type Cand = Point & { w: number }

/** Кандидаты по xG: создаёт / не создаёт моменты, реализация, сколько моментов отдаёт сопернику. */
function byXg(x: TeamXg): { strong: Cand[]; weak: Cand[] } {
  const strong: Cand[] = []
  const weak: Cand[] = []
  const last = lastN(x.n)
  if (x.xgFor >= 1.7) strong.push({ w: (x.xgFor - 1.7) / 0.5 + 1, key: 'attack+', title: 'Создаёт много моментов', text: `${last} — в среднем xG\u00a0${dec(x.xgFor)} за игру.` })
  if (x.xgFor <= 0.9) weak.push({ w: (0.9 - x.xgFor) / 0.3 + 1, key: 'attack-', title: 'Мало моментов у чужих ворот', text: `${last} — в среднем xG\u00a0${dec(x.xgFor)} за игру.` })
  if (x.xgAgainst <= 0.9) strong.push({ w: (0.9 - x.xgAgainst) / 0.3 + 1, key: 'defense+', title: 'Почти не даёт бить', text: `${last} у соперников в среднем xG\u00a0${dec(x.xgAgainst)} за игру.` })
  if (x.xgAgainst >= 1.6) weak.push({ w: (x.xgAgainst - 1.6) / 0.4 + 1, key: 'defense-', title: 'Отдаёт много моментов', text: `${last} у соперников в среднем xG\u00a0${dec(x.xgAgainst)} за игру.` })
  const fin = x.gf - x.xgFor
  if (fin >= 0.4) strong.push({ w: fin / 0.4, key: 'finish+', title: 'Реализует лучше ожидаемого', text: `${last} забивает ${per(x.gf)} при xG\u00a0${dec(x.xgFor)}.` })
  if (fin <= -0.4) weak.push({ w: -fin / 0.4, key: 'finish-', title: 'Не реализует моменты', text: x.gf < 0.05 ? `${last} ни одного гола, хотя xG\u00a0— ${dec(x.xgFor)} за игру.` : `${last} забивает ${per(x.gf)} при xG\u00a0${dec(x.xgFor)}.` })
  for (const c of [...strong, ...weak]) c.xg = x
  return { strong, weak }
}

/** Без xG — по голам из формы (до 10 матчей). */
function byGoals(f: TeamForm): { strong: Cand[]; weak: Cand[] } {
  const strong: Cand[] = []
  const weak: Cand[] = []
  const n = f.games.length
  if (n < 5) return { strong, weak }
  const last = lastN(n)
  if (f.gfAvg >= 2) strong.push({ w: f.gfAvg / 2, key: 'goals', title: 'Много забивает', text: `${last} забивает ${per(f.gfAvg)}.` })
  if (f.gaAvg <= 0.8) strong.push({ w: 1 + (0.8 - f.gaAvg), key: 'goals', title: 'Надёжная оборона', text: `${last} пропускает ${per(f.gaAvg)}.` })
  const clean = Math.round(f.cleanSheetRate * n)
  if (f.cleanSheetRate >= 0.5) strong.push({ w: f.cleanSheetRate * 2, key: 'goals', title: 'Часто играет на ноль', text: `«Сухих» матчей — ${clean} из ${n}.` })
  if (f.gaAvg >= 1.8) weak.push({ w: f.gaAvg / 1.8, key: 'goals', title: 'Много пропускает', text: `${last} пропускает ${per(f.gaAvg)}.` })
  const dry = Math.round(f.failedToScoreRate * n)
  if (f.failedToScoreRate >= 0.4) weak.push({ w: f.failedToScoreRate * 2.5, key: 'goals', title: 'Часто не забивает', text: `Без гола — в ${dry} из ${n} матчей.` })
  return { strong, weak }
}

const best = (xs: Cand[]): Point | null => {
  const top = [...xs].sort((a, b) => b.w - a.w)[0]
  return top ? { key: top.key, title: top.title, text: top.text, xg: top.xg } : null
}

export function teamPoints(xg: TeamXg | null, form: TeamForm | null): TeamPoints {
  const c = xg ? byXg(xg) : form ? byGoals(form) : { strong: [], weak: [] }
  return { strong: best(c.strong), weak: best(c.weak), byXg: Boolean(xg) }
}
