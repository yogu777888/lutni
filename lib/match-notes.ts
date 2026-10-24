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
 * Распределение давления в десятых долях процента (сумма — ровно 1000, остаток — наибольшим дробным частям): доля
 * проанализированных минут, когда заметно давили хозяева, гости или было на равных. Одна точка `/Ls/GameMomentum` —
 * одна минута, повторы уже слиты в `normalizeMomentum`; минуты без точек в знаменатель не входят.
 */
export function pressShares(points: MomentumPoint[]): { home: number; even: number; away: number; n: number } | null {
  const n = points.length
  if (!n) return null
  const { home, away } = momentumSummary(points).minutes
  const raw = [home, n - home - away, away].map((c) => (c * 1000) / n)
  const out = raw.map(Math.floor)
  const order = raw.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0])
  const left = 1000 - out.reduce((a, b) => a + b, 0)
  for (let k = 0; k < left; k++) out[order[k][1]]++
  return { home: out[0], even: out[1], away: out[2], n }
}

/**
 * Вывод под «Давлением команд» — по ровно последним 10 минутам данных, без пропусков (от 20 точек); по ходу — только
 * если данные не отстают от часов матча больше чем на 3 минуты. Только перевес над соперником, без «давление выросло».
 * Название — без кавычек, через «у команды» (именительный падеж).
 */
export function lateNote(points: MomentumPoint[], live: boolean, clock: number | null, home: string, away: string): string | null {
  if (points.length < 20) return null
  const pt = playedTime(points)
  const tail = points.slice(-10)
  const last = tail[tail.length - 1]
  const xData = pt.pos(last.part, last.minute)
  const clockPos = (m: number) => (m <= 45 ? m : m <= 90 ? pt.len1 + m - 45 : pt.len1 + pt.len2 + m - 90)
  if (live && clock && clockPos(clock) - xData > 3) return null
  if (!tail.every((p, i) => !i || pt.pos(p.part, p.minute) - pt.pos(tail[i - 1].part, tail[i - 1].minute) === 1)) return null
  const th = (tail.reduce((s, p) => s + Math.max(p.v, 0), 0) / 10) * 100
  const ta = (tail.reduce((s, p) => s + Math.max(-p.v, 0), 0) / 10) * 100
  if (Math.abs(th - ta) < 8) return 'Последние 10 минут · Давление примерно равное'
  return `Последние 10 минут · Лидер по давлению: ${th > ta ? home : away}`
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
        ? { title: `«${name}», как обычно, создаёт много моментов`, text: `И ${past} — в среднем xG\u00a0${d1(h.xgFor)} за игру.` }
        : null
    case 'attack-':
      return late && mine <= 0.5
        ? { title: `«${name}» снова почти без моментов`, text: `И ${past} — в среднем xG\u00a0${d1(h.xgFor)} за игру.` }
        : null
    case 'defense+':
      return late && theirs <= 0.5
        ? { title: `«${name}», как обычно, почти не даёт бить`, text: `И ${past} у соперников — в среднем xG\u00a0${d1(h.xgAgainst)} за игру.` }
        : null
    case 'defense-':
      return theirs >= 1.5
        ? { title: `«${name}» снова отдаёт много моментов`, text: `И ${past} у соперников — в среднем xG\u00a0${d1(h.xgAgainst)} за игру.` }
        : null
    default:
      return null
  }
}

