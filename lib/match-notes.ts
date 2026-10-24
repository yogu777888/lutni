/**
 * «Главное» на странице начавшегося матча — два-три вывода словами из статистики и давления (владелец прислал
 * прототип ChatGPT с «Главным за минуту»: «давай без входа делай то что ты до этого хотел»). Только то, что видно в
 * цифрах, без советов и прогнозов; названия команд — в именительном падеже, в кавычках; глаголы — в настоящем времени (род у названий разный: «Челси», «Ман Сити»).
 */
import { minuteLabel, type MomentumPoint } from './sstats/ls'
import type { MatchEvent, StatPair } from './types'
import { lastN, type Point, type TeamPoints } from './team-xg'

export type MatchNote = { title: string; text: string }

type Ctx = {
  home: string
  away: string
  score: { home: number; away: number } | null
  stats: StatPair[]
  events: MatchEvent[]
  momentum: MomentumPoint[] | null
  live: boolean
  /** минута идущего матча: «почти без моментов» говорим не раньше 60-й */
  minute?: number | null
  /** сильное и слабое место команд по прошлым матчам (`teamPoints`) — сверяем с сегодняшними цифрами */
  points?: { home: TeamPoints; away: TeamPoints } | null
}

const dec = (v: number, d = 2) => v.toFixed(d).replace('.', ',')
const plural = (n: number, one: string, few: string, many: string) => {
  const a = n % 10
  const b = n % 100
  return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many
}
const goalsW = (n: number) => `${n}\u00a0${plural(n, 'гол', 'гола', 'голов')}`

/** Давление за последние 10 минут: > 0 — хозяева, < 0 — гости. */
export function lateMomentum(points: MomentumPoint[] | null, n = 10): number | null {
  if (!points || points.length < n) return null
  const tail = points.slice(-n)
  return tail.reduce((a, p) => a + p.v, 0) / tail.length
}

/** Минута давления «за» команду: точка, где перевес заметный (`|v| ≥ 0.1`), — меньшие колебания считаем равной игрой. */
const PRESS = 0.1

export type MomentumSummary = {
  /** сколько минут перевес у каждой команды */
  minutes: { home: number; away: number }
  /** лучший отрезок команды — «21–25′» (5 минут подряд с самым сильным давлением), нет заметного — null */
  spell: { home: string | null; away: string | null }
  /** последние 10 минут (по ходу) / концовка (сыгран): минуты с перевесом */
  late: { home: number; away: number } | null
}

/**
 * Цифры над графиком «Кто давил» (владелец: «виджет давление команд некрасивый и не информативный и в плане текста
 * какаято бурмалда написана»): вместо фразы и легенды — строки, как в статистике, у каждой команды своё число.
 */
export function momentumSummary(points: MomentumPoint[]): MomentumSummary {
  const count = (xs: MomentumPoint[]) => ({ home: xs.filter((p) => p.v >= PRESS).length, away: xs.filter((p) => p.v <= -PRESS).length })
  const spell = (sign: 1 | -1) => {
    let best: { avg: number; from: MomentumPoint; to: MomentumPoint } | null = null
    for (let i = 0; i + 5 <= points.length; i++) {
      const w = points.slice(i, i + 5)
      if (w[0].part !== w[4].part) continue
      const avg = (w.reduce((a, p) => a + p.v, 0) / 5) * sign
      if (!best || avg > best.avg) best = { avg, from: w[0], to: w[4] }
    }
    if (!best || best.avg < 0.3) return null
    return `${minuteLabel(best.from).replace('′', '')}–${minuteLabel(best.to)}`
  }
  return {
    minutes: count(points),
    spell: { home: spell(1), away: spell(-1) },
    late: points.length >= 20 ? count(points.slice(-10)) : null,
  }
}

/**
 * Сыгранное время по точкам давления — одна точка на минуту, с добавленным временем (владелец: на 59′ «43 + 10 + 8 =
 * 61» — это 59 минут по часам и 2 добавленные к первому тайму). `pos` — минута на общей оси: первый тайм — 1…45+N,
 * второй — сразу за ним, дальше доп. время. `gap` — минуты без точек внутри сыгранного (не делим их между командами).
 */
