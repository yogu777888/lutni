/**
 * Страница сыгранного матча (владелец: «хорошо подумай что нужно сделать на странице матча до, во время и после игры… нет
 * ощущения финального продукта» — на план «сначала после матча» — «да»): итог словами первым выводом «Главного», «Как сыграл
 * расклад» (шансы до матча против итога), лучший игрок по оценкам и следующий матч каждой команды. Только факты из данных;
 * названия команд — в именительном падеже, в кавычках; без денег и без «выгодная ставка выиграла» (ст. 27 закона «О рекламе»).
 */
import type { MatchNote } from './match-notes'
import type { LineupPlayer, Lineups } from './sstats/ls'
import type { Match, MatchEvent } from './types'

type Side = 'home' | 'away'
type Score = { home: number; away: number }
const other = (s: Side): Side => (s === 'home' ? 'away' : 'home')
const GOALS = new Set<MatchEvent['kind']>(['goal', 'own-goal', 'penalty'])
/** «K. Mbappé» → «Mbappé»: инициалы латиницей ничего не говорят (как авторы голов на табло) */
export const lastName = (p: string) => p.replace(/^(?:\p{Lu}\.\s*)+/u, '') || p
const min = (e: Pick<MatchEvent, 'minute' | 'extra'>) => `${e.minute}${e.extra ? `+${e.extra}` : ''}′`

/**
 * Голы по порядку и кому засчитаны. Сторона автогола в данных бывает и командой игрока, и командой, которой засчитан, —
 * пробуем оба прочтения (как `withScore` в `EventsBlock`); не сошлось с итогом — null (ход счёта не выдумываем).
 */
export function goalFlow(events: MatchEvent[], final: Score | null) {
  const goals = events.filter((e) => GOALS.has(e.kind))
  for (const flip of [false, true]) {
    const flow = goals.map((e) => ({ ...e, to: (e.kind === 'own-goal' && flip ? other(e.side) : e.side) as Side }))
    const n = { home: 0, away: 0 }
    for (const g of flow) n[g.to]++
    if (!final || (n.home === final.home && n.away === final.away)) return flow
  }
  return null
}

/** Итог словами — первым выводом «Главного»: кто выиграл, где, со счётом победителя первым, и решающий факт. */
export function resultNote(m: Pick<Match, 'home' | 'away' | 'score' | 'statusCode'>, events: MatchEvent[], shootout: Score | null = null): MatchNote | null {
  const s = m.score
  if (!s) return null
  const name = (x: Side) => (x === 'home' ? m.home.name : m.away.name)
  const w: Side | null = s.home > s.away ? 'home' : s.away > s.home ? 'away' : null
  const hi = Math.max(s.home, s.away)
  const lo = Math.min(s.home, s.away)
  const title = w
    ? `Победа «${name(w)}» ${w === 'home' ? 'дома' : 'в гостях'} — ${hi}:${lo}${m.statusCode === 9 ? ' в доп. время' : ''}`
    : m.statusCode === 10 && shootout && shootout.home !== shootout.away
      ? (() => {
          // серия — из событий (`splitShootout`): победитель серии, её счёт — победителя первым
          const sw: Side = shootout.home > shootout.away ? 'home' : 'away'
          return `Победа «${name(sw)}» по пенальти — ${s.home}:${s.away}, серия ${shootout[sw]}:${shootout[other(sw)]}`
        })()
      : m.statusCode === 10
        ? `${s.home}:${s.away} — дальше серия пенальти`
        : hi
          ? `Ничья — ${s.home}:${s.away}`
          : 'Ничья без голов'

  const facts: string[] = []
  const flow = goalFlow(events, s)
  if (flow) {
    // камбэк: победитель уступал; в ничьей — кто упустил преимущество в два мяча
    const n = { home: 0, away: 0 }
    let worst = { d: 0, at: null as null | Score, e: null as null | MatchEvent }
    let lead: { side: Side; by: number; at: Score } | null = null
    for (const g of flow) {
      n[g.to]++
      if (w) {
        const d = n[other(w)] - n[w]
        if (d > worst.d) worst = { d, at: { ...n }, e: g }
      } else {
        const d = Math.abs(n.home - n.away)
        if (d >= 2 && (!lead || d > lead.by)) lead = { side: n.home > n.away ? 'home' : 'away', by: d, at: { ...n } }
      }
    }
    if (w && worst.at && worst.e) facts.push(`Камбэк: уступали ${worst.at[w]}:${worst.at[other(w)]} на ${min(worst.e)}.`)
    if (!w && lead) facts.push(`«${name(lead.side)}» вели ${lead.at[lead.side]}:${lead.at[other(lead.side)]}, но не удержали.`)
    // дубль и хет-трик (автоголы не в счёт)
    const by = new Map<string, MatchEvent[]>()
    for (const g of flow) if (g.kind !== 'own-goal' && g.player) by.set(g.player, [...(by.get(g.player) ?? []), g])
    const top = [...by].sort((a, b) => b[1].length - a[1].length)[0]
    if (top && top[1].length >= 2)
      facts.push(`${top[1].length >= 4 ? `${top[1].length} гола` : top[1].length === 3 ? 'Хет-трик' : 'Дубль'} — ${lastName(top[0])} (${top[1].map(min).join(', ')}).`)
    // победный гол — в победе в один мяч, если не было камбэка (там решает другое)
    if (w && hi - lo === 1 && !worst.at) {
      let h = 0
      let a = 0
      let win: (typeof flow)[number] | null = null
      for (const g of flow) {
        const before = w === 'home' ? h - a : a - h
        if (g.to === 'home') h++
        else a++
        const after = w === 'home' ? h - a : a - h
        if (before <= 0 && after > 0) win = g
      }
      if (win) facts.push(`Победный гол — ${win.player ? `${lastName(win.player)}, ` : ''}${min(win)}.`)
    }
  }
  const reds = events.filter((e) => e.kind === 'red')
  if (reds.length && facts.length < 2)
    facts.push(
      reds.length === 1
        ? `Удаление: ${reds[0].player ? `${lastName(reds[0].player)}, ` : ''}«${name(reds[0].side)}», ${min(reds[0])}.`
        : `Удалений — ${reds.length}.`,
    )
  // ничего яркого — авторы голов (до четырёх)
  if (!facts.length && flow && flow.length && flow.length <= 4)
    facts.push(`Голы: ${flow.map((g) => `${g.player ? lastName(g.player) : 'гол'}${g.kind === 'own-goal' ? ' (авт.)' : ''} ${min(g)}`).join(', ')}.`)
  return { title, text: facts.slice(0, 2).join(' '), topic: 'Итог' }
}

