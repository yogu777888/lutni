import type { BookOdds, MarketSet } from './odds'

export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled' | 'suspended' | 'unknown'

export type Team = {
  id: number
  /** Название для показа (по-русски, если есть в словаре). */
  name: string
  /** Оригинальное название из API (для слагов и поиска). */
  original: string
  logo: string | null
  country: string
}

export type League = {
  id: number
  /** «Англия. Премьер-лига» */
  name: string
  original: string
  country: string
  countryCode: string
}

export type Score = { home: number; away: number }

export type Match = {
  id: number
  ts: number
  status: MatchStatus
  statusCode: number
  statusLabel: string
  elapsed: number | null
  home: Team
  away: Team
  /** Текущий/итоговый счёт (осн. + доп. время, без пенальти). */
  score: Score | null
  /** Счёт основного времени — по нему рассчитываются ставки. */
  scoreFT: Score | null
  scoreHT: Score | null
  league: League
  season: { year: number; uid: string } | null
  round: string | null
  /** Короткие кэфы из списка матчей (1X2 + тотал), если есть. */
  odds: MarketSet | null
}

export type MatchEvent = {
  minute: number
  extra: number | null
  side: 'home' | 'away'
  kind: 'goal' | 'own-goal' | 'penalty' | 'missed-penalty' | 'yellow' | 'red' | 'sub' | 'var' | 'other'
  player: string
  assist: string | null
}

export type StatPair = { key: string; label: string; home: number; away: number; suffix?: string }

export type MatchFull = {
  match: Match
  stats: StatPair[]
  events: MatchEvent[]
  venue: { name: string; city: string; capacity: number | null } | null
  referee: string | null
  formations: { home: string | null; away: string | null }
}

export type Glicko = {
  homeRating: number
  awayRating: number
  homeRd: number
  awayRd: number
  homeXg: number | null
  awayXg: number | null
  homeWin: number | null
  awayWin: number | null
}

export type Injury = { teamId: number; player: string; reason: string }

export type StandingRow = {
  teamId: number
  team: string
  logo: string | null
  rank: number
  points: number
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  form: string
  zone: string | null
  group: string | null
}

export type Standings = { groups: { name: string | null; rows: StandingRow[] }[] }

export type LeagueInfo = League & { seasons: { year: number; uid: string; start: string; end: string }[] }

export type { BookOdds, MarketSet }