export function playedTime(points: MomentumPoint[]) {
  const max = (part: number) => Math.max(0, ...points.filter((p) => p.part === part).map((p) => p.minute))
  const has = (part: number) => points.some((p) => p.part === part)
  const len1 = has(2) || has(3) ? Math.max(45, max(1)) : max(1)
  const len2 = has(2) ? (has(3) ? Math.max(90, max(2)) : max(2)) - 45 : 0
  const len3 = has(3) ? max(3) - 90 : 0
  const pos = (part: number, minute: number) => (part === 1 ? minute : part === 2 ? len1 + minute - 45 : len1 + len2 + minute - 90)
  const total = len1 + len2 + Math.max(0, len3)
  /** добавленные минуты: сверх 45 у таймов основного времени, сверх 30 у доп. времени */
  const added = Math.max(0, len1 - 45) + Math.max(0, len2 - 45) + Math.max(0, len3 - 30)
  return { len1, len2, total, pos, gap: Math.max(0, total - points.length), added }
}

/**
 * Прошлое против сегодняшнего (владелец: «а в идущем матче будем писать?» — «да»): если сегодняшние цифры повторяют
 * сильное или слабое место команды по последним матчам (только по xG — у «по голам» нет сегодняшней пары), — одна
 * строка: «„Эвертон“ снова не реализует моменты». Не повторяет — ничего не пишем.
 */
function historyNote(side: 'home' | 'away', p: Point, c: Ctx, xg: StatPair, sc: { home: number; away: number }, name: string): MatchNote | null {
  const other = side === 'home' ? 'away' : 'home'
  const mine = xg[side]
  const theirs = xg[other]
  const goals = sc[side]
  const late = !c.live || (c.minute ?? 0) >= 60
  const h = p.xg
  if (!h) return null
  // «Сегодня xG 1,90 — в последних 5 матчах в среднем 2,0 за игру.»: сначала сегодняшнее, потом прошлое — одной фразой
  const now = c.live ? 'Сегодня' : 'В этом матче'
  const already = c.live ? 'уже ' : ''
  const past = lastN(h.n).replace(/^В/, 'в')
  const d1 = (v: number) => dec(v, 1)
  switch (p.key) {
    case 'finish-':
      return mine >= 1 && goals <= mine - 0.8
        ? {
            title: `«${name}» снова не реализует моменты`,
            text: `${now} xG\u00a0${dec(mine)}, а ${goals ? `забит только ${goalsW(goals)}` : 'голов нет'}. И ${past} забивает ${d1(h.gf)} за игру при xG\u00a0${d1(h.xgFor)}.`,
          }
        : null
    case 'finish+':
      return goals >= 2 && goals >= mine + 0.8
        ? {
            title: `«${name}» снова забивает больше, чем создаёт`,
            text: `${now} ${goalsW(goals)} при xG\u00a0${dec(mine)}. И ${past} — ${d1(h.gf)} за игру при xG\u00a0${d1(h.xgFor)}.`,
          }
        : null
    case 'attack+':
      return mine >= 1.5
        ? { title: `«${name}», как обычно, создаёт много моментов`, text: `${now} ${already}xG\u00a0${dec(mine)}, ${past} — в среднем ${d1(h.xgFor)} за игру.` }
        : null
    case 'attack-':
      return late && mine <= 0.5
        ? { title: `«${name}» снова почти без моментов`, text: `${now} xG\u00a0${dec(mine)}, ${past} — в среднем ${d1(h.xgFor)} за игру.` }
        : null
    case 'defense+':
      return late && theirs <= 0.5
        ? { title: `«${name}», как обычно, почти не даёт бить`, text: `${now} у соперника xG\u00a0${dec(theirs)}, ${past} у соперников — в среднем ${d1(h.xgAgainst)}.` }
        : null
    case 'defense-':
      return theirs >= 1.5
        ? { title: `«${name}» снова отдаёт много моментов`, text: `${now} у соперника ${already}xG\u00a0${dec(theirs)}, ${past} у соперников — в среднем ${d1(h.xgAgainst)}.` }
        : null
    default:
      return null
  }
}

