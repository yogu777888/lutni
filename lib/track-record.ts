import { CHANCE_BINS, binOf, emptyTally, type ChanceBin, type ChanceTally } from './chance-check'
import { betWon } from './model'

/**
 * «История точности» (владелец: архив оценок — «показывать реальные результаты предыдущих прогнозов, включая ошибки»):
 * оценку tag.bet записываем до начала матча и больше не трогаем, после матча сверяем с итогом основного времени.
 * Здесь — только расчёт по готовым записям; запись и чтение с диска — `lib/forecast-log.ts`.
 */

/**
 * «Выгодно», которое показывали до начала матча, — проверка вживую (владелец согласился: «записывать кэф в момент оценки и
 * перед стартом»): кэф легального букмекера, когда ставка впервые стала выгодной (`first`), и его последний кэф на ту же
 * ставку перед началом (`last`: разбор обновляется каждые 5–10 минут — почти кэф закрытия). К началу кэф упал — рынок
 * пошёл за нашей оценкой; на прошлых матчах это не проверить — там только кэфы закрытия.
 */
export type ValueTrack = {
  /** ставка — ключ кандидата: «home», «hd», «over2.5», «bttsYes»… */
  key: string
  /** букмекер-партнёр */
  slug: string
  /** наш шанс, когда ставка стала выгодной */
  prob: number
  first: number
  firstAt: number
  last: number
  lastAt: number
}

export type Forecast = {
  id: number
  /** начало матча */
  ts: number
  league: string
  leagueId: number
  featured: boolean
  home: string
  away: string
  /** адрес страницы матча */
  href: string
  /** последнее обновление оценки — до начала матча */
  at: number
  /** оценка tag.bet: исходы, «3 гола и больше», «обе забьют» */
  p: { home: number; draw: number; away: number; over25: number | null; btts: number | null }
  /** линия букмекеров без маржи — с чем сравниваем */
  line: { home: number; draw: number; away: number; over25: number | null; btts: number | null } | null
  /** ставки «Выгодно» до начала матча — кэф тогда и перед стартом */
  value?: ValueTrack[]
  /** счёт основного времени; нет — матч ещё не сверен */
  res?: { home: number; away: number }
  /** отменён или перенесён — в расчёт не идёт */
  void?: true
}

export type Outcome = 'home' | 'draw' | 'away'
export const resultOf = (r: { home: number; away: number }): Outcome => (r.home > r.away ? 'home' : r.home < r.away ? 'away' : 'draw')

/** Многоисходная оценка Брайера для 1X2: сумма квадратов ошибок по трём исходам, 0 — идеально, 2 — хуже некуда. */
export function brier1x2(p: { home: number; draw: number; away: number }, won: Outcome): number {
  return (['home', 'draw', 'away'] as const).reduce((s, k) => s + (p[k] - (k === won ? 1 : 0)) ** 2, 0)
}
/** Оценка Брайера для события «да / нет»: 0 — идеально, 1 — хуже некуда. */
export const brier2 = (p: number, yes: boolean) => (p - (yes ? 1 : 0)) ** 2

export type MarketScore = {
  /** матчей в расчёте */
  n: number
  /** доля матчей, где сбылся исход, которому давали больше всего */
  top: number
  /** средняя оценка Брайера tag.bet */
  ours: number
  /** то же по линии букмекеров (только матчи, где линия была) */
  line: number | null
  /** то же «наугад»: всем исходам поровну */
  even: number
}

export type TrackRecord = {
  /** сверено матчей */
  settled: number
  /** ждут итога */
  pending: number
  from: number | null
  to: number | null
  x12: MarketScore | null
  over25: MarketScore | null
  btts: MarketScore | null
  /** «давали — сбылось» по исходам 1X2 */
  bins: ChanceBin[]
  /** самые неожиданные итоги: шанс того, что случилось, был ниже 25% */
  misses: Miss[]
  value: ValueScore | null
}

export type Miss = { f: Forecast; won: Outcome; p: number }

