/**
 * Блоки ставок на странице матча (вкладка «Ставки»): у каждого исхода — как часто он случался в прошлых матчах команд,
 * как часто — в этом турнире за сезон, и кэфы партнёров кнопками (владелец: «для каждого исхода свой блок где будем
 * показывать сколько ожидается на основании прошлых матчей, сколько в среднем по матчам в этой лиге и кнопку с кэфом»).
 * Только факты из прошлых игр — без модели: «в 6 из 10», а не «шанс».
 */
import type { FormGame, TeamForm } from './stats'
import type { Match } from './types'

/** Доля и выборка: «4 из 9». */
export type Rate = { hit: number; of: number }

export type BetOutcome = {
  /** ключ кандидата модели — по нему кэфы и «выгодно» (home, draw, away, hd, da, ha, over1.5…under3.5, bttsYes, bttsNo) */
  key: string
  /** прошлые матчи команд; выборка меньше 3 — null */
  past: Rate | null
  /** турнир за сезон; меньше 20 сыгранных — null */
  league: Rate | null
}

export type BetMarket = { key: 'x12' | 'dc' | 'goals' | 'btts'; outcomes: BetOutcome[] }

/** Прошлые матчи меньше этого — доли не показываем (1 из 2 — не статистика). */
const PAST_MIN = 3
/** Сыгранных матчей турнира меньше этого — «в лиге» не показываем. */
export const LEAGUE_MIN = 20

const sum = (a: Rate | null, b: Rate | null): Rate | null => {
  const parts = [a, b].filter((r): r is Rate => Boolean(r && r.of >= PAST_MIN))
  return parts.length ? { hit: parts.reduce((s, r) => s + r.hit, 0), of: parts.reduce((s, r) => s + r.of, 0) } : null
}
const count = (list: FormGame[] | undefined, f: (g: FormGame) => boolean): Rate | null =>
  list && list.length ? { hit: list.filter(f).length, of: list.length } : null

export const pct = (r: Rate) => Math.round((r.hit / r.of) * 100)

/**
 * `homeForm` — форма хозяев, `awayForm` — гостей (`buildForm`), `season` — матчи турнира за сезон (`getSeasonGames`).
 * Исход: хозяева — в их домашних матчах, гости — в их выездных, обе выборки вместе («победа хозяев» — победы хозяев дома
 * и поражения гостей в гостях). Голы и «обе забьют» — последние матчи обеих команд, где бы ни играли.
 */
/** Сыгранные матчи турнира до этого матча — выборка «в лиге». */
export const playedBefore = (m: Match, season: Match[]) =>
  season.filter((g) => g.id !== m.id && g.ts < m.ts && g.status === 'finished' && (g.scoreFT ?? g.score))

export function betMarkets(m: Match, homeForm: TeamForm | null, awayForm: TeamForm | null, season: Match[]): BetMarket[] {
  const hg = homeForm?.homeGames
  const ag = awayForm?.awayGames
  const played = playedBefore(m, season)
  const lg = (f: (h: number, a: number) => boolean): Rate | null => {
    if (played.length < LEAGUE_MIN) return null
    const hit = played.filter((g) => {
      const s = (g.scoreFT ?? g.score)!
      return f(s.home, s.away)
    }).length
    return { hit, of: played.length }
  }
  const all = (f: (g: FormGame) => boolean) => sum(count(homeForm?.games, f), count(awayForm?.games, f))

  const x = (f: (g: FormGame) => boolean, h: (g: FormGame) => boolean) => sum(count(hg, f), count(ag, h))
  const goals = (line: number): BetMarket => ({
    key: 'goals',
    outcomes: [
      { key: `over${line}`, past: all((g) => g.gf + g.ga > line), league: lg((h, a) => h + a > line) },
      { key: `under${line}`, past: all((g) => g.gf + g.ga < line), league: lg((h, a) => h + a < line) },
    ],
  })

  // порядок — порядок карточек: первые шесть видны сразу (исход, «3 гола», «обе забьют»), остальное — под
  // «Показать больше исходов» (владелец: «сколько всего исходов чтоб полностью продублировать исходы у букмекера» — «да»)
  return [
    {
      key: 'x12',
      outcomes: [
        { key: 'home', past: sum(count(hg, (g) => g.result === 'W'), count(ag, (g) => g.result === 'L')), league: lg((h, a) => h > a) },
        { key: 'draw', past: sum(count(hg, (g) => g.result === 'D'), count(ag, (g) => g.result === 'D')), league: lg((h, a) => h === a) },
        { key: 'away', past: sum(count(hg, (g) => g.result === 'L'), count(ag, (g) => g.result === 'W')), league: lg((h, a) => h < a) },
      ],
    },
    goals(2.5),
    {
      key: 'btts',
      outcomes: [
        { key: 'bttsYes', past: all((g) => g.gf > 0 && g.ga > 0), league: lg((h, a) => h > 0 && a > 0) },
        { key: 'bttsNo', past: all((g) => !(g.gf > 0 && g.ga > 0)), league: lg((h, a) => !(h > 0 && a > 0)) },
      ],
    },
    {
      key: 'dc',
      outcomes: [
        { key: 'hd', past: x((g) => g.result !== 'L', (g) => g.result !== 'W'), league: lg((h, a) => h >= a) },
        { key: 'da', past: x((g) => g.result !== 'W', (g) => g.result !== 'L'), league: lg((h, a) => h <= a) },
        { key: 'ha', past: x((g) => g.result !== 'D', (g) => g.result !== 'D'), league: lg((h, a) => h !== a) },
      ],
    },
    goals(1.5),
    goals(3.5),
  ]
}
