/**
 * Приведение «сырых» ответов SStats к доменным типам сайта.
 * Все поля в API могут прийти строкой или null — защищаемся везде.
 */
import { ruCountry, ruLeague, ruTeam } from '../i18n/ru'
import { parseMarkets, type BookOdds } from '../odds'
import type {
  Glicko,
  Injury,
  League,
  LeagueInfo,
  Match,
  MatchEvent,
  MatchFull,
  MatchStatus,
  Score,
  StandingRow,
  Standings,
  StatPair,
  Team,
} from '../types'
import type {
  Num,
  RawBookmakerOdds,
  RawEvent,
  RawGame,
  RawGameFull,
  RawGameGlicko,
  RawInjury,
  RawLeague,
  RawLeagueWithSeasons,
  RawStandings,
  RawStatistics,
  RawTeam,
} from './types'

export function num(v: Num | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

const int = (v: Num | null | undefined, fallback = 0) => num(v) ?? fallback

// ─── Статусы ─────────────────────────────────────────────────────────────────

const STATUS: Record<number, [MatchStatus, string]> = {
  1: ['scheduled', 'Время уточняется'],
  2: ['scheduled', 'Не начался'],
  3: ['live', '1-й тайм'],
  4: ['live', 'Перерыв'],
  5: ['live', '2-й тайм'],
  6: ['live', 'Доп. время'],
  7: ['live', 'Пенальти'],
  8: ['finished', 'Завершён'],
  9: ['finished', 'После доп. времени'],
  10: ['finished', 'После пенальти'],
  11: ['live', 'Перерыв в доп. времени'],
  12: ['suspended', 'Приостановлен'],
  13: ['cancelled', 'Прерван'],
  14: ['postponed', 'Перенесён'],
  15: ['cancelled', 'Отменён'],
  17: ['finished', 'Техническое поражение'],
  18: ['finished', 'Неявка соперника'],
  19: ['live', 'Идёт'],
}

export function statusOf(code: number | null): { status: MatchStatus; label: string } {
  const s = code !== null ? STATUS[code] : undefined
  return s ? { status: s[0], label: s[1] } : { status: 'unknown', label: '—' }
}

// ─── Туры ────────────────────────────────────────────────────────────────────

const STAGES: [RegExp, string][] = [
  [/^final$/i, 'Финал'],
  [/^semi-?finals?$/i, '1/2 финала'],
  [/^quarter-?finals?$/i, '1/4 финала'],
  [/^round of 16$|^8th finals$/i, '1/8 финала'],
  [/^round of 32$|^16th finals$/i, '1/16 финала'],
  [/^round of 64$/i, '1/32 финала'],
  [/^3rd place final$|^third place$/i, 'Матч за 3-е место'],
  [/^knockout round play-?offs$/i, 'Стыковые матчи'],
  [/^play-?offs?$/i, 'Плей-офф'],
  [/^relegation round$/i, 'Стыковые матчи'],
]

export function ruRound(raw: string | null | undefined): string | null {
  if (!raw) return null
  const s = raw.trim()
  let m: RegExpExecArray | null
  if ((m = /^(regular season|league stage|league phase|matchday)\s*-\s*(\d+)$/i.exec(s))) {
    const prefix = /league (stage|phase)/i.test(m[1]) ? 'Общий этап, ' : ''
    return `${prefix}${m[2]}-й тур`
  }
  if ((m = /^group\s+([a-z0-9]+)\s*-\s*(\d+)$/i.exec(s))) return `Группа ${m[1].toUpperCase()}, ${m[2]}-й тур`
  if ((m = /^(\d+)(st|nd|rd|th) qualifying round$/i.exec(s))) return `${m[1]}-й квалификационный раунд`
  if ((m = /^(\d+)(st|nd|rd|th) round$/i.exec(s))) return `${m[1]}-й раунд`
  if ((m = /^round\s*(\d+)$/i.exec(s))) return `${m[1]}-й тур`
  for (const [re, ru] of STAGES) if (re.test(s)) return ru
  return s
}

// ─── Команды и лиги ──────────────────────────────────────────────────────────

export function normalizeTeam(t: RawTeam | null | undefined): Team {
  const original = t?.name?.trim() || 'Команда'
  return {
    id: int(t?.id),
    name: ruTeam(original),
    original,
    logo: t?.logoUrl || null,
    country: t?.country?.name ?? '',
  }
}

export function normalizeLeague(l: RawLeague | null | undefined): League {
  const original = l?.name?.trim() || 'Турнир'
  const country = l?.country?.name ?? ''
  return {
    id: int(l?.id),
    name: ruLeague(original, country),
    original,
    country,
    countryCode: l?.country?.code ?? '',
  }
}

// ─── Время ───────────────────────────────────────────────────────────────────

/** dateUtc (сек/мс) надёжнее; `date` без смещения трактуем в часовом поясе запроса. */
export function kickoffTs(g: Pick<RawGame, 'dateUtc' | 'date'>, tzOffset: number): number {
  const u = num(g.dateUtc)
  if (u !== null && u > 0) return u > 1e12 ? u : u * 1000
  const d = g.date ?? ''
  if (!d) return 0
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(d)) return Date.parse(d)
  const naive = Date.parse(`${d.replace(' ', 'T')}Z`)
  return Number.isNaN(naive) ? 0 : naive - tzOffset * 3_600_000
}

