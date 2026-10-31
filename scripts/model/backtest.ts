/**
 * Проверка модели на прошлых сезонах (владелец: «давай модель»; как проверяем — договорились в чате): история из
 * `fetch.ts`, модель — те же функции, что на сайте (`buildConsensus`, `buildModel`, `buildCandidates`, `isValue`,
 * `choosePick` из `lib/model.ts`), поэтому отчёт — про ту модель, что работает сейчас, а не про её пересказ.
 *
 * Что считаем (отчёт — `.data/backtest/report.md` и в консоль):
 *  1. Исход матча: оценка Брайера и логарифмическая ошибка у линии Pinnacle, консенсуса букмекеров, модели сайта,
 *     модели SStats (Glicko) — на матчах, где скачаны кэфы всех букмекеров и рейтинг.
 *  2. Веса модели (85/15 исход, 75/25 голы с xG SStats, 80/20 тоталы): сетка, подбор на старой половине матчей,
 *     проверка на свежей — новая версия лучше, только если разница больше разброса.
 *  3. Голы: «3 гола и больше», «Обе забьют» — модель против линии; как сбываются «Много голов», «Мало голов», «Обе забьют».
 *  4. «Давали — сбылось» у модели (корзины по 10%).
 *  5. «Выгодно» — правила сайта (`isValue`/`choosePick`) против кэфов Марафона (PARI в истории SStats нет): сколько
 *     выгодных ставок и чем бы кончилась ставка по 1 условной единице на каждую, по кэфу закрытия.
 * Итог основного времени (`scoreFT`), как в «Проверке шансов».
 *
 *   npm run model:backtest   (после `npm run model:fetch`; считает ~30 с на 1500 матчей)
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { partnerForApiBookmaker } from '@/config/bookmakers'
import {
  buildCandidates,
  buildConsensus,
  buildModel,
  choosePick,
  fitLambdas,
  isValue,
  poisson,
  type Consensus,
  type ModelOutput,
  type Probs1x2,
} from '@/lib/model'
import { fair1x2, type BookOdds } from '@/lib/odds'
import { normalizeBookOdds, normalizeGame, normalizeGlicko } from '@/lib/sstats/normalize'
import type { RawBookmakerOdds, RawGame, RawGameGlicko } from '@/lib/sstats/types'
import type { Glicko, Match } from '@/lib/types'
import { DIR, GAME_LEAGUES, GAME_YEARS, LIST_LEAGUES, YEARS, listFile } from './data'

// ─── Данные ──────────────────────────────────────────────────────────────────

type Game = { m: Match; league: number; year: number; h: number; a: number }

const NAMES: Record<number, string> = {
  39: 'АПЛ', 140: 'Ла Лига', 135: 'Серия A', 78: 'Бундеслига', 61: 'Лига 1', 235: 'РПЛ', 2: 'ЛЧ', 3: 'ЛЕ', 848: 'ЛК',
  88: 'Эредивизи', 94: 'Португалия', 203: 'Турция', 40: 'Чемпионшип',
}

function loadLists(): Game[] {
  const out: Game[] = []
  for (const year of YEARS)
    for (const league of LIST_LEAGUES) {
      const f = listFile(league, year)
      if (!existsSync(f)) continue
      const raw = (JSON.parse(readFileSync(f, 'utf8')) as { data?: RawGame[] }).data ?? []
      for (const g of raw) {
        const m = normalizeGame(g, 0)
        if (m.status !== 'finished' || !m.scoreFT) continue
        out.push({ m, league, year, h: m.scoreFT.home, a: m.scoreFT.away })
      }
    }
  return out.sort((x, y) => x.m.ts - y.m.ts)
}

const readData = <T>(file: string): T | null => (existsSync(file) ? ((JSON.parse(readFileSync(file, 'utf8')) as { data?: T }).data ?? null) : null)

type Full = Game & { books: BookOdds[]; glicko: Glicko | null; cons: Consensus; model: ModelOutput | null; lamMarket: { home: number; away: number } | null }

function loadFull(games: Game[]): Full[] {
  const out: Full[] = []
  for (const g of games) {
    if (!GAME_LEAGUES.includes(g.league) || !GAME_YEARS.includes(g.year)) continue
    const fo = path.join(DIR, 'odds', `${g.m.id}.json`)
    const fg = path.join(DIR, 'glicko', `${g.m.id}.json`)
    if (!existsSync(fo) || !existsSync(fg)) continue
    const books = normalizeBookOdds(readData<RawBookmakerOdds[]>(fo), { home: g.m.home.original, away: g.m.away.original })
    if (!books.length) continue
    const glicko = normalizeGlicko(readData<RawGameGlicko>(fg))
    // как `modelFor` в lib/data.ts: консенсус по всем букмекерам, модель, кандидаты
    const cons = buildConsensus(books)
    if (!cons.x12) continue
    const model = buildModel(cons, glicko)
    out.push({ ...g, books, glicko, cons, model, lamMarket: fitLambdas(cons.x12, cons.over['2.5']) })
  }
  return out
}

// ─── Мерки ───────────────────────────────────────────────────────────────────

type Res = 'home' | 'draw' | 'away'
const resOf = (h: number, a: number): Res => (h > a ? 'home' : h === a ? 'draw' : 'away')
const ll = (p: Probs1x2, r: Res) => -Math.log(Math.max(p[r], 1e-6))
const brier = (p: Probs1x2, r: Res) => (['home', 'draw', 'away'] as Res[]).reduce((s, k) => s + (p[k] - (k === r ? 1 : 0)) ** 2, 0)
const ll2 = (p: number, hit: boolean) => -Math.log(Math.max(hit ? p : 1 - p, 1e-6))

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length)
/** Среднее и 95%-й разброс среднего (нормальное приближение — выборки от сотен матчей). */
function ci(xs: number[]) {
  const m = mean(xs)
  const sd = Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, xs.length - 1))
  return { m, lo: m - (1.96 * sd) / Math.sqrt(xs.length), hi: m + (1.96 * sd) / Math.sqrt(xs.length), n: xs.length }
}

