/**
 * PARI (pari.ru — легальный российский букмекер) через SStats: /Pari/matches, /Pari/odds/history/{eventId}.
 * Отсюда — LIVE-кэфы (в основном API они только у зарубежного Bet365) и настоящая история линии со временем.
 * Id матчей и команд у PARI свои: связь с матчами SStats — по времени начала и названиям (lib/pari-link.ts).
 */

export type RawPariMatch = {
  matchInfo: {
    eventId: number
    startDate: string
    status: string
    tournament?: { id: number; name: string } | null
    homeTeam: { id: number; name: string }
    awayTeam: { id: number; name: string }
    homeScore?: number | null
    awayScore?: number | null
    liveSeconds?: number | null
    url?: string | null
    isDeleted?: boolean
  }
  currentOdds?: { id: number; value: number }[] | null
}

export type RawPariSnapshot = {
  isLive: boolean
  isSuspended: boolean
  createdAt: string
  odds: { id: number; value: number; isBlocked?: boolean }[]
}

/** Id исходов PARI (/Pari/odds/market-types): основное время. */
export const PARI_OUT = { home: 8250, draw: 8256, away: 8253, over25: 217, under25: 292 } as const
export type PariKey = keyof typeof PARI_OUT

export type PariStatus = 'scheduled' | 'live' | 'finished' | 'other'

export type PariMatch = {
  eventId: number
  ts: number
  status: PariStatus
  league: string
  home: string
  away: string
  url: string | null
  /** текущие кэфы основных исходов: до матча — доматчевые, в игре — live; нет исхода в линии — нет ключа */
  odds: Partial<Record<PariKey, number>>
}

const statusOf = (s: string): PariStatus =>
  s === 'Live' ? 'live' : s === 'NotStarted' || s === 'WillStartSoon' ? 'scheduled' : s === 'Finished' ? 'finished' : 'other'

export function normalizePariMatch(r: RawPariMatch): PariMatch | null {
  const mi = r.matchInfo
  const ts = Date.parse(mi?.startDate ?? '')
  if (!mi || !Number.isFinite(ts) || mi.isDeleted) return null
  const odds: PariMatch['odds'] = {}
  for (const o of r.currentOdds ?? []) {
    for (const [k, id] of Object.entries(PARI_OUT) as [PariKey, number][]) if (o.id === id && o.value > 1) odds[k] = o.value
  }
  return {
    eventId: mi.eventId,
    ts,
    status: statusOf(mi.status),
    league: mi.tournament?.name ?? '',
    home: mi.homeTeam?.name ?? '',
    away: mi.awayTeam?.name ?? '',
    url: mi.url ?? null,
    odds,
  }
}

/** Точка линии: время снимка и кэф; null — исход снят с линии (кэф 0 в истории). */
export type LinePoint = { t: number; v: number | null }
export type PariHistory = Partial<Record<PariKey, LinePoint[]>>

/**
 * История кэфов из снимков PARI: в каждом снимке — только изменившиеся исходы, поэтому храним точку лишь при
 * смене значения. Блокировка (isBlocked) — кэф виден, но поставить нельзя: значение остаётся точкой линии.
 */
export function pariHistory(snaps: RawPariSnapshot[]): PariHistory {
  const out: PariHistory = {}
  const sorted = [...snaps].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
  for (const s of sorted) {
    const t = Date.parse(s.createdAt)
    if (!Number.isFinite(t)) continue
    for (const o of s.odds ?? []) {
      const key = (Object.keys(PARI_OUT) as PariKey[]).find((k) => PARI_OUT[k] === o.id)
      if (!key) continue
      const v = o.value > 1 ? o.value : null
      const line = (out[key] ??= [])
      if (line.length && line[line.length - 1].v === v) continue
      line.push({ t, v })
    }
  }
  return out
}
