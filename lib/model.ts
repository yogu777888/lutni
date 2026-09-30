/**
 * Модель tag.bet: консенсус рынка + пуассоновская модель голов.
 *
 * 1. Консенсус: снимаем маржу у каждого букмекера и усредняем вероятности
 *    (у «острых» букмекеров вроде Pinnacle вес больше).
 * 2. Пуассон: подбираем ожидаемые голы хозяев/гостей (λ), которые лучше всего
 *    объясняют рыночные вероятности, и смешиваем с xG из Glicko-2 от SStats.
 *    Из λ считаем точный счёт, тоталы и «обе забьют».
 * 3. Value: коэффициент конкретного букмекера выше справедливого
 *    (EV = p × k − 1 > 0) — это и есть «перевес».
 */
import { partnerForApiBookmaker, type Partner } from '@/config/bookmakers'
import { fair1x2, fairTwoWay, sharpWeight, type BookOdds, type Outcome, type Quote } from './odds'
import type { Glicko } from './types'

export type Probs1x2 = { home: number; draw: number; away: number }

export type Consensus = {
  books: number
  x12: Probs1x2 | null
  x12Opening: Probs1x2 | null
  /** Средние коэффициенты открытия/текущие — для «прогрузов». */
  movement: Partial<Record<Outcome, { opening: number; current: number }>>
  over: Record<string, number>
  btts: number | null
  margin: number | null
}

const LINES = [1.5, 2.5, 3.5]

function wavg(items: { v: number; w: number }[]): number | null {
  const sw = items.reduce((s, i) => s + i.w, 0)
  return sw > 0 ? items.reduce((s, i) => s + i.v * i.w, 0) / sw : null
}

export function buildConsensus(books: BookOdds[]): Consensus {
  const h: { v: number; w: number }[] = []
  const d: { v: number; w: number }[] = []
  const a: { v: number; w: number }[] = []
  const ho: { v: number; w: number }[] = []
  const dO: { v: number; w: number }[] = []
  const ao: { v: number; w: number }[] = []
  const margins: number[] = []
  const move: Record<Outcome, { o: number[]; c: number[] }> = {
    home: { o: [], c: [] },
    draw: { o: [], c: [] },
    away: { o: [], c: [] },
  }
  const over: Record<string, { v: number; w: number }[]> = {}
  const btts: { v: number; w: number }[] = []
  let n = 0

  for (const b of books) {
    const w = sharpWeight(b.bookmakerName)
    const f = fair1x2(b.x12)
    if (f) {
      n++
      h.push({ v: f.home, w })
      d.push({ v: f.draw, w })
      a.push({ v: f.away, w })
      margins.push(f.margin)
      const fo = fair1x2(b.x12, true)
      if (fo) {
        ho.push({ v: fo.home, w })
        dO.push({ v: fo.draw, w })
        ao.push({ v: fo.away, w })
      }
      for (const o of ['home', 'draw', 'away'] as Outcome[]) {
        const q = b.x12?.[o]
        if (q?.opening) {
          move[o].o.push(q.opening)
          move[o].c.push(q.value)
        }
      }
    }
    for (const t of b.totals) {
      const fw = fairTwoWay(t.over, t.under)
      if (!fw) continue
      ;(over[String(t.line)] ??= []).push({ v: fw.a, w })
    }
    const fb = fairTwoWay(b.btts?.yes, b.btts?.no)
    if (fb) btts.push({ v: fb.a, w })
  }

  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length
  const x12 = n ? { home: wavg(h)!, draw: wavg(d)!, away: wavg(a)! } : null
  const x12Opening = ho.length ? { home: wavg(ho)!, draw: wavg(dO)!, away: wavg(ao)! } : null
  const movement: Consensus['movement'] = {}
  for (const o of ['home', 'draw', 'away'] as Outcome[]) {
    if (move[o].o.length) movement[o] = { opening: mean(move[o].o), current: mean(move[o].c) }
  }
  const overOut: Record<string, number> = {}
  for (const [line, items] of Object.entries(over)) overOut[line] = wavg(items)!
  return {
    books: n,
    x12,
    x12Opening,
    movement,
    over: overOut,
    btts: wavg(btts),
    margin: margins.length ? mean(margins) : null,
  }
}

// ─── Пуассон ─────────────────────────────────────────────────────────────────

const MAX_GOALS = 10

function pmf(lambda: number): number[] {
  const out: number[] = []
  let p = Math.exp(-lambda)
  for (let k = 0; k <= MAX_GOALS; k++) {
    out.push(p)
    p = (p * lambda) / (k + 1)
  }
  return out
}

export type ScoreProb = { home: number; away: number; p: number }

export type PoissonOut = {
  x12: Probs1x2
  over: Record<string, number>
  btts: number
  topScores: ScoreProb[]
}