const f3 = (x: number) => x.toFixed(4)
const pc = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`
const sg = (x: number, d = 1) => `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(d)}%`

// ─── Модель с другими весами (та же формула, что `buildModel`) ──────────────

type W = { x12: number; lam: number; goals: number }
export const CURRENT: W = { x12: 0.15, lam: 0.25, goals: 0.2 }

function modelWith(f: Full, w: W): { x12: Probs1x2; over25: number | null; btts: number } | null {
  const gx = f.glicko?.homeXg && f.glicko?.awayXg ? { home: f.glicko.homeXg, away: f.glicko.awayXg } : null
  const m = f.lamMarket
  if (!m || !f.cons.x12) return null
  const lam = gx ? { home: (1 - w.lam) * m.home + w.lam * gx.home, away: (1 - w.lam) * m.away + w.lam * gx.away } : m
  const p = poisson(lam.home, lam.away, false)
  const c = f.cons.x12
  const x12 = { home: (1 - w.x12) * c.home + w.x12 * p.x12.home, draw: (1 - w.x12) * c.draw + w.x12 * p.x12.draw, away: (1 - w.x12) * c.away + w.x12 * p.x12.away }
  const co = f.cons.over['2.5']
  return {
    x12,
    over25: co != null ? (1 - w.goals) * co + w.goals * p.over['2.5'] : p.over['2.5'],
    btts: f.cons.btts != null ? (1 - w.goals) * f.cons.btts + w.goals * p.btts : p.btts,
  }
}

// ─── Ставки ──────────────────────────────────────────────────────────────────

function won(key: string, h: number, a: number): boolean {
  if (key === 'home') return h > a
  if (key === 'draw') return h === a
  if (key === 'away') return h < a
  if (key === 'hd') return h >= a
  if (key === 'da') return h <= a
  if (key === 'ha') return h !== a
  if (key === 'bttsYes') return h > 0 && a > 0
  if (key === 'bttsNo') return !(h > 0 && a > 0)
  const t = /^(over|under)([\d.]+)$/.exec(key)
  if (t) return t[1] === 'over' ? h + a > Number(t[2]) : h + a < Number(t[2])
  throw new Error(`ставка ${key}`)
}

const MARKET: Record<string, string> = { '1x2': 'исход', dc: 'двойной шанс', total: 'тотал', btts: 'обе забьют' }

// ─── Отчёт ───────────────────────────────────────────────────────────────────

const lines: string[] = []
const say = (s = '') => lines.push(s)
const table = (head: string[], rows: (string | number)[][]) => {
  say(`| ${head.join(' | ')} |`)
  say(`|${head.map(() => '---').join('|')}|`)
  for (const r of rows) say(`| ${r.join(' | ')} |`)
  say()
}

const games = loadLists()
const full = loadFull(games)

say(`# Проверка модели tag.bet на прошлых матчах`)
say()
say(`Матчей в списках сезонов: ${games.length}; с кэфами всех букмекеров и рейтингом SStats: ${full.length}.`)
const byLeague = new Map<number, number>()
for (const f of full) byLeague.set(f.league, (byLeague.get(f.league) ?? 0) + 1)
say(`По лигам: ${[...byLeague].map(([l, n]) => `${NAMES[l]} — ${n}`).join(', ')}.`)
if (full.length) say(`Период: ${new Date(full[0].m.ts).toISOString().slice(0, 10)} — ${new Date(full[full.length - 1].m.ts).toISOString().slice(0, 10)}.`)
say()

