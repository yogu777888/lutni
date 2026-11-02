/**
 * «Разбор исходов» во вкладке «Ставки»: у каждого исхода — шанс по кэфам без маржи и статистика прошлых игр по теме исхода;
 * строка с заметным перевесом помечена «за» или «против» (владелец: «на странице ставки сделать чтото типа прогноза только
 * разбор каждого исхода? почему такая оценка, какая статистика»). Только факты с выборкой («4 из 10»), без причин и обещаний;
 * названия — в именительном, без глаголов прошедшего времени (род у названий разный).
 */
import { plural } from './format'
import type { FormGame, H2H, TeamForm } from './stats'
import type { Injury, Match, Standings } from './types'

export type OutcomeKey = 'home' | 'draw' | 'away' | 'over2.5' | 'under2.5' | 'bttsYes' | 'bttsNo'
export type Tone = 'pro' | 'con' | 'neutral'
export type NoteLine = { text: string; tone: Tone }

export type OutcomeNote = {
  key: OutcomeKey
  /** шанс по кэфам без маржи, 0–1; нет линии — null */
  chance: number | null
  lines: NoteLine[]
}

export type OutcomeInput = {
  match: Match
  /** шансы исходов по кэфам без маржи */
  x12: { home: number; draw: number; away: number } | null
  over25: number | null
  btts: number | null
  homeForm: TeamForm | null
  awayForm: TeamForm | null
  h2h: H2H | null
  injuries: Injury[]
  standings: Standings | null
}

const q = (s: string) => `«${s}»`
const dec = (x: number) => x.toFixed(1).replace('.', ',')
const wins = (n: number) => `${n} ${plural(n, ['победа', 'победы', 'побед'])}`
const draws = (n: number) => `${n} ${plural(n, ['ничья', 'ничьи', 'ничьих'])}`
const losses = (n: number) => `${n} ${plural(n, ['поражение', 'поражения', 'поражений'])}`
const flip = (t: Tone): Tone => (t === 'pro' ? 'con' : t === 'con' ? 'pro' : 'neutral')
/** тон «за первый вариант пары»: выше `hi` — за, ниже `lo` — против */
const toneOf = (v: number, hi: number, lo: number): Tone => (v >= hi ? 'pro' : v <= lo ? 'con' : 'neutral')
const MIN = 4

type Line = { text: string; tone: Tone }
const count = (g: FormGame[], r: FormGame['result']) => g.filter((x) => x.result === r).length
/** «3 победы, 1 ничья, 4 поражения в последних 8 матчах» */
const record = (g: FormGame[]) =>
  `${[wins(count(g, 'W')), draws(count(g, 'D')), losses(count(g, 'L'))].join(', ')} в последних ${g.length} ${plural(g.length, ['матче', 'матчах', 'матчах'])}`