/** «Выгодно» в сверенных матчах: куда пошёл кэф к началу и как сбывалось. */
export type ValueScore = {
  /** ставок */
  n: number
  /** доля ставок, у которых к началу кэф упал / вырос */
  down: number
  up: number
  /** на сколько в среднем изменился кэф к началу: кэф тогда / кэф перед стартом − 1 (плюс — упал) */
  move: number
  /** давали в среднем */
  prob: number
  /** сбылось */
  hit: number
}

/** Порог для корзины на этой странице ниже, чем у «Проверки шансов»: архив копится с нуля, а число исходов подписано. */
export const TRACK_MIN_BIN = 15

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

export function trackRecord(list: Forecast[], { since = 0, missesSince = 0 } = {}): TrackRecord {
  const done = list.filter((f) => f.res && !f.void && f.ts >= since)
  const pending = list.filter((f) => !f.res && !f.void && f.ts >= since).length
  const x12: { ours: number[]; line: number[]; even: number[]; top: number[] } = { ours: [], line: [], even: [], top: [] }
  const two = (key: 'over25' | 'btts', yes: (r: { home: number; away: number }) => boolean) => {
    const ours: number[] = []
    const line: number[] = []
    const top: number[] = []
    for (const f of done) {
      const p = f.p[key]
      if (p == null) continue
      const y = yes(f.res!)
      ours.push(brier2(p, y))
      top.push(p === 0.5 ? 0.5 : Number(p > 0.5 === y))
      const l = f.line?.[key]
      if (l != null) line.push(brier2(l, y))
    }
    return ours.length ? { n: ours.length, top: avg(top), ours: avg(ours), line: line.length ? avg(line) : null, even: 0.25 } : null
  }
  const t: ChanceTally = emptyTally()
  const misses: Miss[] = []
  for (const f of done) {
    const won = resultOf(f.res!)
    x12.ours.push(brier1x2(f.p, won))
    x12.even.push(brier1x2({ home: 1 / 3, draw: 1 / 3, away: 1 / 3 }, won))
    if (f.line) x12.line.push(brier1x2(f.line, won))
    const best = Math.max(f.p.home, f.p.draw, f.p.away)
    x12.top.push(f.p[won] === best ? 1 : 0)
    t.matches++
    for (const k of ['home', 'draw', 'away'] as const) {
      const i = binOf(f.p[k])
      if (i < 0) continue
      t.n[i]++
      t.sum[i] += f.p[k]
      if (k === won) t.hits[i]++
    }
    if (f.featured && f.ts >= missesSince && f.p[won] < 0.25) misses.push({ f, won, p: f.p[won] })
  }
  misses.sort((a, b) => a.p - b.p || b.f.ts - a.f.ts)
  const bins: ChanceBin[] = []
  for (let i = 0; i < CHANCE_BINS; i++) {
    if (t.n[i] >= TRACK_MIN_BIN) bins.push({ at: (i + 1) * 10, n: t.n[i], p: t.sum[i] / t.n[i], hit: t.hits[i] / t.n[i] })
  }
  const vs = done.flatMap((f) => (f.value ?? []).map((v) => ({ v, won: betWon(v.key, f.res!.home, f.res!.away) })))
  const ts = done.map((f) => f.ts)
  return {
    settled: done.length,
    pending,
    from: ts.length ? Math.min(...ts) : null,
    to: ts.length ? Math.max(...ts) : null,
    x12: done.length
      ? { n: done.length, top: avg(x12.top), ours: avg(x12.ours), line: x12.line.length ? avg(x12.line) : null, even: avg(x12.even) }
      : null,
    over25: two('over25', (r) => r.home + r.away >= 3),
    btts: two('btts', (r) => r.home > 0 && r.away > 0),
    bins,
    misses: misses.slice(0, 10),
    value: vs.length
      ? {
          n: vs.length,
          down: avg(vs.map(({ v }) => Number(v.last < v.first))),
          up: avg(vs.map(({ v }) => Number(v.last > v.first))),
          move: avg(vs.map(({ v }) => v.first / v.last - 1)),
          prob: avg(vs.map(({ v }) => v.prob)),
          hit: avg(vs.map(({ won }) => Number(won))),
        }
      : null,
  }
}