// модель на сайте и её копия с весами должны совпадать — иначе сетка ниже не про ту модель
let drift = 0
for (const f of full) {
  const a = f.model?.x12
  const b = modelWith(f, CURRENT)?.x12
  if (a && b) drift = Math.max(drift, Math.abs(a.home - b.home), Math.abs(a.draw - b.draw))
}
if (drift > 0.003) say(`**Внимание:** копия модели расходится с сайтом на ${pc(drift, 2)} — сетку весов не читать.\n`)

// 1. Исход матча
const pinOf = (f: Full) => fair1x2(f.books.find((b) => /pinnacle/i.test(b.bookmakerName))?.x12)
const sources: [string, (f: Full) => Probs1x2 | null][] = [
  ['Консенсус букмекеров (честная цена)', (f) => f.cons.x12],
  ['Pinnacle без маржи', pinOf],
  ['Модель сайта сейчас', (f) => f.model?.x12 ?? null],
  // шансы рейтинга SStats — их же xG через Пуассона (на 1302 матчах совпали до четвёртого знака), поэтому одна строка
  ['Рейтинг SStats (Glicko, их xG)', (f) => (f.glicko?.homeXg && f.glicko.awayXg ? poisson(f.glicko.homeXg, f.glicko.awayXg, false).x12 : null)],
]
// сравниваем на одних и тех же матчах — где есть все источники
const common = full.filter((f) => sources.every(([, s]) => s(f)))
say(`## 1. Исход матча`)
say()
say(`${common.length} матчей, где есть все источники. Меньше — лучше. Δ — разница с консенсусом и её 95%-й разброс: если разброс задевает 0, разницы нет.`)
say()
const consLL = common.map((f) => ll(f.cons.x12!, resOf(f.h, f.a)))
table(
  ['Оценка', 'Логарифм. ошибка', 'Брайер', 'Δ к консенсусу'],
  sources.map(([name, s]) => {
    const l = common.map((f) => ll(s(f)!, resOf(f.h, f.a)))
    const d = ci(l.map((x, i) => x - consLL[i]))
    return [name, f3(mean(l)), f3(mean(common.map((f) => brier(s(f)!, resOf(f.h, f.a))))), name.startsWith('Консенсус') ? '—' : `${d.m >= 0 ? '+' : ''}${f3(d.m)} (${f3(d.lo)}…${f3(d.hi)})`]
  }),
)

// 2. Веса
say(`## 2. Веса модели`)
say()
const half = Math.floor(full.length / 2)
const train = full.slice(0, half)
const test = full.slice(half)
const gridLoss = (set: Full[], w: W) => {
  let x = 0
  let n = 0
  for (const f of set) {
    const p = modelWith(f, w)
    if (!p) continue
    x += ll(p.x12, resOf(f.h, f.a))
    n++
  }
  return x / Math.max(1, n)
}
// по каждой доле Пуассона в исходе — лучшая доля xG SStats на подборе (без доли Пуассона xG ни на что не влияет)
const grid = [0, 0.05, 0.1, 0.15, 0.2, 0.3].map((x12) => {
  const opts = [0, 0.25, 0.5, 0.75, 1].map((lam) => ({ x12, lam, goals: CURRENT.goals }))
  const w = opts.sort((a, b) => gridLoss(train, a) - gridLoss(train, b))[0]
  return { w, train: gridLoss(train, w), test: gridLoss(test, w) }
})
const best = [...grid].sort((a, b) => a.train - b.train)[0]
say(`Подбор — на первой половине матчей по времени (${train.length}), проверка — на второй (${test.length}). Исход матча, логарифмическая ошибка.`)
say()
const wName = (w: W) => `${Math.round((1 - w.x12) * 100)}/${Math.round(w.x12 * 100)}, xG SStats ${Math.round(w.lam * 100)}%`
table(
  ['Веса (линия/Пуассон, доля xG в голах)', 'Подбор', 'Проверка'],
  [
    [`сейчас: ${wName(CURRENT)}`, f3(gridLoss(train, CURRENT)), f3(gridLoss(test, CURRENT))],
    ...grid.map((g) => [`${g.w.x12 === 0 ? 'только консенсус' : wName(g.w)}${g === best ? ' — лучшее на подборе' : ''}`, f3(g.train), f3(g.test)]),
  ],
)
const dBest = ci(test.flatMap((f) => {
  const a = modelWith(f, best.w)
  const b = modelWith(f, CURRENT)
  return a && b ? [ll(a.x12, resOf(f.h, f.a)) - ll(b.x12, resOf(f.h, f.a))] : []
}))
const dCons = ci(test.flatMap((f) => {
  const b = modelWith(f, CURRENT)
  return b ? [ll(b.x12, resOf(f.h, f.a)) - ll(f.cons.x12!, resOf(f.h, f.a))] : []
}))
say(`На проверке лучшее с подбора против текущих весов: ${f3(dBest.m)} (${f3(dBest.lo)}…${f3(dBest.hi)}). Текущие веса против одного консенсуса: ${f3(dCons.m)} (${f3(dCons.lo)}…${f3(dCons.hi)}).`)
say()

