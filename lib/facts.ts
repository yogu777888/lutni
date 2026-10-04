/**
 * Факты до начала матча для «Главных матчей» — конкретные цифры с выборкой, без оценок и обещаний:
 * «Хозяева забивали в 9 из 10 последних домашних матчей», «Фонбет: кэф на победу гостей снизился
 * с 2.40 до 1.97 с открытия линии до 19:25». Только из сыгранных матчей и линии одного букмекера;
 * выборка меньше пяти матчей (личных встреч — четырёх) — не факт. Сила (`w`) — чтобы взять два самых заметных.
 */
import { periodText, type LineMove } from './lines'
import type { FormGame, H2H, TeamForm } from './stats'

export type Fact = { text: string; w: number; topic: string }

const MIN_GAMES = 5
const MIN_H2H = 4

type Who = 'Хозяева' | 'Гости'

/** Факты одной команды по её домашним (у хозяев) или выездным (у гостей) матчам. */
function sideFacts(who: Who, games: FormGame[]): Fact[] {
  const n = games.length
  if (n < MIN_GAMES) return []
  const where = who === 'Хозяева' ? 'домашних' : 'выездных'
  const last = `${n} последних ${where} матчей`
  const count = (f: (g: FormGame) => boolean) => games.filter(f).length
  const scored = count((g) => g.gf > 0)
  const conceded = count((g) => g.ga > 0)
  const wins = count((g) => g.result === 'W')
  const losses = count((g) => g.result === 'L')
  const goals3 = count((g) => g.gf + g.ga >= 3)
  const out: Fact[] = []
  const add = (text: string, w: number, topic: string) => out.push({ text, w: w + n / 200, topic: `${who}:${topic}` })

  if (scored / n >= 0.8) add(`${who} забивали в ${scored} из ${last}`, scored / n, 'attack')
  else if ((n - scored) / n >= 0.5) add(`${who} не забили в ${n - scored} из ${last}`, (n - scored) / n + 0.05, 'attack')

  if (conceded / n >= 0.8) add(`${who} пропускали в ${conceded} из ${last}`, conceded / n - 0.02, 'defence')
  else if ((n - conceded) / n >= 0.5) add(`${who} не пропустили в ${n - conceded} из ${last}`, (n - conceded) / n + 0.05, 'defence')

  if (losses === 0) add(`${who} не проиграли ни одного из ${last}`, 0.95, 'results')
  else if (wins === 0) add(`${who} не выиграли ни одного из ${last}`, 0.95, 'results')
  else if (wins / n >= 0.7) add(`${who} выиграли ${wins} из ${last}`, wins / n + 0.03, 'results')

  if (goals3 / n >= 0.7) add(`В ${goals3} из ${last} ${who === 'Хозяева' ? 'хозяев' : 'гостей'} было 3+ голов`, goals3 / n - 0.03, 'goals')
  return out
}

function h2hFacts(h2h: H2H | null): Fact[] {
  const n = h2h?.games.length ?? 0
  if (!h2h || n < MIN_H2H) return []
  const last = `${n} последних личных встреч`
  const out: Fact[] = []
  if (h2h.homeWins / n >= 0.75) out.push({ text: `Хозяева выиграли ${h2h.homeWins} из ${last}`, w: h2h.homeWins / n, topic: 'h2h' })
  else if (h2h.awayWins / n >= 0.75) out.push({ text: `Гости выиграли ${h2h.awayWins} из ${last}`, w: h2h.awayWins / n, topic: 'h2h' })
  const goals3 = Math.round(h2h.over25Rate * n)
  if (goals3 / n >= 0.75) out.push({ text: `В ${goals3} из ${last} было 3+ голов`, w: goals3 / n - 0.05, topic: 'h2h-goals' })
  return out
}

/** Факты о командах: хозяева — по домашним матчам, гости — по выездным, и личные встречи. Сильнейшие первыми. */
export function teamFacts(input: { homeForm: TeamForm | null; awayForm: TeamForm | null; h2h: H2H | null }): Fact[] {
  return [
    ...sideFacts('Хозяева', input.homeForm?.homeGames ?? []),
    ...sideFacts('Гости', input.awayForm?.awayGames ?? []),
    ...h2hFacts(input.h2h),
  ].sort((a, b) => b.w - a.w)
}

const MOVE_WHAT: Record<string, string> = { home: 'на победу хозяев', draw: 'на ничью', away: 'на победу гостей' }

/** Движение линии словами: «Фонбет: кэф на победу гостей снизился с 2.40 до 1.97 с открытия линии до 19:25». */
export function lineFact(mv: LineMove | null, kickoff: number): Fact | null {
  const what = mv ? MOVE_WHAT[mv.key] : undefined
  if (!mv || !what) return null
  const dir = mv.change < 0 ? 'снизился' : 'вырос'
  return {
    text: `${mv.bookmaker}: кэф ${what} ${dir} с ${mv.from.toFixed(2)} до ${mv.to.toFixed(2)} ${periodText(mv.at, kickoff)}`,
    w: 0.8 + Math.abs(mv.change),
    topic: 'line',
  }
}

/**
 * Два факта для карточки: если линия заметно сдвинулась — самый сильный факт о командах и движение линии,
 * иначе два сильнейших о командах с разными темами (не «забивали» и «не пропускали» одной команды подряд).
 */
export function pickFacts(team: Fact[], line: Fact | null, limit = 2): string[] {
  const out: Fact[] = []
  for (const f of team) {
    if (out.length >= (line ? limit - 1 : limit)) break
    if (out.some((o) => o.topic === f.topic || o.topic.split(':')[0] === f.topic.split(':')[0])) continue
    out.push(f)
  }
  // одна команда два раза — только если о второй сказать нечего
  if (out.length < (line ? limit - 1 : limit)) for (const f of team) if (!out.includes(f) && out.length < (line ? limit - 1 : limit)) out.push(f)
  if (line) out.push(line)
  return out.slice(0, limit).map((f) => f.text)
}