export function poisson(lh: number, la: number, withScores = true): PoissonOut {
  const ph = pmf(lh)
  const pa = pmf(la)
  let home = 0
  let draw = 0
  let away = 0
  let btts = 0
  const over: Record<string, number> = Object.fromEntries(LINES.map((l) => [String(l), 0]))
  const scores: ScoreProb[] = []
  for (let i = 0; i <= MAX_GOALS; i++) {
    for (let j = 0; j <= MAX_GOALS; j++) {
      const p = ph[i] * pa[j]
      if (i > j) home += p
      else if (i === j) draw += p
      else away += p
      if (i > 0 && j > 0) btts += p
      for (const l of LINES) if (i + j > l) over[String(l)] += p
      if (withScores && i <= 5 && j <= 5) scores.push({ home: i, away: j, p })
    }
  }
  const s = home + draw + away
  return {
    x12: { home: home / s, draw: draw / s, away: away / s },
    over,
    btts,
    topScores: withScores ? scores.sort((x, y) => y.p - x.p).slice(0, 5) : [],
  }
}

/** Подбор λ хозяев и гостей под рыночные вероятности (грубая сетка + уточнение). */
export function fitLambdas(target: Probs1x2, over25?: number | null): { home: number; away: number } {
  const loss = (lh: number, la: number) => {
    const p = poisson(lh, la, false)
    let e = (p.x12.home - target.home) ** 2 + (p.x12.away - target.away) ** 2 + (p.x12.draw - target.draw) ** 2
    if (over25 != null) e += (p.over['2.5'] - over25) ** 2
    return e
  }
  let best = { lh: 1.4, la: 1.1, e: Infinity }
  for (let lh = 0.2; lh <= 4.01; lh += 0.1) {
    for (let la = 0.2; la <= 4.01; la += 0.1) {
      const e = loss(lh, la)
      if (e < best.e) best = { lh, la, e }
    }
  }
  const { lh: ch, la: ca } = best
  for (let lh = ch - 0.1; lh <= ch + 0.1001; lh += 0.02) {
    for (let la = ca - 0.1; la <= ca + 0.1001; la += 0.02) {
      if (lh <= 0.05 || la <= 0.05) continue
      const e = loss(lh, la)
      if (e < best.e) best = { lh, la, e }
    }
  }
  return { home: Math.round(best.lh * 100) / 100, away: Math.round(best.la * 100) / 100 }
}

// ─── Итоговая модель ─────────────────────────────────────────────────────────

export type ModelOutput = {
  source: 'market+xg' | 'market' | 'xg'
  x12: Probs1x2
  lambdas: { home: number; away: number }
  over: Record<string, number>
  btts: number
  topScores: ScoreProb[]
}

export function buildModel(cons: Consensus, glicko: Glicko | null): ModelOutput | null {
  const gx = glicko?.homeXg && glicko?.awayXg ? { home: glicko.homeXg, away: glicko.awayXg } : null
  let lambdas: { home: number; away: number } | null = null
  let source: ModelOutput['source'] = 'market'
  if (cons.x12) {
    const m = fitLambdas(cons.x12, cons.over['2.5'])
    lambdas = gx ? { home: 0.75 * m.home + 0.25 * gx.home, away: 0.75 * m.away + 0.25 * gx.away } : m
    source = gx ? 'market+xg' : 'market'
  } else if (gx) {
    lambdas = gx
    source = 'xg'
  }
  if (!lambdas) return null
  const p = poisson(lambdas.home, lambdas.away)
  // рынок точнее модели: вероятности исходов берём из консенсуса, если он есть
  const x12 = cons.x12
    ? {
        home: 0.85 * cons.x12.home + 0.15 * p.x12.home,
        draw: 0.85 * cons.x12.draw + 0.15 * p.x12.draw,
        away: 0.85 * cons.x12.away + 0.15 * p.x12.away,
      }
    : p.x12
  const over: Record<string, number> = { ...p.over }
  for (const [line, v] of Object.entries(cons.over)) {
    if (over[line] !== undefined) over[line] = 0.8 * v + 0.2 * over[line]
  }
  const btts = cons.btts != null ? 0.8 * cons.btts + 0.2 * p.btts : p.btts
  return {
    source,
    x12,
    lambdas: { home: Math.round(lambdas.home * 100) / 100, away: Math.round(lambdas.away * 100) / 100 },
    over,
    btts,
    topScores: p.topScores,
  }
}

// ─── Кандидаты в прогноз и value ─────────────────────────────────────────────

export type OfferQuote = { value: number; opening: number | null; bookmakerId: number; bookmakerName: string; partner?: Partner }