// доля Пуассона в «3 гола и больше» и «Обе забьют» (сейчас 20%) — на тех же половинах
const goalLoss = (set: Full[], goals: number, k: 'over25' | 'btts') => {
  const xs = set.flatMap((f) => {
    const p = modelWith(f, { ...CURRENT, goals })
    const v = p?.[k]
    if (v == null || (k === 'over25' ? f.cons.over['2.5'] : f.cons.btts) == null) return []
    return [ll2(v, k === 'over25' ? f.h + f.a > 2.5 : f.h > 0 && f.a > 0)]
  })
  return mean(xs)
}
table(
  ['Доля Пуассона в голах', '3+ гола: подбор', '3+ гола: проверка', 'Обе забьют: подбор', 'Обе забьют: проверка'],
  [0, 0.1, 0.2, 0.3, 0.5].map((g) => [
    `${Math.round(g * 100)}%${g === CURRENT.goals ? ' (сейчас)' : ''}`,
    f3(goalLoss(train, g, 'over25')),
    f3(goalLoss(test, g, 'over25')),
    f3(goalLoss(train, g, 'btts')),
    f3(goalLoss(test, g, 'btts')),
  ]),
)

// 3. Голы
say(`## 3. Голы`)
say()
const goalRows: (string | number)[][] = []
for (const [name, cons, mod, hit] of [
  ['3 гола и больше', (f: Full) => f.cons.over['2.5'] ?? null, (f: Full) => f.model?.over['2.5'] ?? null, (f: Full) => f.h + f.a > 2.5],
  ['Обе забьют', (f: Full) => f.cons.btts, (f: Full) => f.model?.btts ?? null, (f: Full) => f.h > 0 && f.a > 0],
] as const) {
  const set = full.filter((f) => cons(f) != null && mod(f) != null)
  const lc = set.map((f) => ll2(cons(f)!, hit(f)))
  const lm = set.map((f) => ll2(mod(f)!, hit(f)))
  const d = ci(lm.map((x, i) => x - lc[i]))
  goalRows.push([name, set.length, f3(mean(lc)), f3(mean(lm)), `${d.m >= 0 ? '+' : ''}${f3(d.m)} (${f3(d.lo)}…${f3(d.hi)})`])
}
table(['Рынок', 'Матчей', 'Линия', 'Модель', 'Δ модель − линия'], goalRows)
const tagRows: (string | number)[][] = []
for (const [name, p, hit] of [
  ['Много голов (3+ от 57%)', (f: Full) => (f.model && (f.model.over['2.5'] ?? 0) >= 0.57 ? f.model.over['2.5'] : null), (f: Full) => f.h + f.a > 2.5],
  ['Мало голов (до 2 от 57%)', (f: Full) => (f.model && f.model.over['2.5'] != null && 1 - f.model.over['2.5'] >= 0.57 ? 1 - f.model.over['2.5'] : null), (f: Full) => f.h + f.a < 2.5],
  ['Обе забьют (от 57%)', (f: Full) => (f.model && f.model.btts >= 0.57 ? f.model.btts : null), (f: Full) => f.h > 0 && f.a > 0],
] as const) {
  const set = full.filter((f) => p(f) != null)
  tagRows.push([name, set.length, pc(mean(set.map((f) => p(f)!))), pc(mean(set.map((f) => (hit(f) ? 1 : 0))))])
}
say(`Подборки по модели — сколько матчей попало бы и как сбывалось:`)
say()
table(['Подборка', 'Матчей', 'Давали в среднем', 'Сбылось'], tagRows)