/** Строки «за победу хозяев»: у победы гостей — те же с обратным тоном. */
function resultLines(i: OutcomeInput): Line[] {
  const { match: m, homeForm: hf, awayForm: af } = i
  const H = q(m.home.name)
  const A = q(m.away.name)
  const out: Line[] = []
  const hg = hf?.homeGames ?? []
  if (hg.length >= MIN) {
    const w = count(hg, 'W') / hg.length
    const l = count(hg, 'L') / hg.length
    out.push({ text: `${H} дома: ${record(hg)}.`, tone: w >= 0.5 ? 'pro' : l >= 0.5 ? 'con' : 'neutral' })
  }
  const ag = af?.awayGames ?? []
  if (ag.length >= MIN) {
    const w = count(ag, 'W') / ag.length
    const l = count(ag, 'L') / ag.length
    out.push({ text: `${A} в гостях: ${record(ag)}.`, tone: l >= 0.5 ? 'pro' : w >= 0.5 ? 'con' : 'neutral' })
  }
  if (hf && af && hf.games.length >= 5 && af.games.length >= 5)
    out.push({ text: `Очки за последние 5 матчей: ${H} — ${hf.points5}, ${A} — ${af.points5}.`, tone: toneOf(hf.points5 - af.points5, 3, -3) })
  const rows = i.standings?.groups.flatMap((g) => g.rows) ?? []
  const rh = rows.find((x) => x.teamId === m.home.id)
  const ra = rows.find((x) => x.teamId === m.away.id)
  if (rh && ra && rh.played >= 3 && ra.played >= 3)
    out.push({ text: `Место в таблице: ${H} — ${rh.rank}-е, ${A} — ${ra.rank}-е.`, tone: toneOf(ra.rank - rh.rank, 5, -5) })
  const h2 = i.h2h
  if (h2 && h2.games.length >= 3) {
    const n = h2.games.length
    out.push({
      text: `Личные встречи, последние ${n}: ${wins(h2.homeWins)} ${H}, ${draws(h2.draws)}, ${wins(h2.awayWins)} ${A}.`,
      tone: h2.homeWins / n >= 0.6 ? 'pro' : h2.awayWins / n >= 0.6 ? 'con' : 'neutral',
    })
  }
  const inj = (id: number) => i.injuries.filter((x) => x.teamId === id).length
  const ih = inj(m.home.id)
  const ia = inj(m.away.id)
  if (ih + ia >= 3) {
    const pl = (n: number) => `${n} ${plural(n, ['игрок', 'игрока', 'игроков'])}`
    out.push({ text: `Не сыграют: у ${H} — ${pl(ih)}, у ${A} — ${pl(ia)}.`, tone: toneOf(ia - ih, 2, -2) })
  }
  return out
}

function drawLines(i: OutcomeInput): Line[] {
  const { match: m, homeForm: hf, awayForm: af } = i
  const H = q(m.home.name)
  const A = q(m.away.name)
  const out: Line[] = []
  const hg = hf?.homeGames ?? []
  const ag = af?.awayGames ?? []
  if (hg.length >= MIN && ag.length >= MIN) {
    const dh = count(hg, 'D')
    const da = count(ag, 'D')
    out.push({
      text: `Ничьи: ${H} дома — ${dh} из ${hg.length}, ${A} в гостях — ${da} из ${ag.length}.`,
      tone: toneOf((dh + da) / (hg.length + ag.length), 0.33, 0.15),
    })
  }
  if (hf && af && hf.games.length >= 5 && af.games.length >= 5) {
    const gap = Math.abs(hf.points5 - af.points5)
    out.push({ text: `Очки за последние 5 матчей: ${H} — ${hf.points5}, ${A} — ${af.points5}.`, tone: gap <= 2 ? 'pro' : gap >= 5 ? 'con' : 'neutral' })
  }
  const rows = i.standings?.groups.flatMap((g) => g.rows) ?? []
  const rh = rows.find((x) => x.teamId === m.home.id)
  const ra = rows.find((x) => x.teamId === m.away.id)
  if (rh && ra && rh.played >= 3 && ra.played >= 3) {
    const gap = Math.abs(rh.rank - ra.rank)
    out.push({ text: `Место в таблице: ${H} — ${rh.rank}-е, ${A} — ${ra.rank}-е.`, tone: gap <= 3 ? 'pro' : gap >= 8 ? 'con' : 'neutral' })
  }
  const h2 = i.h2h
  if (h2 && h2.games.length >= 3)
    out.push({ text: `Личные встречи, последние ${h2.games.length}: ${draws(h2.draws)}.`, tone: toneOf(h2.draws / h2.games.length, 0.4, 0.1) })
  return out
}