export function matchNotes(c: Ctx): MatchNote[] {
  const get = (k: string) => c.stats.find((s) => s.key === k) ?? null
  const name = (side: 'home' | 'away') => (side === 'home' ? c.home : c.away)
  // g — о чём вывод: «перевес команды» по xG, ударам и владению — одна мысль, из таких берём только самый важный
  const out: { p: number; n: MatchNote; g?: string }[] = []
  const other = (side: 'home' | 'away') => name(side === 'home' ? 'away' : 'home')
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
    if (mine <= theirs)
      out.push({
        p: 10,
        g: `dom:${top}`,
        n: {
          title: `«${name(top)}» опаснее, но ${mine < theirs ? 'уступает' : 'не впереди'}`,
          text: `По xG моменты заметно лучше у «${name(top)}», а на табло ${sc.home}:${sc.away}.`,
        },
      })
    else
      out.push({
        p: 6,
        g: `dom:${top}`,
        n: { title: `«${name(top)}» ведёт по делу`, text: `Счёт по игре: и по xG моменты заметно лучше, чем у «${other(top)}».` },
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
        ? { title: `«${name(side)}» давит последние 10 минут`, text: `Атакует чаще и опаснее, чем «${other(side)}», — это видно на графике «Давление команд».` }
        : { title: `Концовка — за «${name(side)}»`, text: `В последние 10 минут — больше атак и опаснее, чем у «${other(side)}»: это видно на графике «Давление команд».` },
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

  // 5. удары: один бьёт хотя бы вдвое чаще — во сколько раз, считаем честно (12 и 3 — вчетверо, 10 и 4 — больше чем вдвое)
  const shots = get('totalShots')
  if (shots && Math.max(shots.home, shots.away) >= 8 && Math.abs(shots.home - shots.away) >= 6) {
    const side = shots.home > shots.away ? 'home' : 'away'
    const a = shots[side]
    const b = shots[side === 'home' ? 'away' : 'home']
    if (a >= b * 2) {
      const k = b ? Math.floor(a / b) : 0
      const times = k === 2 ? 'вдвое' : k === 3 ? 'втрое' : k === 4 ? 'вчетверо' : `в\u00a0${k}\u00a0раз`
      const title = !b ? `«${name(side)}» бьёт, соперник — нет` : a === b * k ? `«${name(side)}» бьёт ${times} чаще` : `«${name(side)}» бьёт больше чем ${times} чаще`
      // сами удары — в полосе под табло; здесь — в створ, если есть, иначе вывода нет (не повторяем цифры с экрана)
      const on = get('shotsOnGoal')
      if (on)
        out.push({
          p: 7,
          g: `dom:${side}`,
          n: { title, text: `В створ — ${on[side]} против ${on[side === 'home' ? 'away' : 'home']}.` },
        })
    }
  }

  // 5½. про вторую команду: почти без моментов (владелец: «все три вывода про «Барселону»») — с 30-й минуты; выше
  // «бьёт чаще» (7): удары и так в полосе под табло
  const xgL = get('expectedGoals')
  if (xgL && (!c.live || (c.minute ?? 0) >= 30))
    for (const side of ['home', 'away'] as const) {
      const v = xgL[side]
      const on = get('shotsOnGoal')?.[side]
      if (v <= 0.5 && xgL[side === 'home' ? 'away' : 'home'] >= 1 && !repeated.has(`${side}:attack-`))
        out.push({
          p: 7.5,
          n: {
            title: `«${name(side)}» почти без моментов`,
            text:
              on == null
                ? `Атаки «${name(side)}» до ворот почти не доходят.`
                : `${c.live ? `За ${c.minute}\u00a0${plural(c.minute ?? 0, 'минуту', 'минуты', 'минут')}` : 'За матч'} — ${on ? `${on}\u00a0${plural(on, 'удар', 'удара', 'ударов')} в створ` : 'ни одного удара в створ'}.`,
          },
        })
    }

  // 6. владение: заметный перевес
  const poss = get('ballPossession')
  if (poss && Math.max(poss.home, poss.away) >= 62) {
    const side = poss.home > poss.away ? 'home' : 'away'
    out.push({
      p: 3,
      g: `dom:${side}`,
      n: { title: `Мяч чаще у «${name(side)}»`, text: `Владение: «${name(side)}» — ${poss[side]}%, «${other(side)}» — ${poss[side === 'home' ? 'away' : 'home']}%.` },
    })
  }

  // один вывод на мысль: «опаснее», «бьёт чаще» и «мяч чаще» про одну команду — не три вывода, а самый важный
  const seen = new Set<string>()
  return out
    .sort((a, b) => b.p - a.p)
    .filter((x) => !x.g || (!seen.has(x.g) && Boolean(seen.add(x.g))))
    .slice(0, 3)
    .map((x) => x.n)
}
