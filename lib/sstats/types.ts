/**
 * «Сырые» типы ответов SStats.net Football API (по OpenAPI 0.9.40).
 * В спецификации числа описаны как `integer | string`, поэтому везде Num —
 * нормализация (normalize.ts) приводит их к number.
 */
export type Num = number | string

export interface ApiEnvelope<T> {
  status?: string
  count?: Num | null
  data?: T
  requestQuery?: string | null
  message?: string | null
  offset?: Num | null
  TotalCount?: Num | null
  totalCount?: Num | null
  traceId?: string | null
}

export interface RawCountry {
  code?: string | null
  name?: string | null
}

export interface RawTeam {
  id: Num
  name: string
  flashId?: string | null
  logoUrl?: string | null
  country?: RawCountry | null
}

export interface RawLeague {
  id: Num
  name: string
  country?: RawCountry | null
  flashScoreId?: string | null
}

export interface RawSeason {
  uid: string
  year: Num
  league?: RawLeague | null
}

export interface RawSeasonFull extends RawSeason {
  dateStart?: string
  dateEnd?: string
  flashScoreId?: string | null
}

export interface RawLeagueWithSeasons extends RawLeague {
  seasons?: RawSeasonFull[] | null
}

export interface RawPrice {
  name: string
  value: Num
  openingValue?: Num | null
}

export interface RawBet {
  marketId: Num
  marketName: string
  odds: RawPrice[]
}

export interface RawGame {
  id: Num
  flashId?: string | null
  date?: string | null
  dateUtc?: Num | null
  status?: Num | null
  periods?: string[] | null
  statusName?: string | null
  elapsed?: Num | null
  extraMinutes?: Num | null
  homeResult?: Num | null
  awayResult?: Num | null
  homeHTResult?: Num | null
  awayHTResult?: Num | null
  homeFTResult?: Num | null
  awayFTResult?: Num | null
  homeTeam: RawTeam
  awayTeam: RawTeam
  season?: RawSeason | null
  roundName?: string | null
  odds?: RawBet[] | null
}

export interface RawPlayer {
  id?: Num | null
  name: string
}

export interface RawEvent {
  id?: Num
  teamId: Num
  elapsed: Num
  extra?: Num | null
  /** 1 — гол, 2 — карточка, 3 — замена, 4 — VAR */
  type: Num
  name: string
  player?: RawPlayer | null
  assistPlayer?: RawPlayer | null
}

export interface RawVenue {
  name?: string | null
  address?: string | null
  city?: string | null
  capacity?: Num | null
}

export interface RawLineup {
  homeFormation?: string | null
  awayFormation?: string | null
  homeCoach?: RawPlayer | null
  awayCoach?: RawPlayer | null
}

export type RawStatistics = Record<string, Num | null | Record<string, unknown> | undefined>

export interface RawGameFull {
  game: RawGame
  statistics?: RawStatistics | null
  lineups?: RawLineup | null
  events?: RawEvent[] | null
  venue?: RawVenue | null
  refereeName?: string | null
}

export interface RawBookmakerOdds {
  bookmakerId: Num
  bookmakerName: string
  odds: RawBet[]
}

export interface RawGlicko {
  homeRating: Num
  homeRd: Num
  awayRating: Num
  awayRd: Num
  homeXg?: Num | null
  awayXg?: Num | null
  homeWinProbability?: Num | null
  awayWinProbability?: Num | null
  updated?: string
  homeVolatility?: Num
  awayVolatility?: Num
}

export interface RawGameGlicko {
  fixture?: RawGame | null
  glicko?: RawGlicko | null
}

export interface RawInjury {
  gameId?: Num
  player?: RawPlayer | null
  teamId: Num
  reason?: string | null
}

export interface RawStandingRow {
  teamId: Num
  rank: Num
  groupName?: string | null
  description?: string | null
  points: Num
  form?: string | null
  played: Num
  wins: Num
  draws: Num
  loses: Num
  goalsFor: Num
  goalsAgainst: Num
}

export interface RawStandings {
  season?: RawSeason | null
  tables?: { tableNum: Num; rows: RawStandingRow[] }[] | null
}
