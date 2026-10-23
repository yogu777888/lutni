/**
 * «Главное» на странице начавшегося матча — два-три вывода словами из статистики и давления (владелец прислал
 * прототип ChatGPT с «Главным за минуту»: «давай без входа делай то что ты до этого хотел»). Только то, что видно в
 * цифрах, без советов и прогнозов; названия команд — в именительном падеже, в кавычках; глаголы — в настоящем времени (род у названий разный: «Челси», «Ман Сити»).
 */
import type { MomentumPoint } from './sstats/ls'
import type { MatchEvent, StatPair } from './types'

export type MatchNote = { title: string; text: string }

type Ctx = {
  home: string
  away: string
  score: { home: number; away: number } | null
  stats: StatPair[]
  events: MatchEvent[]
  momentum: MomentumPoint[] | null
  live: boolean
}

const dec = (v: number, d = 2) => v.toFixed(d).replace('.', ',')

/** Давление за последние 10 минут: > 0 — хозяева, < 0 — гости. */
export function lateMomentum(points: MomentumPoint[] | null, n = 10): number | null {
  if (!points || points.length < n) return null
  const tail = points.slice(-n)
  return tail.reduce((a, p) => a + p.v, 0) / tail.length
}

/** Подпись под графиком «Кто давил»: кто сильнее в последние 10 минут (по ходу) или в концовке (сыгран). */
export function momentumLine(points: MomentumPoint[] | null, home: string, away: string, live: boolean): string | null {
  const v = lateMomentum(points)
  if (v == null) return null
  if (Math.abs(v) < 0.15) return live ? 'Последние 10 минут — на равных.' : 'Концовка — на равных.'
  const who = v > 0 ? home : away
  return live ? `Последние 10 минут давит «${who}».` : `Концовка — за «${who}».`
}

export function matchNotes(c: Ctx): MatchNote[] {
  const get = (k: string) => c.stats.find((s) => s.key === k) ?? null
  const name = (side: 'home' | 'away') => (side === 'home' ? c.home : c.away)
  const out: { p: number; n: MatchNote }[] = []
  const sc = c.score

  // 1. моменты против счёта: по качеству моментов (xG) один опаснее, а в счёте не впереди — или ведёт по делу
  const xg = get('expectedGoals')
  if (xg && sc && Math.abs(xg.home - xg.away) >= 0.7) {
    const top: 'home' | 'away' = xg.home > xg.away ? 'home' : 'away'
    const mine = top === 'home' ? sc.home : sc.away
    const theirs = top === 'home' ? sc.away : sc.home
    const a = top === 'home' ? xg.home : xg.away
    const b = top === 'home' ? xg.away : xg.home
    if (mine <= theirs)
      out.push({
        p: 10,
        n: {
          title: `«${name(top)}» опаснее, но ${mine < theirs ? 'уступает' : 'не впереди'}`,
          text: `Качество моментов (xG) — ${dec(a)} против ${dec(b)}, а в счёте ${mine}:${theirs}.`,
        },
      })
    else
      out.push({
        p: 6,
        n: { title: `«${name(top)}» ведёт по делу`, text: `Качество моментов (xG) — ${dec(a)} против ${dec(b)}.` },
      })
  }

  // 2. реализация: много голевых моментов — мало голов
  const big = get('bigChances')
  if (big && sc)
    for (const side of ['home', 'away'] as const) {
      const ch = big[side]
      const g = sc[side]
      if (ch >= 3 && ch - g >= 3)
        out.push({ p: 8, n: { title: `«${name(side)}» не реализует моменты`, text: `Голевых моментов — ${ch}, голов — ${g}.` } })
    }

  // 3. давление в концовке (только по ходу и в сыгранном — концовка)
  const late = lateMomentum(c.momentum)
  if (late != null && Math.abs(late) >= 0.25) {
    const side = late > 0 ? 'home' : 'away'
    out.push({
      p: c.live ? 9 : 4,
      n: c.live
        ? { title: `«${name(side)}» давит последние 10 минут`, text: 'По графику «Кто давил»: атаки этой команды опаснее и чаще.' }
        : { title: `Концовка — за «${name(side)}»`, text: 'По графику «Кто давил» за последние 10 минут.' },
    })
  }

  // 4. удаление — команда в меньшинстве (по ходу) / доиграла вдесятером
  for (const e of c.events.filter((x) => x.kind === 'red')) {
    out.push({
      p: c.live ? 11 : 5,
      n: {
        title: c.live ? `«${name(e.side)}» в меньшинстве с ${e.minute}′` : `В меньшинстве доигрывали: «${name(e.side)}»`,
        text: `${e.player ? `${e.player} удалён` : 'Удаление'} на ${e.minute}′.`,
      },
    })
  }

  // 5. удары: один бьёт вдвое чаще
  const shots = get('totalShots')
  if (shots && Math.max(shots.home, shots.away) >= 8 && Math.abs(shots.home - shots.away) >= 6) {
    const side = shots.home > shots.away ? 'home' : 'away'
    const a = shots[side]
    const b = shots[side === 'home' ? 'away' : 'home']
    if (a >= b * 2) out.push({ p: 7, n: { title: `«${name(side)}» бьёт вдвое чаще`, text: `Ударов — ${a} против ${b}.` } })
  }

  // 6. владение: заметный перевес
  const poss = get('ballPossession')
  if (poss && Math.max(poss.home, poss.away) >= 62) {
    const side = poss.home > poss.away ? 'home' : 'away'
    out.push({ p: 3, n: { title: `Больше владеет мячом «${name(side)}»`, text: `Владение — ${poss[side]}%.` } })
  }

  return out
    .sort((a, b) => b.p - a.p)
    .slice(0, 3)
    .map((x) => x.n)
}
