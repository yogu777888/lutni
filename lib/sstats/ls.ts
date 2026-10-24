/**
 * Flashscore-раздел SStats (`/Ls/*`, API 0.9.42+): составы со схемой и оценками игроков, давление по минутам
 * (momentum), подробная статистика и зрители. Общих id с `/Games` нет — матч ищем по id команды во Flashscore
 * (`flashId` у команды в `/Games/list`: «bournemouth/OtpNdwrc») и дню: `/Ls/List?Team=…&Date=…`.
 * Проверено на настоящем API (октябрь 2026, «Борнмут» — «Сандерленд»).
 */
import type { StatPair } from '../types'
import { lsPeriods, periodRows, type StatPeriod } from './stat-rows'

// ─── Ответы API (только нужные поля) ─────────────────────────────────────────

export type RawLsGame = { id: string; homeTeamId?: string | null; awayTeamId?: string | null; dateUtc?: number | null }

type RawLsSide = { raw?: string | null; value?: number | null; percentage?: number | null; successful?: number | null; total?: number | null } | null

export type RawLsMetric = {
  id: string
  name?: string
  /** группы во Flashscore: «Top stats», «Shots», «Attack», «Passes», «Defense», «Goalkeeping» */
  groups?: string[] | null
  home?: RawLsSide
  away?: RawLsSide
}

/** Период статистики: `metrics` и `otherStats` — то, у чего в API нет id («Goal kicks»: { home: "6", away: "5" }). */
export type RawLsPeriod = { metrics?: RawLsMetric[] | null; otherStats?: Record<string, { home?: string | number | null; away?: string | number | null } | null> | null } | null

/** Событие матча: нам нужны только карточки с причиной («Holding», «Handball»…). */
export type RawLsEvent = {
  team?: number | null
  minute?: number | null
  displayTime?: string | null
  reason?: string | null
  actions?: { actionName?: string | null; playerName?: string | null }[] | null
}

export type RawLsInfo = {
  venue?: string | null
  city?: string | null
  attendance?: number | null
  /** «fullTime», «firstHalf», «secondHalf», дополнительное время — «extraTime» (бывает «extraTIme») */
  statistics?: Record<string, RawLsPeriod> | null
  events?: RawLsEvent[] | null
}

export type RawLsPlayer = {
  playerName?: string | null
  /** 0 — основа, 1 — запас, 2 — тренер, 3 — не сыграет */
  kind?: number | null
  missingReason?: string | null
  shirtNumber?: string | null
  isCaptain?: boolean | null
  isGoalkeeper?: boolean | null
  /** Линия в схеме: 0 — вратарь, дальше — защита, полузащита, нападение */
  formationRow?: number | null
  sortOrder?: number | null
  /** в настоящем API бывает строкой («65») */
  subInTime?: number | string | null
  subOutTime?: number | string | null
  statistics?: {
    rating?: number | null
    isBestRating?: boolean | null
    goals?: number | null
    goalsOwn?: number | null
    assists?: number | null
    yellowCards?: number | null
    redCards?: number | null
  } | null
}

export type RawLsLineups = {
  lineups?: { side?: number | null; formation?: string | null; averageRating?: number | null; players?: RawLsPlayer[] | null }[] | null
}

export type RawLsMomentum = { points?: { elapsedMinute?: number | null; addedTime?: number | null; eventStage?: number | null; momentumValue?: number | null }[] | null } | null

// ─── Наши типы ───────────────────────────────────────────────────────────────

export type LineupPlayer = {
  name: string
  number: string | null
  captain: boolean
  rating: number | null
  best: boolean
  goals: number
  ownGoals: number
  assists: number
  yellow: boolean
  red: boolean
  /** Минута, когда вышел на замену / когда заменили */
  subIn: number | null
  subOut: number | null
}

export type TeamLineup = {
  formation: string | null
  /** Средняя оценка команды (после начала) */
  avg?: number | null
  /** Основа по линиям: [вратарь], [защита], …, [нападение] */
  rows: LineupPlayer[][]
  bench: LineupPlayer[]
  coach: string | null
}

