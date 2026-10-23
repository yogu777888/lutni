/**
 * Flashscore-раздел SStats (`/Ls/*`, API 0.9.42+): составы со схемой и оценками игроков, давление по минутам
 * (momentum), подробная статистика и зрители. Общих id с `/Games` нет — матч ищем по id команды во Flashscore
 * (`flashId` у команды в `/Games/list`: «bournemouth/OtpNdwrc») и дню: `/Ls/List?Team=…&Date=…`.
 * Проверено на настоящем API (октябрь 2026, «Борнмут» — «Сандерленд»).
 */
import type { StatPair } from '../types'

// ─── Ответы API (только нужные поля) ─────────────────────────────────────────

export type RawLsGame = { id: string; homeTeamId?: string | null; awayTeamId?: string | null; dateUtc?: number | null }

export type RawLsMetric = {
  id: string
  name?: string
  home?: { value?: number | null; percentage?: number | null } | null
  away?: { value?: number | null; percentage?: number | null } | null
}

export type RawLsInfo = {
  venue?: string | null
  city?: string | null
  attendance?: number | null
  statistics?: { fullTime?: { metrics?: RawLsMetric[] | null } | null } | null
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

export type RawLsLineups = { lineups?: { side?: number | null; formation?: string | null; players?: RawLsPlayer[] | null }[] | null }

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
  /** Основа по линиям: [вратарь], [защита], …, [нападение] */
  rows: LineupPlayer[][]
  bench: LineupPlayer[]
  coach: string | null
}

export type Lineups = { home: TeamLineup; away: TeamLineup }

/** Давление по минутам: v > 0 — давят хозяева, v < 0 — гости (от −1 до 1); `part` — тайм (3 — дополнительное время). */
export type MomentumPoint = { part: 1 | 2 | 3; minute: number; v: number }

export type LsExtra = {
  lineups: Lineups | null
  momentum: MomentumPoint[] | null
  /** Строки статистики, которых нет в `/Games/{id}` */
  stats: StatPair[]
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
 * Дополнительные строки статистики (их нет в `/Games/{id}`): берём немного и понятными словами — блок и так длинный
 * (владелец: «блок сейчас в матче некрасивый очень и длинный»). 0 : 0 прячет `visibleStats`.
 */
const LS_STATS: { id: string; key: string; label: string; pct?: boolean }[] = [
  { id: '461', key: 'shotsInsideBox', label: 'Удары из штрафной' },
  { id: '457', key: 'hitWoodwork', label: 'Попадания в каркас ворот' },
  { id: '342', key: 'passAccuracy', label: 'Точность передач', pct: true },
]

/** Строки, которые в `/Games` бывают пустыми, а здесь есть: подставляем, только если своих нет. */
const LS_FALLBACK: { id: string; key: string }[] = [
  { id: '432', key: 'expectedGoals' },
  { id: '459', key: 'bigChances' },
  { id: '12', key: 'ballPossession' },
]

export function lsStats(info: RawLsInfo | null | undefined, have: Set<string>): StatPair[] {
  const metrics = info?.statistics?.fullTime?.metrics ?? []
  const byId = new Map(metrics.map((m) => [m.id, m]))
  const val = (m: RawLsMetric, side: 'home' | 'away', pct?: boolean) => {
    const s = m[side]
    const v = pct ? s?.percentage : (s?.value ?? s?.percentage)
    return typeof v === 'number' && Number.isFinite(v) ? v : null
  }
  const out: StatPair[] = []
  for (const f of LS_FALLBACK) {
    const m = byId.get(f.id)
    if (!m || have.has(f.key)) continue
    const h = val(m, 'home', f.key === 'ballPossession')
    const a = val(m, 'away', f.key === 'ballPossession')
    if (h === null || a === null) continue
    const label = { expectedGoals: 'Качество моментов', bigChances: 'Голевые моменты', ballPossession: 'Владение мячом' }[f.key]!
    out.push({ key: f.key, label, home: h, away: a, suffix: f.key === 'ballPossession' ? '%' : undefined })
  }
  for (const f of LS_STATS) {
    const m = byId.get(f.id)
    if (!m || have.has(f.key)) continue
    const h = val(m, 'home', f.pct)
    const a = val(m, 'away', f.pct)
    if (h === null || a === null) continue
    out.push({ key: f.key, label: f.label, home: h, away: a, suffix: f.pct ? '%' : undefined })
  }
  return out
}