// 4. Калибровка
say(`## 4. Давали — сбылось (модель сайта, все три исхода)`)
say()
const bins = new Map<number, { p: number[]; hit: number[] }>()
for (const f of full) {
  if (!f.model) continue
  const r = resOf(f.h, f.a)
  for (const k of ['home', 'draw', 'away'] as Res[]) {
    const p = f.model.x12[k]
    const b = Math.min(9, Math.floor(p * 10))
    const e = bins.get(b) ?? { p: [], hit: [] }
    e.p.push(p)
    e.hit.push(k === r ? 1 : 0)
    bins.set(b, e)
  }
}
table(
  ['Шанс', 'Исходов', 'Давали', 'Сбылось'],
  [...bins].sort((a, b) => a[0] - b[0]).filter(([, e]) => e.p.length >= 30).map(([b, e]) => [`${b * 10}–${b * 10 + 10}%`, e.p.length, pc(mean(e.p)), pc(mean(e.hit))]),
)

// 5. «Выгодно»
say(`## 5. «Выгодно» против кэфов Марафона`)
say()
const withMar = full.filter((f) => f.books.some((b) => partnerForApiBookmaker(b.bookmakerId, b.bookmakerName)?.slug === 'marathonbet'))
type Bet = { key: string; market: string; odd: number; ev: number; prob: number; profit: number }
const pickBets: Bet[] = []
const allValue: Bet[] = []
const consValue: Bet[] = []
for (const f of withMar) {
  const cands = buildCandidates(f.books, f.model)
  const settle = (c: (typeof cands)[number]): Bet => {
    const q = (c.bestPartner ?? c.best)!
    return { key: c.key, market: c.market, odd: q.value, ev: c.ev!, prob: c.prob, profit: won(c.key, f.h, f.a) ? q.value - 1 : -1 }
  }
  const pick = choosePick(cands)
  if (pick?.kind === 'value') pickBets.push(settle(pick.candidate))
  for (const c of cands.filter(isValue)) allValue.push(settle(c))
  // та же проверка, но шанс — чистый консенсус без доли Пуассона: «выгодно» только там, где Марафон платит больше рынка
  const consModel = f.cons.x12 ? ({ ...f.model!, x12: f.cons.x12, over: { ...f.model!.over, ...f.cons.over }, btts: f.cons.btts ?? f.model!.btts } as ModelOutput) : null
  for (const c of buildCandidates(f.books, consModel).filter(isValue)) consValue.push(settle(c))
}
say(`Матчей с линией Марафона: ${withMar.length}. Кэфы — закрытия (перед самым началом); на сайте «Выгодно» считается раньше, по текущей линии. PARI в истории нет — проверить его так нельзя.`)
say()
const roiRow = (name: string, bets: Bet[]) => {
  const r = ci(bets.map((b) => b.profit))
  return [name, bets.length, pc(bets.length / Math.max(1, withMar.length), 0), sg(mean(bets.map((b) => b.ev))), bets.length ? `${sg(r.m)} (${sg(r.lo)}…${sg(r.hi)})` : '—']
}
table(
  ['Что ставим', 'Ставок', 'Доля матчей', 'Обещанная выгода', 'Итог на 1 ставку'],
  [
    roiRow('«Выгодная ставка» сайта (одна на матч)', pickBets),
    roiRow('Все «выгодные» исходы', allValue),
    roiRow('«Выгодно» по чистому консенсусу', consValue),
  ],
)
const byMarket = new Map<string, Bet[]>()
for (const b of pickBets) byMarket.set(b.market, [...(byMarket.get(b.market) ?? []), b])
table(['Рынок «Выгодной ставки»', 'Ставок', 'Итог на 1 ставку'], [...byMarket].map(([k, bs]) => {
  const r = ci(bs.map((b) => b.profit))
  return [MARKET[k] ?? k, bs.length, `${sg(r.m)} (${sg(r.lo)}…${sg(r.hi)})`]
}))
const marMargin = mean(withMar.flatMap((f) => {
  const b = f.books.find((x) => partnerForApiBookmaker(x.bookmakerId, x.bookmakerName)?.slug === 'marathonbet')
  const fx = fair1x2(b?.x12)
  return fx ? [fx.margin] : []
}))
say(`Для сравнения: маржа Марафона на исход матча — ${pc(marMargin)}; ставка наугад в среднем теряет примерно столько же.`)

const report = lines.join('\n')
writeFileSync(path.join(DIR, 'report.md'), report)
console.log(report)
