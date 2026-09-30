/**
 * Разбор рынков ставок из ответа SStats и расчёт «справедливых» вероятностей.
 *
 * Названия рынков в разных источниках отличаются («Match Winner», «1X2»,
 * «Исход», «Goals Over/Under», «Тотал»…), поэтому разбор построен на
 * эвристиках: нас интересуют только рынки основного времени — 1X2, тоталы,
 * «обе забьют» и двойной шанс. Если после подключения реального API какой-то
 * рынок не распознаётся — посмотрите сырые названия через /api/debug/odds?id=…
 * и поправьте регулярки ниже.
 */
import type { RawBet } from './sstats/types'

export type Quote = { value: number; opening: number | null }
export type Outcome = 'home' | 'draw' | 'away'
export type X12 = Partial<Record<Outcome, Quote>>
export type TotalLine = { line: number; over?: Quote; under?: Quote }
export type Btts = { yes?: Quote; no?: Quote }
export type DoubleChance = { hd?: Quote; ha?: Quote; da?: Quote }

export type MarketSet = {
  x12: X12 | null
  totals: TotalLine[]
  btts: Btts | null
  dc: DoubleChance | null
}

export type BookOdds = MarketSet & { bookmakerId: number; bookmakerName: string }

const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function quote(value: unknown, opening: unknown): Quote | undefined {
  const v = toNum(value)
  if (v === null || v <= 1.0) return undefined
  const o = toNum(opening)
  return { value: v, opening: o !== null && o > 1.0 ? o : null }
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim()

/** Рынки не основного времени / не на весь матч / командные — пропускаем. */
const EXCLUDE =
  /(half|1st|2nd|first|second|period|тайм|перв|втор|corner|угл|card|booking|карт|желт|asian|азиат|handicap|фора|exact|correct|точн|odd|even|чет|нечет|ht\/ft|draw no bet|\bhome\b|\baway\b|team|команд|хозя|гост|player|игрок|minute|минут|interval|интервал|win to nil|clean sheet|result\/|\/total|\+)/

const IS_1X2 =
  /^(1x2|match winner|match result|full ?time result|fulltime result|3 ?way( result)?|result|winner|home\/draw\/away|1x2 full ?time|1x2 - full ?time|исход( матча)?|результат( матча)?|основное время|победитель)$/
const IS_TOTAL = /(over\/under|over-under|over under|total goals|goals over\/under|^goals$|^totals?$|тотал|^o\/u$|больше\/меньше)/
const IS_BTTS = /(both teams (to )?score|btts|обе (команды )?забьют|both to score|gg\/ng|goal\/no goal)/
const IS_DC = /(double chance|двойной шанс|^dc$)/

type Kind = '1x2' | 'totals' | 'btts' | 'dc'

export function classifyMarket(name: string): Kind | null {
  const n = norm(name)
  if (IS_1X2.test(n)) return '1x2'
  if (IS_BTTS.test(n)) return /(half|тайм|1st|2nd|first|second|result|исход|total|тотал|win)/.test(n) ? null : 'btts'
  if (EXCLUDE.test(n)) return null
  if (IS_DC.test(n)) return 'dc'
  if (IS_TOTAL.test(n)) return 'totals'
  return null
}

function outcome1x2(name: string, teams?: { home: string; away: string }): Outcome | null {
  const n = norm(name)
  if (/^(1|home|п1|w1|h|team ?1|home team|хозяева|победа 1)$/.test(n)) return 'home'
  if (/^(x|draw|ничья|н|d|tie)$/.test(n)) return 'draw'
  if (/^(2|away|п2|w2|a|team ?2|away team|гости|победа 2)$/.test(n)) return 'away'
  if (teams) {
    if (n === norm(teams.home)) return 'home'
    if (n === norm(teams.away)) return 'away'
  }
  return null
}

function parseLine(s: string): number | null {
  const m = /(\d+(?:[.,]\d+)?)/.exec(s)
  return m ? Number(m[1].replace(',', '.')) : null
}

function totalSide(name: string): 'over' | 'under' | null {
  const n = norm(name)
  if (/^(over|o|больше|тб|more)\b|^over|^тб|^больше/.test(n)) return 'over'
  if (/^(under|u|меньше|тм|less)\b|^under|^тм|^меньше/.test(n)) return 'under'
  return null
}

function dcKey(name: string): keyof DoubleChance | null {
  const n = norm(name).replace(/\s+/g, '')
  if (/^(1x|x1|home\/draw|draw\/home|homeordraw|1orx|1илиx)$/.test(n)) return 'hd'
  if (/^(12|21|home\/away|away\/home|homeoraway|1or2|1или2)$/.test(n)) return 'ha'
  if (/^(x2|2x|draw\/away|away\/draw|draworaway|xor2|xили2)$/.test(n)) return 'da'
  return null
}

export function parseMarkets(bets: RawBet[] | null | undefined, teams?: { home: string; away: string }): MarketSet {
  const set: MarketSet = { x12: null, totals: [], btts: null, dc: null }
  const lines = new Map<number, TotalLine>()
  for (const bet of bets ?? []) {
    const kind = classifyMarket(String(bet.marketName ?? ''))
    if (!kind) continue
    for (const p of bet.odds ?? []) {
      const q = quote(p.value, p.openingValue)
      if (!q) continue
      const name = String(p.name ?? '')
      if (kind === '1x2') {
        const o = outcome1x2(name, teams)
        if (!o) continue
        set.x12 ??= {}
        set.x12[o] ??= q
      } else if (kind === 'totals') {
        const side = totalSide(name)
        const line = parseLine(name) ?? parseLine(String(bet.marketName))
        if (!side || line === null || line <= 0 || line > 12) continue
        const entry = lines.get(line) ?? { line }
        entry[side] ??= q
        lines.set(line, entry)
      } else if (kind === 'btts') {
        const n = norm(name)
        set.btts ??= {}
        if (/^(yes|да|gg|y)$/.test(n)) set.btts.yes ??= q
        else if (/^(no|нет|ng|n)$/.test(n)) set.btts.no ??= q
      } else if (kind === 'dc') {
        const k = dcKey(name)
        if (!k) continue
        set.dc ??= {}
        set.dc[k] ??= q
      }
    }
  }
  set.totals = [...lines.values()].sort((a, b) => a.line - b.line)
  if (set.x12 && Object.keys(set.x12).length === 0) set.x12 = null
  if (set.btts && !set.btts.yes && !set.btts.no) set.btts = null
  return set
}

export const totalAt = (m: MarketSet | null | undefined, line: number) => m?.totals.find((t) => t.line === line)

// ─── Справедливые вероятности (без маржи) ────────────────────────────────────

export type Fair1x2 = { home: number; draw: number; away: number }

/** Пропорциональное снятие маржи. Возвращает null, если нет всех трёх исходов. */
export function fair1x2(x: X12 | null | undefined, useOpening = false): (Fair1x2 & { margin: number }) | null {
  const get = (q?: Quote) => (useOpening ? (q?.opening ?? null) : (q?.value ?? null))
  const h = get(x?.home)
  const d = get(x?.draw)
  const a = get(x?.away)
  if (!h || !d || !a) return null
  const s = 1 / h + 1 / d + 1 / a
  if (s < 0.9 || s > 1.4) return null // явно битые данные
  return { home: 1 / h / s, draw: 1 / d / s, away: 1 / a / s, margin: s - 1 }
}

export function fairTwoWay(a?: Quote, b?: Quote): { a: number; b: number; margin: number } | null {
  if (!a || !b) return null
  const s = 1 / a.value + 1 / b.value
  if (s < 0.9 || s > 1.4) return null
  return { a: 1 / a.value / s, b: 1 / b.value / s, margin: s - 1 }
}

/** Вес «острых» букмекеров в консенсусе рынка: их линия точнее. */
export function sharpWeight(bookmakerName: string): number {
  if (/pinnacle|pinnacle sports/i.test(bookmakerName)) return 3
  if (/betfair|sbo|matchbook|marathon|марафон/i.test(bookmakerName)) return 1.5
  return 1
}