export type Lineups = { home: TeamLineup; away: TeamLineup }

/** Давление по минутам: v > 0 — давят хозяева, v < 0 — гости (от −1 до 1); `part` — тайм (3 — дополнительное время). */
export type MomentumPoint = { part: 1 | 2 | 3; minute: number; v: number }

/** Удаление с причиной из `/Ls/GameInfo`: «за фол», «за игру рукой» — к красной карточке из `/Games`. */
export type LsRed = { side: 'home' | 'away'; minute: number; reason: string }

export type LsExtra = {
  lineups: Lineups | null
  momentum: MomentumPoint[] | null
  /** Строки статистики, которых нет в `/Games/{id}` */
  stats: StatPair[]
  /** Все показатели по периодам — матч, таймы, доп. время (в `/Games` таймов нет): блок «Статистика» */
  periods: StatPeriod[]
  reds: LsRed[]
  venue: { name: string; city: string } | null
  attendance: number | null
}

// ─── Разбор ──────────────────────────────────────────────────────────────────

/** «bournemouth/OtpNdwrc» → «OtpNdwrc» */
export const flashCode = (flash: string) => flash.split('/').pop() ?? flash

/** Матч из `/Ls/List` по командам: тот, где хозяева и гости совпали с нашими. */
export function findLsGame(list: RawLsGame[] | null | undefined, home: string, away: string): string | null {
  const h = flashCode(home)
  const a = flashCode(away)
  return list?.find((g) => g.homeTeamId === h && g.awayTeamId === a)?.id ?? null
}

/** «Tavernier M.» → «Tavernier», «N. Schmidt» → «Schmidt», «Evanilson» → «Evanilson»: инициалы на поле не нужны. */
export function surname(name: string): string {
  const t = name.trim().replace(/(\s+\p{Lu}\.)+$/u, '').replace(/^(\p{Lu}\.\s*)+/u, '')
  return t || name.trim()
}

const n0 = (v: number | null | undefined) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
const minuteOf = (v: number | string | null | undefined) => {
  const n = typeof v === 'string' ? parseInt(v, 10) : v
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null
}

function player(p: RawLsPlayer): LineupPlayer {
  const st = p.statistics ?? {}
  return {
    name: (p.playerName ?? '').trim() || '—',
    number: p.shirtNumber?.trim() || null,
    captain: !!p.isCaptain,
    rating: typeof st.rating === 'number' ? st.rating : null,
    best: !!st.isBestRating,
    goals: n0(st.goals),
    ownGoals: n0(st.goalsOwn),
    assists: n0(st.assists),
    yellow: n0(st.yellowCards) > 0,
    red: n0(st.redCards) > 0,
    subIn: minuteOf(p.subInTime),
    subOut: minuteOf(p.subOutTime),
  }
}

function teamLineup(raw: NonNullable<RawLsLineups['lineups']>[number] | undefined): TeamLineup | null {
  const players = raw?.players ?? []
  const starters = players.filter((p) => p.kind === 0)
  if (starters.length < 11) return null
  const rows: LineupPlayer[][] = []
  const sorted = [...starters].sort((a, b) => n0(a.formationRow) - n0(b.formationRow) || n0(a.sortOrder) - n0(b.sortOrder))
  for (const p of sorted) {
    const r = p.isGoalkeeper && p.formationRow == null ? 0 : n0(p.formationRow)
    ;(rows[r] ??= []).push(player(p))
  }
  return {
    formation: raw?.formation?.trim() || null,
    avg: typeof raw?.averageRating === 'number' && raw.averageRating > 0 ? raw.averageRating : null,
    rows: rows.filter((r) => r?.length),
    bench: players.filter((p) => p.kind === 1).sort((a, b) => n0(a.sortOrder) - n0(b.sortOrder)).map(player),
    coach: players.find((p) => p.kind === 2)?.playerName?.trim() || null,
  }
}

export function normalizeLineups(raw: RawLsLineups | null | undefined): Lineups | null {
  const ls = raw?.lineups ?? []
  const home = teamLineup(ls.find((l) => l.side === 1))
  const away = teamLineup(ls.find((l) => l.side === 2))
  return home && away ? { home, away } : null
}

