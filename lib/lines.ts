/**
 * Линия одного букмекера — для «Главных матчей» и подборок «Голевые матчи» и «Движение коэффициентов».
 *
 * Каждая цифра — по одному букмекеру и одному снимку линии: средние по разным букмекерам и моментам
 * смешивают несопоставимое. Букмекер — первый легальный партнёр из `PARTNERS`, у кого есть нужный рынок;
 * зарубежных букмекеров по имени не показываем. Время снимка — когда мы взяли линию (`OddsSnap.at`): своего
 * времени обновления у доматчевых коэффициентов SStats нет. История у одного исхода — две честные точки:
 * открытие линии и последнее значение; кривую между ними не рисуем.
 */
import { PARTNERS, partnerForApiBookmaker, type Partner } from '@/config/bookmakers'
import { formatDayMonth, formatTime, ymdInTz } from './format'
import { totalAt, type BookOdds, type Quote } from './odds'

/** Коэффициенты всех букмекеров на матч и момент, когда мы их взяли. */
export type OddsSnap = { books: BookOdds[]; at: number }

export type RefBook = { partner: Partner; book: BookOdds }

/** Букмекеры-партнёры из ответа — в порядке `PARTNERS` (его можно поменять через PARTNERS_ORDER). */
export function partnerBooks(books: BookOdds[]): RefBook[] {
  const out: RefBook[] = []
  for (const partner of PARTNERS) {
    const book = books.find((b) => partnerForApiBookmaker(b.bookmakerId, b.bookmakerName)?.slug === partner.slug)
    if (book) out.push({ partner, book })
  }
  return out
}

type Source = { bookmaker: string; slug: string; at: number }

/** Строка «П1 · ничья · П2» одного букмекера. */
export type X12Line = Source & { home: number; draw: number; away: number }

export function x12Line(snap: OddsSnap | null | undefined): X12Line | null {
  if (!snap) return null
  for (const { partner, book } of partnerBooks(snap.books)) {
    const x = book.x12
    if (x?.home && x.draw && x.away) {
      return { bookmaker: partner.name, slug: partner.slug, at: snap.at, home: x.home.value, draw: x.draw.value, away: x.away.value }
    }
  }
  return null
}

/** Шанс 3+ голов по паре «больше 2,5 / меньше 2,5» одного букмекера. */
export type GoalsLine = Source & { p: number; over: number; under: number }

/**
 * Шанс 3+ голов — из пары кэфов «больше 2,5 / меньше 2,5» одного букмекера в одном снимке линии, без маржи:
 * (1/ТБ) / (1/ТБ + 1/ТМ). Средние голы команд вероятность не подменяют. Пары нет — оценки нет.
 */
export function goalsLine(snap: OddsSnap | null | undefined): GoalsLine | null {
  if (!snap) return null
  for (const { partner, book } of partnerBooks(snap.books)) {
    const t = totalAt(book, 2.5)
    if (!t?.over || !t.under) continue
    const io = 1 / t.over.value
    const iu = 1 / t.under.value
    // сумма обратных — 1 плюс маржа; вне разумных пределов — битая пара
    if (io + iu < 0.97 || io + iu > 1.25) continue
    return { bookmaker: partner.name, slug: partner.slug, at: snap.at, p: io / (io + iu), over: t.over.value, under: t.under.value }
  }
  return null
}

export type MoveKey = 'home' | 'draw' | 'away' | 'over25' | 'under25'

/** Изменение кэфа одного исхода у одного букмекера: открытие линии → последнее значение. */
export type LineMove = Source & { key: MoveKey; from: number; to: number; change: number }

const pairOf = (q: Quote | undefined): [number, number] | null => (q && q.opening && q.opening > 1 && q.value > 1 ? [q.opening, q.value] : null)

/**
 * Движение линии одного букмекера — первого партнёра, у кого есть кэфы открытия: по исходам 1X2 и тоталу 2,5.
 * `change` — относительное изменение (−0.17 — кэф упал на 17%).
 */
export function lineMoves(snap: OddsSnap | null | undefined): LineMove[] {
  if (!snap) return []
  for (const { partner, book } of partnerBooks(snap.books)) {
    const t = totalAt(book, 2.5)
    const cells: [MoveKey, Quote | undefined][] = [
      ['home', book.x12?.home],
      ['draw', book.x12?.draw],
      ['away', book.x12?.away],
      ['over25', t?.over],
      ['under25', t?.under],
    ]
    const out: LineMove[] = []
    for (const [key, q] of cells) {
      const p = pairOf(q)
      if (p) out.push({ bookmaker: partner.name, slug: partner.slug, at: snap.at, key, from: p[0], to: p[1], change: p[1] / p[0] - 1 })
    }
    if (out.length) return out
  }
  return []
}

/** Самое заметное движение 1X2 у матча (от 8% в любую сторону) — для примеров и фактов. */
export function biggestMove(moves: LineMove[], min = 0.08): LineMove | null {
  let best: LineMove | null = null
  for (const mv of moves) {
    if (mv.key !== 'home' && mv.key !== 'draw' && mv.key !== 'away') continue
    if (Math.abs(mv.change) < min) continue
    if (!best || Math.abs(mv.change) > Math.abs(best.change)) best = mv
  }
  return best
}

/**
 * Период сравнения: от открытия линии до момента снимка; если снимок сделан после начала матча, API отдаёт
 * кэфы закрытия — тогда «до начала матча». Время снимка в другой день, чем матч, — с датой.
 */
export function periodEnd(at: number, kickoff: number): string {
  if (at >= kickoff) return 'до начала матча'
  return ymdInTz(at) === ymdInTz(kickoff) ? `до ${formatTime(at)}` : `до ${formatDayMonth(at)}, ${formatTime(at)}`
}

/** Подпись конца периода на графике: «19:25» или «начало матча». */
export const periodEndLabel = (at: number, kickoff: number) => (at >= kickoff ? 'начало матча' : periodEnd(at, kickoff).replace(/^до /, ''))

/** «с открытия линии до 19:25» / «с открытия линии до начала матча». */
export const periodText = (at: number, kickoff: number) => `с открытия линии ${periodEnd(at, kickoff)}`

/** Исход словами — для подписей движения линии. */
export function moveOutcome(key: MoveKey, teams: { home: string; away: string }): string {
  switch (key) {
    case 'home':
      return `победа «${teams.home}»`
    case 'away':
      return `победа «${teams.away}»`
    case 'draw':
      return 'ничья'
    case 'over25':
      return 'больше 2,5 голов'
    case 'under25':
      return 'меньше 2,5 голов'
  }
}
