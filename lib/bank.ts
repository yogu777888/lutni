import { ymdInTz } from './format'
import type { Match, Score } from './types'
import type { LoggedPick } from './value-log'

/**
 * «Если ставить по 1000 ₽ на каждую выгодную ставку» — банк по журналу подсказок (value-log.ts).
 * Ставки рассчитываются по счёту основного времени, как у букмекеров. Возврат (ровно 2 гола
 * при тотале 2, перенос, отмена) не считаем ни выигрышем, ни проигрышем — его просто нет в банке.
 */
export type BetResult = 'won' | 'lost' | 'void'

export const BANK_STAKE = 1000
/** Меньше — график ни о чём не говорит, виджет не показываем. */
export const BANK_MIN_BETS = 10
/** Окно: сегодня и шесть прошлых дней. */
export const BANK_DAYS = 7

/** Исход ставки по счёту основного времени. Ключи — как у кандидатов модели (lib/model.ts). */
export function settleBet(key: string, s: Score): BetResult {
  const { home: h, away: a } = s
  switch (key) {
    case 'home':
      return h > a ? 'won' : 'lost'
    case 'draw':
      return h === a ? 'won' : 'lost'
    case 'away':
      return a > h ? 'won' : 'lost'
    case 'hd':
      return h >= a ? 'won' : 'lost'
    case 'da':
      return a >= h ? 'won' : 'lost'
    case 'ha':
      return h !== a ? 'won' : 'lost'
    case 'bttsYes':
      return h > 0 && a > 0 ? 'won' : 'lost'
    case 'bttsNo':
      return h > 0 && a > 0 ? 'lost' : 'won'
  }
  const t = /^(over|under)([\d.]+)$/.exec(key)
  if (!t) return 'void'
  const line = Number(t[2])
  const goals = h + a
  if (goals === line) return 'void'
  return (t[1] === 'over') === goals > line ? 'won' : 'lost'
}

export type BankBet = {
  pick: LoggedPick
  match: Match
  won: boolean
  /** выигрыш или проигрыш ставки, ₽ */
  delta: number
  /** банк после этой ставки, ₽ */
  cum: number
}

export type Bank = {
  stake: number
  /** рассчитанные ставки по времени начала матча */
  bets: BankBet[]
  won: number
  /** итог, ₽ */
  profit: number
  /** итог к поставленному: 0.11 = +11% */
  roi: number
  /** средний кэф */
  avgOdd: number
  /** дней, за которые есть ставки */
  days: number
  /** подсказки окна, матчи которых ещё не доиграны */
  pending: number
}

export function buildBank(picks: LoggedPick[], matches: Map<number, Match>, stake = BANK_STAKE): Bank | null {
  const rows = picks
    .flatMap((p) => {
      const m = matches.get(p.id)
      return m ? [{ p, m }] : []
    })
    .sort((a, b) => a.m.ts - b.m.ts || a.m.id - b.m.id)
  const bets: BankBet[] = []
  let pending = 0
  let cum = 0
  for (const { p, m } of rows) {
    if (m.status === 'cancelled' || m.status === 'postponed') continue
    const score = m.scoreFT ?? m.score
    if (m.status !== 'finished' || !score) {
      pending++
      continue
    }
    const r = settleBet(p.key, score)
    if (r === 'void') continue
    const delta = r === 'won' ? Math.round(stake * (p.odd - 1)) : -stake
    cum += delta
    bets.push({ pick: p, match: m, won: r === 'won', delta, cum })
  }
  if (bets.length < BANK_MIN_BETS) return null
  return {
    stake,
    bets,
    won: bets.filter((b) => b.won).length,
    profit: cum,
    roi: cum / (stake * bets.length),
    avgOdd: bets.reduce((s, b) => s + b.pick.odd, 0) / bets.length,
    days: new Set(bets.map((b) => ymdInTz(b.match.ts))).size,
    pending,
  }
}