export type CheckRow = { label: string; p: number; fact: string; hit: boolean }

/**
 * «Как сыграл расклад»: что было вероятнее всего до матча (шансы по кэфам без маржи) — и сбылось ли. По каждому рынку
 * берём сторону, у которой шанс был выше (54% «3 гола и больше» — её, 46% — «Не больше 2 голов»). Итог — по основному
 * времени, как считают ставки и «История точности».
 */
export function forecastCheck(o: {
  home: string
  away: string
  /** проценты исходов в сумме 100 (`split100`) */
  est: { home: number; draw: number; away: number } | null
  over25: number | null
  btts: number | null
  score: Score
}): CheckRow[] {
  const { score: s } = o
  const total = s.home + s.away
  const goalsW = (n: number) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'гол' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'гола' : 'голов'}`
  const rows: CheckRow[] = []
  if (o.est) {
    const k = (['home', 'draw', 'away'] as const).reduce((a, b) => (o.est![b] > o.est![a] ? b : a))
    const res = s.home > s.away ? 'home' : s.away > s.home ? 'away' : 'draw'
    rows.push({ label: k === 'draw' ? 'Ничья' : `Победа «${k === 'home' ? o.home : o.away}»`, p: o.est[k] / 100, fact: `${s.home}:${s.away}`, hit: k === res })
  }
  if (o.over25 != null) {
    const up = o.over25 >= 0.5
    rows.push({ label: up ? '3 гола и больше' : 'Не больше 2 голов', p: up ? o.over25 : 1 - o.over25, fact: total ? goalsW(total) : 'без голов', hit: up === total >= 3 })
  }
  if (o.btts != null) {
    const yes = o.btts >= 0.5
    const both = s.home > 0 && s.away > 0
    rows.push({
      label: yes ? 'Обе забьют' : 'Хотя бы одна не забьёт',
      p: yes ? o.btts : 1 - o.btts,
      fact: both ? 'забили обе' : !total ? 'никто не забил' : `«${s.home ? o.away : o.home}» без гола`,
      hit: yes === both,
    })
  }
  return rows
}

/** Лучший игрок матча — по оценкам в составах: отмеченный (`best`), иначе самая высокая оценка. */
export function bestPlayer(l: Lineups | null | undefined): { p: LineupPlayer; side: Side } | null {
  if (!l) return null
  const all = (['home', 'away'] as const).flatMap((side) => [...l[side].rows.flat(), ...l[side].bench].map((p) => ({ p, side })))
  const rated = all.filter((x) => x.p.rating != null)
  if (!rated.length) return null
  return rated.find((x) => x.p.best) ?? rated.sort((a, b) => b.p.rating! - a.p.rating!)[0]
}

/** Что сделал игрок: «2 гола, передача» — из составов; ничего — пусто. */
export function playerDeeds(p: LineupPlayer): string {
  const w = (n: number, f: [string, string, string]) => `${n > 1 ? `${n} ` : ''}${n === 1 ? f[0] : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? f[1] : f[2]}`
  return [p.goals ? w(p.goals, ['гол', 'гола', 'голов']) : '', p.assists ? w(p.assists, ['передача', 'передачи', 'передач']) : ''].filter(Boolean).join(', ')
}

/** Следующий матч команды в этом турнире после `after` (по списку сезона). */
export function nextOf(games: Match[], teamId: number, after: number): Match | null {
  return games.find((g) => g.ts > after && g.status === 'scheduled' && (g.home.id === teamId || g.away.id === teamId)) ?? null
}
