/**
 * «Сводка дня» — первый экран страницы дня: «Главные матчи» (`mainMatches`) и три подборки под ними —
 * «Все матчи» (`dayCounts`), «Голевые матчи» (`goalsPicks`) и «Движение коэффициентов» (`linePicks`,
 * пример — `moveExample`). Те же функции строят страницы подборок: превью на главной и страница не расходятся.
 * Цифры подборок — по линии одного букмекера (lib/lines.ts): у матчей без снимка линии их нет, а не нули.
 */
import { featuredRank } from '@/config/leagues'
import type { FeedItem } from './data'
import { appNow } from './format'
import { goalsLine, lineMoves, type GoalsLine, type LineMove, type MoveKey, type OddsSnap } from './lines'
import { interest, isLive, isMinor } from './rank'

/** Главных матчей в большом блоке. */
const MAINS_SHOWN = 5

const isOpen = (it: FeedItem) => it.match.status === 'scheduled' || isLive(it.match)

/** Вес матча для «Главных матчей»: громкость турнира важнее тегов. */
export function prestige(it: FeedItem): number {
  const r = featuredRank(it.match.league)
  return interest(it) + (r >= 0 ? Math.max(0, 12 - r) * 0.35 : 0)
}

/**
 * Главные матчи дня для большого блока (листаются стрелками «1 из 5»): по важности турнира и команд
 * (`prestige`), сначала по одному на лигу, потом добор; вероятность победы и падение кэфа сами по себе
 * главный матч не определяют. Идущие и предстоящие важнее сыгранных: сыгранные — только когда впереди
 * ничего нет (прошедший день, поздний вечер). Молодёжные, женские, перенесённые и отменённые — мимо.
 */
export function mainMatches(items: FeedItem[], limit = MAINS_SHOWN): FeedItem[] {
  const pool = items.filter((it) => !isMinor(it.match) && (isOpen(it) || it.match.status === 'finished'))
  const open = pool.filter(isOpen)
  const base = (open.length ? open : pool).sort((a, b) => prestige(b) - prestige(a) || a.match.ts - b.match.ts)
  const leagues = new Set<number>()
  const first: FeedItem[] = []
  const rest: FeedItem[] = []
  for (const it of base) {
    if (leagues.has(it.match.league.id)) rest.push(it)
    else {
      leagues.add(it.match.league.id)
      first.push(it)
    }
  }
  return [...first, ...rest].slice(0, limit)
}

// ─── «Все матчи» ─────────────────────────────────────────────────────────────

export type DayCounts = { total: number; live: number; finished: number; leagues: number; next: FeedItem | null }

/** Реальные количества дня: сколько матчей, сколько идёт и сыграно, турниров; ближайший — если ничего не идёт. */
export function dayCounts(items: FeedItem[], now = appNow()): DayCounts {
  const upcoming = items.filter((it) => it.match.status === 'scheduled' && it.match.ts >= now).sort((a, b) => a.match.ts - b.match.ts || interest(b) - interest(a))
  return {
    total: items.length,
    live: items.filter((it) => isLive(it.match)).length,
    finished: items.filter((it) => it.match.status === 'finished').length,
    leagues: new Set(items.map((it) => it.match.league.id)).size,
    next: upcoming[0] ?? null,
  }
}

// ─── «Голевые матчи» ─────────────────────────────────────────────────────────

/** Порог «голевого» матча по умолчанию: шанс 3+ голов от 55% по линии одного букмекера. */
export const GOALS_PICK = 0.55

export type GoalsPick = { it: FeedItem; g: GoalsLine }

/**
 * Матчи дня с шансом 3+ голов от `min` — по паре «больше 2,5 / меньше 2,5» одного букмекера (`goalsLine`),
 * сильнейшие первыми. `covered` — у скольких матчей дня есть такая пара: остальных в подборке нет.
 */
export function goalsPicks(items: FeedItem[], snapOf: (id: number) => OddsSnap | null, min = GOALS_PICK): { picks: GoalsPick[]; covered: number } {
  let covered = 0
  const picks: GoalsPick[] = []
  for (const it of items) {
    const g = goalsLine(snapOf(it.match.id))
    if (!g) continue
    covered++
    if (g.p >= min) picks.push({ it, g })
  }
  picks.sort((a, b) => b.g.p - a.g.p || featured(b.it) - featured(a.it) || a.it.match.ts - b.it.match.ts)
  return { picks, covered }
}

// ─── «Движение коэффициентов» ────────────────────────────────────────────────

export type MovePick = { it: FeedItem; mv: LineMove }

/**
 * Изменения линии дня: по каждому матчу — линия одного букмекера (открытие → последнее значение), исходы
 * 1X2 и тотала 2,5; от `min` по модулю, самые заметные первыми. `covered` — у скольких матчей есть кэфы открытия.
 */
export function linePicks(
  items: FeedItem[],
  snapOf: (id: number) => OddsSnap | null,
  { min = 0.05, keys }: { min?: number; keys?: MoveKey[] } = {},
): { picks: MovePick[]; covered: number } {
  let covered = 0
  const picks: MovePick[] = []
  for (const it of items) {
    const moves = lineMoves(snapOf(it.match.id))
    if (!moves.length) continue
    covered++
    for (const mv of moves) if (Math.abs(mv.change) >= min && (!keys || keys.includes(mv.key))) picks.push({ it, mv })
  }
  picks.sort((a, b) => Math.abs(b.mv.change) - Math.abs(a.mv.change) || featured(b.it) - featured(a.it))
  return { picks, covered }
}

const X12: MoveKey[] = ['home', 'draw', 'away']

/**
 * Пример для плитки «Движение коэффициентов»: самое заметное изменение 1X2 (от 8%) — сначала у ещё не начавшихся
 * матчей, потом у идущих, потом у сыгранных; молодёжные и женские — только если других нет.
 */
export function moveExample(items: FeedItem[], snapOf: (id: number) => OddsSnap | null): MovePick | null {
  const { picks } = linePicks(items, snapOf, { min: 0.08, keys: X12 })
  const stage = (p: MovePick) => (p.it.match.status === 'scheduled' ? 0 : isLive(p.it.match) ? 1 : 2) + (isMinor(p.it.match) ? 3 : 0)
  return [...picks].sort((a, b) => stage(a) - stage(b) || Math.abs(b.mv.change) - Math.abs(a.mv.change))[0] ?? null
}

/** Топ-лиги чуть впереди при равных цифрах. */
const featured = (it: FeedItem) => (featuredRank(it.match.league) >= 0 ? 1 : 0)
