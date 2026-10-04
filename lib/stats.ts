/** Форма команд и личные встречи — считаем сами по списку прошедших матчей. */
import type { Match, Score, Team } from './types'

export type Res = 'W' | 'D' | 'L'

export type FormGame = {
  id: number
  ts: number
  opponent: Team
  isHome: boolean
  gf: number
  ga: number
  result: Res
  league: string
}

export type Record4 = { played: number; wins: number; draws: number; losses: number }

export type TeamForm = {
  teamId: number
  games: FormGame[]
  last5: Res[]
  points5: number
  gfAvg: number
  gaAvg: number
  over25Rate: number
  bttsRate: number
  cleanSheetRate: number
  failedToScoreRate: number
  streak: { kind: 'W' | 'L' | 'unbeaten' | 'winless'; len: number } | null
  home: Record4 & { unbeatenRun: number }
  away: Record4
  /** последние домашние и выездные матчи (до 10, свежие первыми) — для фактов с выборкой: «в 9 из 10 домашних» */
  homeGames: FormGame[]
  awayGames: FormGame[]
}

const finalScore = (m: Match): Score | null => m.scoreFT ?? (m.status === 'finished' ? m.score : null)

export function buildForm(teamId: number, matches: Match[], limit = 10): TeamForm | null {
  const games: FormGame[] = []
  const sorted = [...matches].sort((a, b) => b.ts - a.ts)
  for (const m of sorted) {
    if (m.status !== 'finished') continue
    const s = finalScore(m)
    if (!s) continue
    const isHome = m.home.id === teamId
    if (!isHome && m.away.id !== teamId) continue
    const gf = isHome ? s.home : s.away
    const ga = isHome ? s.away : s.home
    games.push({
      id: m.id,
      ts: m.ts,
      opponent: isHome ? m.away : m.home,
      isHome,
      gf,
      ga,
      result: gf > ga ? 'W' : gf < ga ? 'L' : 'D',
      league: m.league.name,
    })
  }
  if (!games.length) return null
  const recent = games.slice(0, limit)
  const n = recent.length
  const last5 = recent.slice(0, 5).map((g) => g.result)
  const rate = (f: (g: FormGame) => boolean) => recent.filter(f).length / n

  let streak: TeamForm['streak'] = null
  const run = (pred: (r: Res) => boolean) => {
    let len = 0
    for (const g of games) {
      if (!pred(g.result)) break
      len++
    }
    return len
  }
  const w = run((r) => r === 'W')
  const l = run((r) => r === 'L')
  const unbeaten = run((r) => r !== 'L')
  const winless = run((r) => r !== 'W')
  if (w >= 2) streak = { kind: 'W', len: w }
  else if (l >= 2) streak = { kind: 'L', len: l }
  else if (unbeaten >= 4) streak = { kind: 'unbeaten', len: unbeaten }
  else if (winless >= 4) streak = { kind: 'winless', len: winless }

  const rec = (list: FormGame[]): Record4 => ({
    played: list.length,
    wins: list.filter((g) => g.result === 'W').length,
    draws: list.filter((g) => g.result === 'D').length,
    losses: list.filter((g) => g.result === 'L').length,
  })
  const homeGames = games.filter((g) => g.isHome).slice(0, 8)
  let unbeatenRun = 0
  for (const g of homeGames) {
    if (g.result === 'L') break
    unbeatenRun++
  }

  return {
    teamId,
    games: recent,
    last5,
    points5: last5.reduce((s, r) => s + (r === 'W' ? 3 : r === 'D' ? 1 : 0), 0),
    gfAvg: recent.reduce((s, g) => s + g.gf, 0) / n,
    gaAvg: recent.reduce((s, g) => s + g.ga, 0) / n,
    over25Rate: rate((g) => g.gf + g.ga > 2.5),
    bttsRate: rate((g) => g.gf > 0 && g.ga > 0),
    cleanSheetRate: rate((g) => g.ga === 0),
    failedToScoreRate: rate((g) => g.gf === 0),
    streak,
    home: { ...rec(homeGames), unbeatenRun },
    away: rec(games.filter((g) => !g.isHome).slice(0, 8)),
    homeGames: games.filter((g) => g.isHome).slice(0, 10),
    awayGames: games.filter((g) => !g.isHome).slice(0, 10),
  }
}

export type H2HGame = { id: number; ts: number; home: Team; away: Team; score: Score; league: string }

export type H2H = {
  games: H2HGame[]
  /** Победы команды, которая в текущем матче — хозяин. */
  homeWins: number
  draws: number
  awayWins: number
  avgGoals: number
  over25Rate: number
  bttsRate: number
}

export function buildH2H(homeId: number, awayId: number, matches: Match[], limit = 8): H2H | null {
  const games: H2HGame[] = []
  for (const m of [...matches].sort((a, b) => b.ts - a.ts)) {
    const s = finalScore(m)
    if (m.status !== 'finished' || !s) continue
    const ids = [m.home.id, m.away.id]
    if (!ids.includes(homeId) || !ids.includes(awayId)) continue
    games.push({ id: m.id, ts: m.ts, home: m.home, away: m.away, score: s, league: m.league.name })
    if (games.length >= limit) break
  }
  if (!games.length) return null
  let homeWins = 0
  let draws = 0
  let awayWins = 0
  for (const g of games) {
    const hs = g.home.id === homeId ? g.score.home : g.score.away
    const as = g.home.id === homeId ? g.score.away : g.score.home
    if (hs > as) homeWins++
    else if (hs < as) awayWins++
    else draws++
  }
  const n = games.length
  return {
    games,
    homeWins,
    draws,
    awayWins,
    avgGoals: games.reduce((s, g) => s + g.score.home + g.score.away, 0) / n,
    over25Rate: games.filter((g) => g.score.home + g.score.away > 2.5).length / n,
    bttsRate: games.filter((g) => g.score.home > 0 && g.score.away > 0).length / n,
  }
}