export type Candidate = {
  key: string
  market: '1x2' | 'dc' | 'total' | 'btts'
  /** «П1», «ТБ 2.5», «Обе забьют» */
  label: string
  prob: number
  fairOdd: number
  best: OfferQuote | null
  bestPartner: OfferQuote | null
  /** Перевес по лучшему доступному коэффициенту (партнёрскому, если есть). */
  ev: number | null
}

type Getter = (b: BookOdds) => Quote | undefined

function offers(books: BookOdds[], get: Getter) {
  let best: OfferQuote | null = null
  let bestPartner: OfferQuote | null = null
  for (const b of books) {
    const q = get(b)
    if (!q) continue
    const partner = partnerForApiBookmaker(b.bookmakerId, b.bookmakerName)
    const o: OfferQuote = { value: q.value, opening: q.opening, bookmakerId: b.bookmakerId, bookmakerName: b.bookmakerName, partner }
    if (!best || q.value > best.value) best = o
    if (partner && (!bestPartner || q.value > bestPartner.value)) bestPartner = o
  }
  return { best, bestPartner }
}

export function buildCandidates(books: BookOdds[], model: ModelOutput | null): Candidate[] {
  if (!model) return []
  const out: Candidate[] = []
  const add = (key: string, market: Candidate['market'], label: string, prob: number, get: Getter | null) => {
    if (!(prob > 0.02 && prob < 0.98)) return
    const { best, bestPartner } = get ? offers(books, get) : { best: null, bestPartner: null }
    const target = bestPartner ?? best
    out.push({
      key,
      market,
      label,
      prob,
      fairOdd: 1 / prob,
      best,
      bestPartner,
      ev: target ? prob * target.value - 1 : null,
    })
  }
  const x = model.x12
  add('home', '1x2', 'П1', x.home, (b) => b.x12?.home)
  add('draw', '1x2', 'Х', x.draw, (b) => b.x12?.draw)
  add('away', '1x2', 'П2', x.away, (b) => b.x12?.away)
  add('hd', 'dc', '1X', x.home + x.draw, (b) => b.dc?.hd)
  add('da', 'dc', 'X2', x.draw + x.away, (b) => b.dc?.da)
  add('ha', 'dc', '12', x.home + x.away, (b) => b.dc?.ha)
  for (const line of LINES) {
    const po = model.over[String(line)]
    if (po === undefined) continue
    add(`over${line}`, 'total', `ТБ ${line}`, po, (b) => b.totals.find((t) => t.line === line)?.over)
    add(`under${line}`, 'total', `ТМ ${line}`, 1 - po, (b) => b.totals.find((t) => t.line === line)?.under)
  }
  add('bttsYes', 'btts', 'Обе забьют', model.btts, (b) => b.btts?.yes)
  add('bttsNo', 'btts', 'Обе не забьют', 1 - model.btts, (b) => b.btts?.no)
  return out
}

export type Pick = {
  candidate: Candidate
  kind: 'value' | 'probability'
  /** 1–5 */
  confidence: number
}

export const VALUE_EV = 0.035

/**
 * Порог перевеса растёт с коэффициентом: на длинных коэффициентах разброс
 * линий больше, и «перевес» чаще оказывается шумом. 2.00 → 4.5%, 3.50 → 7.3%.
 */
export function valueThreshold(odd: number): number {
  return VALUE_EV + 0.011 * Math.max(0, odd - 1)
}

export function isValue(c: Candidate): boolean {
  const q = c.bestPartner ?? c.best
  if (!q || c.ev === null) return false
  return q.value >= 1.3 && q.value <= 4 && c.prob >= 0.25 && c.ev >= valueThreshold(q.value)
}

export function choosePick(cands: Candidate[]): Pick | null {
  const priced = cands.filter((c) => c.best)
  if (!priced.length) return null
  const values = priced.filter(isValue).sort((a, b) => (b.ev ?? 0) - (a.ev ?? 0) || b.prob - a.prob)
  if (values.length) {
    const c = values[0]
    const confidence = Math.min(5, Math.max(2, Math.round(2 + (c.ev ?? 0) * 20 + (c.prob - 0.4) * 4)))
    return { candidate: c, kind: 'value', confidence }
  }
  // без value — самый вероятный исход с «играбельным» коэффициентом, без ставок в явный минус
  const playable = priced
    .filter((c) => (c.bestPartner ?? c.best)!.value >= 1.45 && (c.ev ?? -1) > -0.06)
    .sort((a, b) => b.prob - a.prob)
  const c = playable[0]
  if (!c) return null
  const confidence = c.prob >= 0.68 ? 4 : c.prob >= 0.58 ? 3 : c.prob >= 0.48 ? 2 : 1
  return { candidate: c, kind: 'probability', confidence }
}