// ─── Матч ────────────────────────────────────────────────────────────────────

function pair(h: Num | null | undefined, a: Num | null | undefined): Score | null {
  const hh = num(h)
  const aa = num(a)
  return hh === null || aa === null ? null : { home: hh, away: aa }
}

export function normalizeGame(g: RawGame, tzOffset: number): Match {
  const code = num(g.status)
  const { status, label } = statusOf(code)
  const home = normalizeTeam(g.homeTeam)
  const away = normalizeTeam(g.awayTeam)
  const league = normalizeLeague(g.season?.league)
  const score = pair(g.homeResult, g.awayResult)
  const odds = g.odds?.length ? parseMarkets(g.odds, { home: home.original, away: away.original }) : null
  const hasOdds = odds && (odds.x12 || odds.totals.length || odds.btts)
  return {
    id: int(g.id),
    ts: kickoffTs(g, tzOffset),
    status,
    statusCode: code ?? 0,
    statusLabel: g.statusName && status === 'unknown' ? g.statusName : label,
    elapsed: num(g.elapsed),
    home,
    away,
    score: status === 'scheduled' ? null : score,
    scoreFT: pair(g.homeFTResult, g.awayFTResult) ?? (status === 'finished' ? score : null),
    scoreHT: pair(g.homeHTResult, g.awayHTResult),
    league,
    season: g.season ? { year: int(g.season.year), uid: g.season.uid } : null,
    round: ruRound(g.roundName),
    odds: hasOdds ? odds : null,
  }
}

// ─── Полные данные матча ─────────────────────────────────────────────────────

const STAT_FIELDS: [string, string, string?][] = [
  ['ballPossession', 'Владение мячом', '%'],
  ['expectedGoals', 'Ожидаемые голы (xG)'],
  ['totalShots', 'Удары'],
  ['shotsOnGoal', 'Удары в створ'],
  ['bigChances', 'Голевые моменты'],
  ['cornerKicks', 'Угловые'],
  ['offsides', 'Офсайды'],
  ['fouls', 'Фолы'],
  ['yellowCards', 'Жёлтые карточки'],
  ['redCards', 'Красные карточки'],
  ['goalkeeperSaves', 'Сейвы'],
  ['totalPasses', 'Передачи'],
  ['dangerousAttacks', 'Опасные атаки'],
]

function normalizeStats(s: RawStatistics | null | undefined): StatPair[] {
  if (!s) return []
  const out: StatPair[] = []
  for (const [key, label, suffix] of STAT_FIELDS) {
    const h = num(s[`${key}Home`] as Num | null)
    const a = num(s[`${key}Away`] as Num | null)
    if (h === null || a === null) continue
    if (h === 0 && a === 0 && key !== 'redCards' && key !== 'yellowCards') continue
    out.push({ key, label, home: h, away: a, suffix })
  }
  return out
}

function eventKind(e: RawEvent): MatchEvent['kind'] {
  const n = (e.name || '').toLowerCase()
  const t = num(e.type)
  if (t === 1 || /goal|penalty/.test(n)) {
    if (/missed/.test(n)) return 'missed-penalty'
    if (/own/.test(n)) return 'own-goal'
    if (/penalty/.test(n)) return 'penalty'
    if (/cancel|disallow/.test(n)) return 'var'
    return 'goal'
  }
  if (t === 2 || /card/.test(n)) return /red|second yellow/.test(n) ? 'red' : 'yellow'
  if (t === 3 || /subst/.test(n)) return 'sub'
  if (t === 4 || /var/.test(n)) return 'var'
  return 'other'
}

export function normalizeFull(raw: RawGameFull, tzOffset: number): MatchFull {
  const match = normalizeGame(raw.game, tzOffset)
  const events: MatchEvent[] = (raw.events ?? []).map((e) => ({
    minute: int(e.elapsed),
    extra: num(e.extra),
    side: int(e.teamId) === match.away.id ? 'away' : 'home',
    kind: eventKind(e),
    player: e.player?.name ?? '',
    assist: e.assistPlayer?.name ?? null,
  }))
  const v = raw.venue
  return {
    match,
    stats: normalizeStats(raw.statistics),
    events: events.sort((a, b) => a.minute - b.minute || (a.extra ?? 0) - (b.extra ?? 0)),
    venue: v?.name ? { name: v.name, city: v.city ?? '', capacity: num(v.capacity) } : null,
    referee: raw.refereeName || null,
    formations: { home: raw.lineups?.homeFormation ?? null, away: raw.lineups?.awayFormation ?? null },
  }
}