/**
 * Точки давления по порядку: тайм и минута как в API — у первого тайма добавленное время идёт минутами 46…51,
 * второй снова начинается с 45-й (eventStage 12 — первый тайм, 13 — второй, дальше — дополнительное время).
 */
export function normalizeMomentum(raw: RawLsMomentum): MomentumPoint[] | null {
  const out: MomentumPoint[] = []
  for (const p of raw?.points ?? []) {
    if (typeof p.momentumValue !== 'number' || !Number.isFinite(p.momentumValue)) continue
    const part = p.eventStage === 12 ? 1 : p.eventStage === 13 ? 2 : 3
    out.push({ part, minute: n0(p.elapsedMinute) + 1, v: Math.max(-1, Math.min(1, p.momentumValue)) })
  }
  return out.length >= 10 ? out : null
}

/** Подпись минуты: «17′», в добавленное время — «45+3′», «90+2′». */
export function minuteLabel(p: Pick<MomentumPoint, 'part' | 'minute'>): string {
  const cap = p.part === 1 ? 45 : p.part === 2 ? 90 : 120
  return p.minute > cap ? `${cap}+${p.minute - cap}′` : `${p.minute}′`
}

/**
 * Дополнительные строки к статистике `/Games` (для сторис и «Главного»; блок «Статистика» берёт всё из `periods`):
 * немного и понятными словами. Строки, которые в `/Games` бывают пустыми (xG, голевые моменты, владение), — только если
 * своих нет. Разбор — общий с блоком (`periodRows`).
 */
const LS_EXTRA = ['expectedGoals', 'bigChances', 'ballPossession', 'shotsInsideBox', 'hitWoodwork', 'passAccuracy']
const LS_EXTRA_LABEL: Record<string, string> = { expectedGoals: 'Ожидаемые голы (xG)' }

export function lsStats(info: RawLsInfo | null | undefined, have: Set<string>): StatPair[] {
  const rows = periodRows(info?.statistics?.fullTime)
  return LS_EXTRA.flatMap((key) => {
    const r = rows.find((x) => x.key === key)
    if (!r || have.has(key) || r.home === null || r.away === null) return []
    return [{ key, label: LS_EXTRA_LABEL[key] ?? r.label, home: r.home, away: r.away, suffix: r.suffix }]
  })
}

export { lsPeriods }

/**
 * Причина удаления словами. В API — тип нарушения по-английски («Holding», «Tripping», «Handball»); незнакомое — не
 * пишем (лучше без причины, чем с неверной).
 */
export function cardReason(reason: string | null | undefined): string | null {
  const r = (reason ?? '').toLowerCase()
  if (!r) return null
  if (/hand ?ball/.test(r)) return 'за игру рукой'
  if (/violent|serious foul|fight|spit|elbow|kick|stamp|headbutt/.test(r)) return 'за грубость'
  if (/dissent|argu|unsporting|unsportsmanlike|insult|abus|simulat|time ?wast/.test(r)) return 'за неспортивное поведение'
  if (/second yellow|2nd yellow/.test(r)) return 'вторая жёлтая'
  if (/foul|holding|tripping|push|tackle|charg|obstruct|dangerous play/.test(r)) return 'за фол'
  return null
}

/** Удаления с причиной: событие с действием «Red Card» (или «Yellow-Red»), сторона — `team` (1 — хозяева). */
export function lsReds(events: RawLsEvent[] | null | undefined): LsRed[] {
  const out: LsRed[] = []
  for (const e of events ?? []) {
    const red = e.actions?.some((a) => /red/i.test(a.actionName ?? ''))
    const second = e.actions?.some((a) => /yellow.?red|second yellow/i.test(a.actionName ?? ''))
    const reason = second ? 'вторая жёлтая' : cardReason(e.reason)
    if (!red || !reason || (e.team !== 1 && e.team !== 2) || typeof e.minute !== 'number') continue
    out.push({ side: e.team === 1 ? 'home' : 'away', minute: e.minute, reason })
  }
  return out
}
