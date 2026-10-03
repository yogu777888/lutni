import { fair1x2 } from './odds'
import { isMinor } from './rank'
import type { Match } from './types'

/**
 * «Проверка шансов»: сбываются ли проценты, которые показывает сайт. Берём сыгранные матчи,
 * шансы исходов 1X2 по кэфам перед матчем без маржи (те же, что в полосе шансов) и раскладываем
 * исходы по корзинам «около 10% … около 90%»: сколько их было и сколько сбылось. Если шансы
 * честные, в корзине «около 60%» сбывается примерно 60%. Никаких денег и обещаний — только
 * сравнение «давали» и «сбылось». Итог матча — по счёту основного времени.
 */

/** Корзины: около 10%, 20%, … 90% (каждая ±5 пунктов). Шансы меньше 5% и от 95% — мимо: их мало. */
export const CHANCE_BINS = 9
/** Корзина с меньшим числом исходов на графике не показывается — по ней ничего не скажешь. */
export const CHANCE_MIN_BIN = 30
/** Меньше исходов — виджета нет. */
export const CHANCE_MIN_OUTCOMES = 300
/** Окно проверки: столько дней до сегодняшнего. */
export const CHANCE_DAYS = 30

/** Итоги по корзинам: исходов, сумма шансов, сбылось. Складываются по дням. */
export type ChanceTally = { matches: number; n: number[]; sum: number[]; hits: number[] }

export type ChanceBin = {
  /** центр корзины: 10, 20, … 90 */
  at: number
  /** исходов */
  n: number
  /** средний шанс, 0–1 */
  p: number
  /** доля сбывшихся, 0–1 */
  hit: number
}

export type ChanceCheck = {
  /** корзины, где исходов хватает для вывода */
  bins: ChanceBin[]
  matches: number
  outcomes: number
  /** средняя разница «давали — сбылось» с весом по числу исходов, в процентных пунктах */
  gap: number
  /** корзина для главной цифры: около 60% (порог тега #фаворит), иначе самая полная от 50% */
  lead: ChanceBin
  /** дней с данными */
  days: number
}

export const emptyTally = (): ChanceTally => ({
  matches: 0,
  n: Array(CHANCE_BINS).fill(0),
  sum: Array(CHANCE_BINS).fill(0),
  hits: Array(CHANCE_BINS).fill(0),
})

/** Корзина шанса p: 0.55–0.649… → 5 («около 60%»); вне 5–95% → −1. */
export const binOf = (p: number) => {
  const i = Math.round(p * 10) - 1
  return i >= 0 && i < CHANCE_BINS ? i : -1
}

export function tallyChances(matches: Match[]): ChanceTally {
  const t = emptyTally()
  for (const m of matches) {
    const s = m.scoreFT ?? m.score
    if (m.status !== 'finished' || !s || isMinor(m)) continue
    const f = fair1x2(m.odds?.x12)
    if (!f) continue
    t.matches++
    const won = { home: s.home > s.away, draw: s.home === s.away, away: s.away > s.home }
    for (const k of ['home', 'draw', 'away'] as const) {
      const i = binOf(f[k])
      if (i < 0) continue
      t.n[i]++
      t.sum[i] += f[k]
      if (won[k]) t.hits[i]++
    }
  }
  return t
}

export function mergeTallies(ts: ChanceTally[]): ChanceTally {
  const t = emptyTally()
  for (const x of ts) {
    t.matches += x.matches
    for (let i = 0; i < CHANCE_BINS; i++) {
      t.n[i] += x.n[i]
      t.sum[i] += x.sum[i]
      t.hits[i] += x.hits[i]
    }
  }
  return t
}

export function chanceCheck(t: ChanceTally, days: number): ChanceCheck | null {
  const bins: ChanceBin[] = []
  for (let i = 0; i < CHANCE_BINS; i++) {
    if (t.n[i] >= CHANCE_MIN_BIN) bins.push({ at: (i + 1) * 10, n: t.n[i], p: t.sum[i] / t.n[i], hit: t.hits[i] / t.n[i] })
  }
  const outcomes = bins.reduce((s, b) => s + b.n, 0)
  if (outcomes < CHANCE_MIN_OUTCOMES || bins.length < 5) return null
  const gap = (bins.reduce((s, b) => s + b.n * Math.abs(b.p - b.hit), 0) / outcomes) * 100
  const fav = bins.filter((b) => b.at >= 50)
  const lead = bins.find((b) => b.at === 60) ?? [...(fav.length ? fav : bins)].sort((a, b) => b.n - a.n)[0]
  return { bins, matches: t.matches, outcomes, gap, lead, days }
}