export function matchNotes(c: Ctx): MatchNote[] {
  const get = (k: string) => c.stats.find((s) => s.key === k) ?? null
  const name = (side: 'home' | 'away') => (side === 'home' ? c.home : c.away)
  const out: { p: number; n: MatchNote }[] = []
  const sc = c.score
  // 0. сильное / слабое место команды подтверждается сегодня — сразу за удалением по ходу (11) и «опаснее, но уступает» (10)
  const repeated = new Set<string>()
  const xgNow = get('expectedGoals')
  if (c.points && xgNow && sc)
    for (const side of ['home', 'away'] as const)
      for (const p of [c.points[side].strong, c.points[side].weak]) {
        const n = p && c.points[side].byXg ? historyNote(side, p, c, xgNow, sc, name(side)) : null
        if (n) {
          out.push({ p: 9.5, n })
          repeated.add(`${side}:${p!.key}`)
        }
      }

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
          text: `По моментам перевес — xG\u00a0${dec(a)} против ${dec(b)}, а на табло ${sc.home}:${sc.away}.`,
        },
      })
    else
      out.push({
        p: 6,
        n: { title: `«${name(top)}» ведёт по делу`, text: `По моментам тоже впереди — xG\u00a0${dec(a)} против ${dec(b)}.` },
      })
  }

  // 2. реализация: много голевых моментов — мало голов
  const big = get('bigChances')
  if (big && sc)
    for (const side of ['home', 'away'] as const) {
      const ch = big[side]
      const g = sc[side]
      if (ch >= 3 && ch - g >= 3 && !repeated.has(`${side}:finish-`))
        out.push({
          p: 8,
          n: {
            title: `«${name(side)}» не реализует моменты`,
            text: `${ch} ${plural(ch, 'голевой момент', 'голевых момента', 'голевых моментов')}, а ${g ? `забит только ${goalsW(g)}` : c.live ? 'гола пока нет' : 'гола так и не было'}.`,
          },
        })
    }

  // 3. давление в концовке (только по ходу и в сыгранном — концовка)
  const late = lateMomentum(c.momentum)
  if (late != null && Math.abs(late) >= 0.25) {
    const side = late > 0 ? 'home' : 'away'
    out.push({
      p: c.live ? 9 : 4,
      n: c.live
        ? { title: `«${name(side)}» давит последние 10 минут`, text: 'Атакует чаще и опаснее соперника — это видно на графике «Давление команд».' }
        : { title: `Концовка — за «${name(side)}»`, text: 'В последние 10 минут атаковали чаще и опаснее — это видно на графике «Давление команд».' },
    })
  }

  // 4. удаление — команда в меньшинстве: сколько играть (по ходу) / сколько доигрывали вдесятером
  const left = (m: number) => {
    const n = Math.max(0, 90 - (c.live ? Math.max(m, c.minute ?? m) : m))
    if (n < 3) return 'Это уже в самой концовке.'
    const mins = `${n}\u00a0${plural(n, 'минуту', 'минуты', 'минут')}`
    return c.live ? `Вдесятером — ещё ${mins} основного времени.` : `Вдесятером доигрывали ${mins} с лишним.`
  }
  for (const e of c.events.filter((x) => x.kind === 'red')) {
    out.push({
      p: c.live ? 11 : 5,
      n: {
        title: `«${name(e.side)}» в меньшинстве с ${e.minute}′`,
        text: `${e.player ? `Удалён ${e.player}. ` : ''}${left(e.minute)}`,
      },
    })
  }

  // 5. удары: один бьёт вдвое чаще
  const shots = get('totalShots')
  if (shots && Math.max(shots.home, shots.away) >= 8 && Math.abs(shots.home - shots.away) >= 6) {
    const side = shots.home > shots.away ? 'home' : 'away'
    const a = shots[side]
    const b = shots[side === 'home' ? 'away' : 'home']
    if (a >= b * 2) out.push({ p: 7, n: { title: `«${name(side)}» бьёт вдвое чаще`, text: `${a} ${plural(a, 'удар', 'удара', 'ударов')} против ${b} у соперника.` } })
  }

  // 6. владение: заметный перевес
  const poss = get('ballPossession')
  if (poss && Math.max(poss.home, poss.away) >= 62) {
    const side = poss.home > poss.away ? 'home' : 'away'
    out.push({ p: 3, n: { title: `Мяч чаще у «${name(side)}»`, text: `Владение — ${poss[side]}% на ${poss[side === 'home' ? 'away' : 'home']}%.` } })
  }

  return out
    .sort((a, b) => b.p - a.p)
    .slice(0, 3)
    .map((x) => x.n)
}
