import { describe, expect, it } from 'vitest'
import { matchNotes, momentumSummary } from '../lib/match-notes'
import type { MatchEvent, StatPair } from '../lib/types'

const st = (key: string, home: number, away: number): StatPair => ({ key, label: key, home, away })
const base = { home: 'Арсенал', away: 'Челси', events: [] as MatchEvent[], momentum: null, live: true }

describe('«Главное» словами', () => {
  it('опаснее по моментам, но уступает — первым', () => {
    const n = matchNotes({ ...base, score: { home: 2, away: 1 }, stats: [st('expectedGoals', 0.78, 1.89), st('totalShots', 8, 15)] })
    expect(n[0].title).toBe('«Челси» опаснее, но уступает')
    expect(n[0].text).toBe('xG: «Челси» — 1,89, «Арсенал» — 0,78. А на табло 2:1.')
  })

  it('удары — во сколько раз честно, чьи числа — по названиям, одна мысль — один вывод', () => {
    const four = matchNotes({ ...base, score: { home: 0, away: 0 }, stats: [st('totalShots', 12, 3)] })
    expect(four[0]).toEqual({ title: '«Арсенал» бьёт вчетверо чаще', text: 'Удары: «Арсенал» — 12, «Челси» — 3.', icon: 'ball' })
    expect(matchNotes({ ...base, score: { home: 0, away: 0 }, stats: [st('totalShots', 10, 4)] })[0].title).toBe('«Арсенал» бьёт больше чем вдвое чаще')
    // ведёт по делу, бьёт чаще и мяч чаще — про одну команду: остаётся самый важный
    const one = matchNotes({ ...base, score: { home: 2, away: 0 }, stats: [st('expectedGoals', 2.1, 0.4), st('totalShots', 12, 3), st('ballPossession', 66, 34)] })
    expect(one.map((x) => x.title)).toEqual(['«Арсенал» бьёт вчетверо чаще'])
  })

  it('ничего яркого — пусто', () => {
    expect(matchNotes({ ...base, score: { home: 1, away: 1 }, stats: [st('expectedGoals', 1.1, 1.0), st('totalShots', 9, 8), st('ballPossession', 52, 48)] })).toEqual([])
  })

  it('не больше трёх; давление в концовке — по последним 10 точкам', () => {
    const momentum = Array.from({ length: 20 }, (_, i) => ({ part: 2 as const, minute: 50 + i, v: i >= 10 ? 0.6 : -0.2 }))
    const n = matchNotes({
      ...base,
      score: { home: 0, away: 1 },
      momentum,
      stats: [st('expectedGoals', 2.1, 0.4), st('bigChances', 5, 0), st('totalShots', 18, 4), st('ballPossession', 66, 34)],
    })
    expect(n).toHaveLength(3)
    expect(n.map((x) => x.title)).toContain('«Арсенал» давит последние 10 минут')
    expect(momentumSummary(momentum)).toEqual({ minutes: { home: 10, away: 10 }, spell: { home: '60–64′', away: null }, late: { home: 10, away: 0 } })
  })
})

describe('сильное и слабое место — сегодня', () => {
  const pts = {
    home: { strong: null, weak: null, byXg: true },
    away: { strong: null, weak: { key: 'finish-' as const, title: 'Не реализует моменты', text: '', xg: { n: 4, xgFor: 1.4, xgAgainst: 1.1, gf: 0.8, ga: 1 } }, byXg: true },
  }
  it('повторилось — строка «снова», обычная про реализацию не дублируется', () => {
    const n = matchNotes({ ...base, score: { home: 1, away: 0 }, stats: [st('expectedGoals', 0.9, 1.6), st('bigChances', 1, 4)], points: pts, minute: 70 })
    expect(n.map((x) => x.title)).toContain('«Челси» снова не реализует моменты')
    expect(n.map((x) => x.title)).not.toContain('«Челси» не реализует моменты')
    expect(n.find((x) => x.title.includes('снова'))!.text).toBe('Сегодня xG\u00a01,60, а голов нет. И в последних 4 матчах забивает 0,8 за игру при xG\u00a01,4.')
  })
  it('не повторилось — ничего', () => {
    const n = matchNotes({ ...base, score: { home: 0, away: 2 }, stats: [st('expectedGoals', 0.9, 1.6)], points: pts, minute: 70 })
    expect(n.some((x) => x.title.includes('снова'))).toBe(false)
  })
})