// ─── Коэффициенты, Glicko, травмы ────────────────────────────────────────────

export function normalizeBookOdds(list: RawBookmakerOdds[] | null | undefined, teams: { home: string; away: string }): BookOdds[] {
  return (list ?? [])
    .map((b) => ({
      bookmakerId: int(b.bookmakerId),
      bookmakerName: String(b.bookmakerName ?? '').trim() || `БК #${b.bookmakerId}`,
      ...parseMarkets(b.odds, teams),
    }))
    .filter((b) => b.x12 || b.totals.length || b.btts || b.dc)
}

export function normalizeGlicko(raw: RawGameGlicko | null | undefined): Glicko | null {
  const g = raw?.glicko
  if (!g) return null
  const hr = num(g.homeRating)
  const ar = num(g.awayRating)
  if (hr === null || ar === null) return null
  const prob = (v: Num | null | undefined) => {
    const p = num(v)
    if (p === null) return null
    return p > 1 ? p / 100 : p
  }
  return {
    homeRating: hr,
    awayRating: ar,
    homeRd: num(g.homeRd) ?? 0,
    awayRd: num(g.awayRd) ?? 0,
    homeXg: num(g.homeXg),
    awayXg: num(g.awayXg),
    homeWin: prob(g.homeWinProbability),
    awayWin: prob(g.awayWinProbability),
  }
}

const REASONS: [RegExp, string][] = [
  [/red card/i, 'Дисквалификация (красная карточка)'],
  [/yellow card/i, 'Перебор жёлтых карточек'],
  [/suspen/i, 'Дисквалификация'],
  [/knee/i, 'Травма колена'],
  [/hamstring/i, 'Травма задней поверхности бедра'],
  [/ankle/i, 'Травма голеностопа'],
  [/muscle/i, 'Мышечная травма'],
  [/groin/i, 'Травма паха'],
  [/calf/i, 'Травма икроножной мышцы'],
  [/foot/i, 'Травма стопы'],
  [/back/i, 'Травма спины'],
  [/shoulder/i, 'Травма плеча'],
  [/head|concussion/i, 'Сотрясение / травма головы'],
  [/ill|sick/i, 'Болезнь'],
  [/injur/i, 'Травма'],
  [/doubt|question/i, 'Под вопросом'],
]

export function ruInjuryReason(reason: string | null | undefined): string {
  if (!reason) return 'Не сыграет'
  for (const [re, ru] of REASONS) if (re.test(reason)) return ru
  return reason
}

export function normalizeInjuries(list: RawInjury[] | null | undefined): Injury[] {
  return (list ?? [])
    .filter((i) => i.player?.name)
    .map((i) => ({ teamId: int(i.teamId), player: i.player!.name, reason: ruInjuryReason(i.reason) }))
}

// ─── Таблицы и лиги ──────────────────────────────────────────────────────────

const ZONES: [RegExp, string][] = [
  [/champions league/i, 'Лига чемпионов'],
  [/europa league/i, 'Лига Европы'],
  [/conference league/i, 'Лига конференций'],
  [/relegation/i, 'Зона вылета'],
  [/promotion/i, 'Повышение'],
  [/play-?off/i, 'Плей-офф'],
  [/round of 16|1\/8/i, 'Плей-офф'],
]

export function ruZone(desc: string | null | undefined): string | null {
  if (!desc) return null
  for (const [re, ru] of ZONES) if (re.test(desc)) return ru
  return desc
}

export function normalizeStandings(
  raw: RawStandings | null | undefined,
  teams: Map<number, Team>,
): Standings {
  const groups = (raw?.tables ?? []).map((t) => {
    const rows: StandingRow[] = (t.rows ?? []).map((r) => {
      const team = teams.get(int(r.teamId))
      return {
        teamId: int(r.teamId),
        team: team?.name ?? `Команда #${r.teamId}`,
        logo: team?.logo ?? null,
        rank: int(r.rank),
        points: int(r.points),
        played: int(r.played),
        wins: int(r.wins),
        draws: int(r.draws),
        losses: int(r.loses),
        goalsFor: int(r.goalsFor),
        goalsAgainst: int(r.goalsAgainst),
        form: (r.form ?? '').toUpperCase().replace(/[^WDL]/g, ''),
        zone: ruZone(r.description),
        group: r.groupName ?? null,
      }
    })
    rows.sort((a, b) => a.rank - b.rank)
    return { name: rows[0]?.group ?? null, rows }
  })
  return { groups: groups.filter((g) => g.rows.length) }
}

export function normalizeLeagues(list: RawLeagueWithSeasons[] | null | undefined): LeagueInfo[] {
  return (list ?? []).map((l) => ({
    ...normalizeLeague(l),
    seasons: (l.seasons ?? [])
      .map((s) => ({ year: int(s.year), uid: s.uid, start: s.dateStart ?? '', end: s.dateEnd ?? '' }))
      .sort((a, b) => b.year - a.year),
  }))
}

export { ruCountry }