/** Строки «за 3 гола и больше»: у «не больше 2» — те же с обратным тоном. */
function overLines(i: OutcomeInput): Line[] {
  const { match: m, homeForm: hf, awayForm: af } = i
  const H = q(m.home.name)
  const A = q(m.away.name)
  const out: Line[] = []
  if (hf && af && hf.games.length >= 5 && af.games.length >= 5) {
    const th = hf.gfAvg + hf.gaAvg
    const ta = af.gfAvg + af.gaAvg
    out.push({ text: `Голов за матч в последних играх: ${H} — ${dec(th)}, ${A} — ${dec(ta)}.`, tone: toneOf((th + ta) / 2, 2.9, 2.2) })
    const oh = Math.round(hf.over25Rate * hf.games.length)
    const oa = Math.round(af.over25Rate * af.games.length)
    out.push({
      text: `3 гола и больше: ${H} — в ${oh} из ${hf.games.length}, ${A} — в ${oa} из ${af.games.length}.`,
      tone: toneOf((hf.over25Rate + af.over25Rate) / 2, 0.6, 0.4),
    })
    out.push({ text: `Забивает за игру: ${H} — ${dec(hf.gfAvg)}, ${A} — ${dec(af.gfAvg)}.`, tone: toneOf(hf.gfAvg + af.gfAvg, 3.2, 2) })
  }
  const h2 = i.h2h
  if (h2 && h2.games.length >= 3)
    out.push({ text: `Личные встречи, последние ${h2.games.length}: в среднем ${dec(h2.avgGoals)} гола.`, tone: toneOf(h2.avgGoals, 3, 2) })
  return out
}

/** Строки «за обе забьют»: у «кто-то не забьёт» — те же с обратным тоном. */
function bttsLines(i: OutcomeInput): Line[] {
  const { match: m, homeForm: hf, awayForm: af } = i
  const H = q(m.home.name)
  const A = q(m.away.name)
  const out: Line[] = []
  if (hf && af && hf.games.length >= 5 && af.games.length >= 5) {
    const nh = hf.games.length
    const na = af.games.length
    const r = (x: number, n: number) => Math.round(x * n)
    out.push({
      text: `Обе забивали: ${H} — в ${r(hf.bttsRate, nh)} из ${nh}, ${A} — в ${r(af.bttsRate, na)} из ${na}.`,
      tone: toneOf((hf.bttsRate + af.bttsRate) / 2, 0.6, 0.4),
    })
    out.push({
      text: `Без забитых голов: ${H} — в ${r(hf.failedToScoreRate, nh)} из ${nh}, ${A} — в ${r(af.failedToScoreRate, na)} из ${na}.`,
      tone: toneOf(-Math.max(hf.failedToScoreRate, af.failedToScoreRate), -0.15, -0.4),
    })
    out.push({
      text: `На ноль: ${H} — в ${r(hf.cleanSheetRate, nh)} из ${nh}, ${A} — в ${r(af.cleanSheetRate, na)} из ${na}.`,
      tone: toneOf(-Math.max(hf.cleanSheetRate, af.cleanSheetRate), -0.15, -0.4),
    })
  }
  const h2 = i.h2h
  if (h2 && h2.games.length >= 3) {
    const n = h2.games.length
    out.push({ text: `Личные встречи, последние ${n}: обе забивали в ${Math.round(h2.bttsRate * n)} из ${n}.`, tone: toneOf(h2.bttsRate, 0.65, 0.35) })
  }
  return out
}

export function outcomeNotes(i: OutcomeInput): OutcomeNote[] {
  const res = resultLines(i)
  const over = overLines(i)
  const btts = bttsLines(i)
  const inv = (l: Line[]) => l.map((x) => ({ ...x, tone: flip(x.tone) }))
  const x = i.x12
  const o = i.over25
  const b = i.btts
  return [
    { key: 'home', chance: x?.home ?? null, lines: res },
    { key: 'draw', chance: x?.draw ?? null, lines: drawLines(i) },
    { key: 'away', chance: x?.away ?? null, lines: inv(res) },
    { key: 'over2.5', chance: o, lines: over },
    { key: 'under2.5', chance: o == null ? null : 1 - o, lines: inv(over) },
    { key: 'bttsYes', chance: b, lines: btts },
    { key: 'bttsNo', chance: b == null ? null : 1 - b, lines: inv(btts) },
  ]
}
