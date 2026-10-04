/**
 * Демо-режим (SSTATS_MOCK=1): синтетические, но правдоподобные данные в точном
 * формате ответов SStats. Нужен, чтобы сайт работал без доступа к API
 * (разработка, CI, демо). Всё детерминировано: одинаковый запрос → одинаковый ответ.
 *
 * Модель: у каждой лиги бесконечная череда туров (каждые N дней), пары — круговой
 * системой, счёт — пуассоновский по силе команд, коэффициенты — из тех же
 * вероятностей с маржой и шумом конкретного букмекера.
 */
import { addDays, appNow, diffDays, tzOffsetHours, ymdInTz } from '../format'
import type {
  ApiEnvelope,
  RawBet,
  RawBookmakerOdds,
  RawEvent,
  RawGame,
  RawGameFull,
  RawGameGlicko,
  RawInjury,
  RawLeagueWithSeasons,
  RawStandingRow,
  RawStandings,
  RawStatistics,
  RawTeam,
} from './types'

// ─── ГПСЧ ────────────────────────────────────────────────────────────────────

function hashSeed(...parts: (string | number)[]): number {
  let h = 2166136261
  for (const ch of parts.join('|')) {
    h ^= ch.charCodeAt(0)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function rng(...parts: (string | number)[]) {
  let a = hashSeed(...parts)
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function poissonSample(lambda: number, r: () => number): number {
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k++
    p *= r()
  } while (p > L && k < 12)
  return k - 1
}

// ─── Лиги и команды ──────────────────────────────────────────────────────────

type MockLeague = {
  id: number
  name: string
  country: string
  code: string | null
  every: number
  offset: number
  times: string[]
  teams: string[]
}

const LEAGUES: MockLeague[] = [
  {
    id: 39, name: 'Premier League', country: 'England', code: 'GB', every: 3, offset: 0,
    times: ['14:30', '17:00', '17:00', '19:30', '22:00'],
    teams: ['Liverpool', 'Arsenal', 'Manchester City', 'Chelsea', 'Newcastle', 'Aston Villa', 'Tottenham',
      'Manchester United', 'Brighton', 'Nottingham Forest', 'Bournemouth', 'Crystal Palace', 'Brentford',
      'Fulham', 'West Ham', 'Everton', 'Wolves', 'Leeds', 'Burnley', 'Sunderland'],
  },
  {
    id: 140, name: 'La Liga', country: 'Spain', code: 'ES', every: 3, offset: 1,
    times: ['16:00', '18:15', '20:30', '23:00'],
    teams: ['Real Madrid', 'Barcelona', 'Atletico Madrid', 'Athletic Club', 'Villarreal', 'Real Betis',
      'Real Sociedad', 'Celta Vigo', 'Girona', 'Sevilla', 'Osasuna', 'Mallorca', 'Valencia', 'Rayo Vallecano',
      'Getafe', 'Espanyol', 'Alaves', 'Elche', 'Levante', 'Oviedo'],
  },
  {
    id: 135, name: 'Serie A', country: 'Italy', code: 'IT', every: 3, offset: 2,
    times: ['16:00', '19:00', '21:45'],
    teams: ['Inter', 'Napoli', 'Juventus', 'AC Milan', 'Atalanta', 'AS Roma', 'Lazio', 'Como', 'Bologna',
      'Fiorentina', 'Torino', 'Udinese', 'Genoa', 'Parma', 'Cagliari', 'Lecce', 'Sassuolo', 'Verona', 'Pisa',
      'Cremonese'],
  },
  {
    id: 78, name: 'Bundesliga', country: 'Germany', code: 'DE', every: 3, offset: 0,
    times: ['16:30', '16:30', '19:30', '21:30'],
    teams: ['Bayern München', 'Bayer Leverkusen', 'Borussia Dortmund', 'RB Leipzig', 'Eintracht Frankfurt',
      'VfB Stuttgart', 'SC Freiburg', 'VfL Wolfsburg', 'Borussia Mönchengladbach', 'Werder Bremen',
      '1899 Hoffenheim', 'FSV Mainz 05', 'Union Berlin', 'FC Augsburg', '1. FC Heidenheim', 'FC St. Pauli',
      'Hamburger SV', '1. FC Köln'],
  },
  {
    id: 61, name: 'Ligue 1', country: 'France', code: 'FR', every: 3, offset: 1,
    times: ['18:00', '20:00', '22:05'],
    teams: ['Paris Saint Germain', 'Marseille', 'Monaco', 'Lille', 'Lyon', 'Nice', 'Lens', 'Stade Brestois 29',
      'Rennes', 'Strasbourg', 'Toulouse', 'Nantes', 'Auxerre', 'Angers', 'Le Havre', 'Lorient', 'Metz', 'Paris FC'],
  },
  {
    id: 235, name: 'Premier League', country: 'Russia', code: 'RU', every: 3, offset: 2,
    times: ['13:00', '15:30', '18:00', '20:30'],
    teams: ['Zenit Saint Petersburg', 'Krasnodar', 'Spartak Moscow', 'Lokomotiv Moscow', 'CSKA Moscow',
      'Dinamo Moscow', 'Rubin', 'Rostov', 'Baltika', 'Akhmat Grozny', 'Krylya Sovetov', 'Dynamo Makhachkala',
      'Akron Togliatti', 'Orenburg', 'Nizhny Novgorod', 'Sochi'],
  },
  {
    id: 2, name: 'UEFA Champions League', country: 'World', code: null, every: 7, offset: 4,
    times: ['19:45', '22:00', '22:00'],
    teams: ['Real Madrid', 'Manchester City', 'Bayern München', 'Paris Saint Germain', 'Liverpool', 'Barcelona',
      'Inter', 'Arsenal', 'Bayer Leverkusen', 'Atletico Madrid', 'Borussia Dortmund', 'Juventus', 'Benfica',
      'Napoli', 'Sporting CP', 'PSV Eindhoven', 'Galatasaray', 'Club Brugge KV'],
  },
  {
    id: 88, name: 'Eredivisie', country: 'Netherlands', code: 'NL', every: 3, offset: 1,
    times: ['14:30', '16:45', '21:00'],
    teams: ['PSV Eindhoven', 'Feyenoord', 'Ajax', 'AZ Alkmaar', 'FC Twente', 'FC Utrecht', 'Go Ahead Eagles',
      'NEC Nijmegen', 'Heerenveen', 'Sparta Rotterdam', 'Fortuna Sittard', 'PEC Zwolle'],
  },
  {
    id: 94, name: 'Primeira Liga', country: 'Portugal', code: 'PT', every: 3, offset: 2,
    times: ['19:00', '21:30', '23:15'],
    teams: ['Benfica', 'FC Porto', 'Sporting CP', 'SC Braga', 'Vitoria Guimaraes', 'Famalicao', 'Gil Vicente',
      'Moreirense', 'Estoril', 'Casa Pia', 'Rio Ave', 'Arouca'],
  },
  {
    id: 203, name: 'Süper Lig', country: 'Turkey', code: 'TR', every: 3, offset: 0,
    times: ['17:00', '20:00'],
    teams: ['Galatasaray', 'Fenerbahce', 'Besiktas', 'Trabzonspor', 'Samsunspor', 'Goztepe', 'Basaksehir',
      'Kasimpasa', 'Konyaspor', 'Antalyaspor', 'Kayserispor', 'Alanyaspor'],
  },
  {
    id: 40, name: 'Championship', country: 'England', code: 'GB', every: 3, offset: 1,
    times: ['17:00', '22:00'],
    teams: ['Leicester', 'Ipswich', 'Southampton', 'Middlesbrough', 'Coventry', 'Norwich', 'West Brom',
      'Sheffield Utd', 'Stoke City', 'Hull City', 'Swansea', 'Millwall'],
  },
  {
    id: 144, name: 'Jupiler Pro League', country: 'Belgium', code: 'BE', every: 3, offset: 2,
    times: ['19:00', '21:45'],
    teams: ['Club Brugge KV', 'Union St. Gilloise', 'Anderlecht', 'Genk', 'Gent', 'Antwerp', 'Standard Liege',
      'Mechelen', 'Charleroi', 'Westerlo'],
  },
  {
    id: 179, name: 'Premiership', country: 'Scotland', code: 'GB', every: 3, offset: 0,
    times: ['17:00', '19:00'],
    teams: ['Celtic', 'Rangers', 'Hearts', 'Hibernian', 'Aberdeen', 'Motherwell', 'Dundee Utd', 'St Mirren',
      'Kilmarnock', 'Falkirk'],
  },
]

const LEAGUE_BY_ID = new Map(LEAGUES.map((l) => [l.id, l]))
const NO_ODDS_LEAGUES = new Set([144, 179])

/** ID команды одинаков во всех турнирах (Реал в Ла Лиге и в ЛЧ — одна команда). */
const TEAM_ID = new Map<string, number>()
const TEAM_COUNTRY = new Map<string, string>()
for (const l of LEAGUES) {
  for (const t of l.teams) {
    if (!TEAM_ID.has(t)) TEAM_ID.set(t, 1000 + TEAM_ID.size)
    if (l.country !== 'World' && !TEAM_COUNTRY.has(t)) TEAM_COUNTRY.set(t, l.country)
  }
}
const TEAM_NAME = new Map([...TEAM_ID].map(([n, id]) => [id, n]))

/** Сила команды 0.6…1.6 по месту в «табели о рангах» лиги (для ЛЧ — выше). */
function strength(team: string): number {
  let best = 0
  for (const l of LEAGUES) {
    const i = l.teams.indexOf(team)
    if (i < 0) continue
    const base = l.id === 2 ? 1.6 - (i / l.teams.length) * 0.5 : 1.45 - (i / (l.teams.length - 1)) * 0.85
    const leagueBoost = [39, 140, 2].includes(l.id) ? 0.1 : [135, 78].includes(l.id) ? 0.05 : 0
    best = Math.max(best, base + leagueBoost)
  }
  return best || 1
}

/**
 * Настоящие эмблемы команд для демо: `.data/team-logos.json` (название → logoUrl) делает
 * `npm run team-logos` — один раз берёт команды демо-лиг из SStats API. Нет файла — монограммы.
 */
let LOGOS: Record<string, string> = {}
let logosLoaded: Promise<void> | null = null
function loadLogos() {
  logosLoaded ??= (async () => {
    try {
      const [{ readFile }, path] = await Promise.all([import('node:fs/promises'), import('node:path')])
      const dir = process.env.DATA_DIR || path.join(process.cwd(), '.data')
      LOGOS = JSON.parse(await readFile(path.join(dir, 'team-logos.json'), 'utf8'))
    } catch {
      LOGOS = {}
    }
  })()
  return logosLoaded
}

function rawTeam(name: string): RawTeam {
  const country = TEAM_COUNTRY.get(name) ?? ''
  return { id: TEAM_ID.get(name) ?? 0, name, logoUrl: LOGOS[name] ?? null, country: { code: '', name: country } }
}

// ─── Расписание ──────────────────────────────────────────────────────────────

const EPOCH = '2026-08-07'
const DAY = 86_400_000

/** Пары тура `round` для N команд (круговая система, вторая половина — зеркально). */
function pairings(n: number, round: number): [number, number][] {
  const half = n - 1
  const r = round % half
  const second = Math.floor(round / half) % 2 === 1
  const others = Array.from({ length: n - 1 }, (_, i) => i + 1)
  const rotated = others.slice(r).concat(others.slice(0, r))
  const circle = [0, ...rotated]
  const out: [number, number][] = []
  for (let i = 0; i < n / 2; i++) {
    let a = circle[i]
    let b = circle[n - 1 - i]
    if ((r + i) % 2 === 1) [a, b] = [b, a]
    out.push(second ? [b, a] : [a, b])
  }
  return out
}

type MockGame = {
  id: number
  league: MockLeague
  k: number
  round: number
  year: number
  home: string
  away: string
  kickoff: number
  lh: number
  la: number
  goals: { minute: number; side: 'home' | 'away'; half: 1 | 2 }[]
  cards: { minute: number; side: 'home' | 'away' }[]
}

function matchdayOf(league: MockLeague, dayIndex: number): number | null {
  const d = dayIndex - league.offset
  if (d < 0 || d % league.every !== 0) return null
  return d / league.every
}

function dayIndexOf(ymd: string) {
  return diffDays(ymd, EPOCH)
}

function kickoffTs(ymd: string, hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  const [y, mo, d] = ymd.split('-').map(Number)
  const naive = Date.UTC(y, mo - 1, d, h, m)
  return naive - tzOffsetHours(undefined, naive) * 3_600_000
}

function makeGame(league: MockLeague, k: number, i: number): MockGame | null {
  const n = league.teams.length
  if (i < 0 || i >= n / 2 || k < 0) return null
  const rounds = 2 * (n - 1)
  const round = k % rounds
  const year = 2026 + Math.floor(k / rounds)
  const [hi, ai] = pairings(n, round)[i]
  const home = league.teams[hi]
  const away = league.teams[ai]
  const ymd = addDays(EPOCH, league.offset + k * league.every)
  const kickoff = kickoffTs(ymd, league.times[i % league.times.length])
  const id = league.id * 100_000 + k * 20 + i
  const r = rng('game', id)
  const sh = strength(home)
  const sa = strength(away)
  const noise = 0.9 + r() * 0.2
  const lh = Math.min(3.4, 1.45 * Math.pow(sh / sa, 0.75) * noise)
  const la = Math.min(3.0, 1.12 * Math.pow(sa / sh, 0.75) * (2 - noise))
  const hg = poissonSample(lh, r)
  const ag = poissonSample(la, r)
  const goals: MockGame['goals'] = []
  for (let g = 0; g < hg + ag; g++) {
    const minute = 1 + Math.floor(r() * 90)
    goals.push({ minute, side: g < hg ? 'home' : 'away', half: minute <= 45 ? 1 : 2 })
  }
  goals.sort((a, b) => a.minute - b.minute)
  const cards: MockGame['cards'] = []
  const nCards = 2 + Math.floor(r() * 5)
  for (let c = 0; c < nCards; c++) cards.push({ minute: 5 + Math.floor(r() * 85), side: r() < 0.5 ? 'home' : 'away' })
  cards.sort((a, b) => a.minute - b.minute)
  return { id, league, k, round, year, home, away, kickoff, lh, la, goals, cards }
}

function gameById(id: number): MockGame | null {
  const league = LEAGUE_BY_ID.get(Math.floor(id / 100_000))
  if (!league) return null
  const rest = id % 100_000
  return makeGame(league, Math.floor(rest / 20), rest % 20)
}

function gamesOnDay(dayIndex: number, leagues: MockLeague[] = LEAGUES): MockGame[] {
  const out: MockGame[] = []
  for (const l of leagues) {
    const k = matchdayOf(l, dayIndex)
    if (k === null) continue
    for (let i = 0; i < l.teams.length / 2; i++) {
      const g = makeGame(l, k, i)
      if (g) out.push(g)
    }
  }
  return out
}

// ─── Состояние матча на момент now ───────────────────────────────────────────

type Phase = { status: number; statusName: string; elapsed: number | null; minute: number }

function phaseOf(g: MockGame, now: number): Phase {
  const t = (now - g.kickoff) / 60_000
  if (t < 0) return { status: 2, statusName: 'Not Started', elapsed: null, minute: 0 }
  if (t < 47) {
    const m = Math.max(1, Math.floor(t))
    return { status: 3, statusName: 'First Half', elapsed: Math.min(45, m), minute: Math.min(45, m) }
  }
  if (t < 62) return { status: 4, statusName: 'Halftime', elapsed: 45, minute: 45 }
  if (t < 111) {
    const m = Math.min(90, 45 + Math.floor(t - 62) + 1)
    return { status: 5, statusName: 'Second Half', elapsed: m, minute: m }
  }
  return { status: 8, statusName: 'Match Finished', elapsed: 90, minute: 90 }
}

function scoreAt(g: MockGame, minute: number) {
  let h = 0
  let a = 0
  let hh = 0
  let ah = 0
  for (const goal of g.goals) {
    if (goal.minute > minute) continue
    if (goal.side === 'home') h++
    else a++
    if (goal.half === 1) {
      if (goal.side === 'home') hh++
      else ah++
    }
  }
  return { h, a, hh, ah }
}

// ─── Коэффициенты ────────────────────────────────────────────────────────────

const BOOKMAKERS = [
  { id: 1, name: 'Fonbet', margin: 0.06 },
  { id: 2, name: 'Winline', margin: 0.055 },
  { id: 3, name: 'Pari', margin: 0.06 },
  { id: 4, name: 'BetBoom', margin: 0.065 },
  { id: 5, name: 'Liga Stavok', margin: 0.07 },
  { id: 6, name: 'Marathonbet', margin: 0.045 },
  { id: 7, name: 'Pinnacle', margin: 0.025 },
  { id: 8, name: 'Bet365', margin: 0.05 },
  { id: 9, name: '1xBet', margin: 0.05 },
  { id: 10, name: 'William Hill', margin: 0.06 },
]

function pois(k: number, l: number) {
  let f = 1
  for (let i = 2; i <= k; i++) f *= i
  return (Math.exp(-l) * Math.pow(l, k)) / f
}

function trueProbs(lh: number, la: number) {
  let ph = 0
  let pd = 0
  let pa = 0
  let btts = 0
  const over: Record<string, number> = { '1.5': 0, '2.5': 0, '3.5': 0 }
  for (let i = 0; i <= 10; i++) {
    for (let j = 0; j <= 10; j++) {
      const p = pois(i, lh) * pois(j, la)
      if (i > j) ph += p
      else if (i === j) pd += p
      else pa += p
      if (i > 0 && j > 0) btts += p
      for (const line of Object.keys(over)) if (i + j > Number(line)) over[line] += p
    }
  }
  return { ph, pd, pa, btts, over }
}

const price = (p: number, margin: number) => Math.max(1.01, Math.round((1 / (p * (1 + margin))) * 100) / 100)

function bookOdds(g: MockGame, bm: (typeof BOOKMAKERS)[number], opening: boolean): RawBet[] {
  const r = rng('odds', g.id, bm.id)
  const tp = trueProbs(g.lh, g.la)
  const jitter = () => 1 + (r() - 0.5) * 0.06
  // иногда букмекер «ошибается» на одном исходе — это и есть value
  const skew = r() < 0.2 ? Math.floor(r() * 3) : -1
  let ph = tp.ph * jitter() * (skew === 0 ? 0.8 : 1)
  let pd = tp.pd * jitter() * (skew === 1 ? 0.8 : 1)
  let pa = tp.pa * jitter() * (skew === 2 ? 0.8 : 1)
  const s = ph + pd + pa
  ph /= s
  pd /= s
  pa /= s
  // «прогруз»: у части матчей коэффициент на одну из сторон сильно упал к закрытию
  const move = rng('move', g.id)
  const dropSide = move() < 0.2 ? (move() < 0.5 ? 'home' : 'away') : null
  const open = (v: number, side?: string) => {
    if (!opening) return v
    const drift = side && side === dropSide ? 1.12 + move() * 0.1 : 1 + (r() - 0.5) * 0.08
    return Math.round(v * drift * 100) / 100
  }
  const m = bm.margin
  const x12: RawBet = {
    marketId: 1,
    marketName: 'Match Winner',
    odds: [
      { name: 'Home', value: price(ph, m), openingValue: open(price(ph, m), 'home') },
      { name: 'Draw', value: price(pd, m), openingValue: open(price(pd, m)) },
      { name: 'Away', value: price(pa, m), openingValue: open(price(pa, m), 'away') },
    ],
  }
  const totals: RawBet = { marketId: 5, marketName: 'Goals Over/Under', odds: [] }
  for (const line of ['1.5', '2.5', '3.5']) {
    const po = Math.min(0.97, Math.max(0.03, tp.over[line] * jitter()))
    totals.odds.push({ name: `Over ${line}`, value: price(po, m), openingValue: open(price(po, m)) })
    totals.odds.push({ name: `Under ${line}`, value: price(1 - po, m), openingValue: open(price(1 - po, m)) })
  }
  const pb = Math.min(0.95, Math.max(0.05, tp.btts * jitter()))
  const btts: RawBet = {
    marketId: 8,
    marketName: 'Both Teams Score',
    odds: [
      { name: 'Yes', value: price(pb, m), openingValue: open(price(pb, m)) },
      { name: 'No', value: price(1 - pb, m), openingValue: open(price(1 - pb, m)) },
    ],
  }
  const dc: RawBet = {
    marketId: 12,
    marketName: 'Double Chance',
    odds: [
      { name: 'Home/Draw', value: price(ph + pd, m), openingValue: null },
      { name: 'Home/Away', value: price(ph + pa, m), openingValue: null },
      { name: 'Draw/Away', value: price(pd + pa, m), openingValue: null },
    ],
  }
  // рынки, которые парсер должен игнорировать
  const firstHalf: RawBet = {
    marketId: 13,
    marketName: 'First Half Winner',
    odds: [
      { name: 'Home', value: price(ph * 0.85, m), openingValue: null },
      { name: 'Draw', value: price(0.42, m), openingValue: null },
      { name: 'Away', value: price(pa * 0.85, m), openingValue: null },
    ],
  }
  const fhTotals: RawBet = {
    marketId: 6,
    marketName: 'Goals Over/Under First Half',
    odds: [
      { name: 'Over 0.5', value: price(0.7, m), openingValue: null },
      { name: 'Under 0.5', value: price(0.3, m), openingValue: null },
    ],
  }
  return [x12, totals, btts, dc, firstHalf, fhTotals]
}

/** Короткие кэфы для списка матчей — усреднение по «рынку». */
function listOdds(g: MockGame): RawBet[] {
  const all = BOOKMAKERS.map((b) => bookOdds(g, b, true))
  const avg = (market: number, name: string) => {
    const vals = all
      .map((bets) => bets.find((b) => b.marketId === market)?.odds.find((o) => o.name === name))
      .filter(Boolean) as { value: number; openingValue: number }[]
    const v = vals.reduce((s, o) => s + Number(o.value), 0) / vals.length
    const ov = vals.reduce((s, o) => s + Number(o.openingValue ?? o.value), 0) / vals.length
    return { name, value: Math.round(v * 100) / 100, openingValue: Math.round(ov * 100) / 100 }
  }
  return [
    { marketId: 1, marketName: 'Match Winner', odds: ['Home', 'Draw', 'Away'].map((n) => avg(1, n)) },
    { marketId: 5, marketName: 'Goals Over/Under', odds: ['Over 2.5', 'Under 2.5'].map((n) => avg(5, n)) },
  ]
}

// ─── Сборка «сырых» объектов ─────────────────────────────────────────────────

function isoWithOffset(ts: number, tz: number) {
  const d = new Date(ts + tz * 3_600_000)
  const sign = tz >= 0 ? '+' : '-'
  const hh = String(Math.abs(tz)).padStart(2, '0')
  return `${d.toISOString().slice(0, 19)}${sign}${hh}:00`
}

function toRawGame(g: MockGame, now: number, tz: number, withOdds = true): RawGame {
  const ph = phaseOf(g, now)
  const sc = ph.status === 2 ? null : scoreAt(g, ph.minute)
  const htKnown = ph.status >= 4 && ph.status !== 3
  const finished = ph.status === 8
  return {
    id: g.id,
    flashId: null,
    date: isoWithOffset(g.kickoff, tz),
    dateUtc: Math.floor(g.kickoff / 1000),
    status: ph.status,
    statusName: ph.statusName,
    elapsed: ph.elapsed,
    extraMinutes: finished ? 4 : null,
    homeResult: sc?.h ?? null,
    awayResult: sc?.a ?? null,
    homeHTResult: htKnown ? (sc?.hh ?? null) : null,
    awayHTResult: htKnown ? (sc?.ah ?? null) : null,
    homeFTResult: finished ? (sc?.h ?? null) : null,
    awayFTResult: finished ? (sc?.a ?? null) : null,
    homeTeam: rawTeam(g.home),
    awayTeam: rawTeam(g.away),
    season: {
      uid: seasonUid(g.league.id, g.year),
      year: g.year,
      league: {
        id: g.league.id,
        name: g.league.name,
        country: { code: g.league.code ?? '', name: g.league.country },
      },
    },
    roundName: g.league.id === 2 ? `League Stage - ${g.round + 1}` : `Regular Season - ${g.round + 1}`,
    // у второстепенных лиг линии нет — как у низших лиг в реальных данных
    odds: withOdds && !NO_ODDS_LEAGUES.has(g.league.id) ? listOdds(g) : [],
  }
}

function seasonUid(leagueId: number, year: number) {
  const h = hashSeed('season', leagueId, year).toString(16).padStart(8, '0').toUpperCase()
  return `${h}-${String(leagueId).padStart(4, '0')}-11F0-9829-${String(year).padStart(12, '0')}`
}

const SURNAMES = ['Silva', 'Müller', 'García', 'Rossi', 'Martin', 'Novak', 'Petrov', 'Smith', 'Fernandes',
  'Kovač', 'Jensen', 'Dubois', 'Ivanov', 'López', 'Bianchi', 'Schmidt', 'Moreau', 'Sokolov', 'Costa', 'Wilson',
  'Nieto', 'Hansen', 'Richter', 'Romero', 'Lindqvist', 'Mendes', 'Orlov', 'Keller', 'Duarte', 'Walker']
const INITIALS = 'ABCDEFGHJKLMNOPRSTV'

function playerName(team: string, n: number) {
  const r = rng('player', team, n)
  return `${INITIALS[Math.floor(r() * INITIALS.length)]}. ${SURNAMES[Math.floor(r() * SURNAMES.length)]}`
}

function fullGame(g: MockGame, now: number, tz: number): RawGameFull {
  const game = toRawGame(g, now, tz)
  const ph = phaseOf(g, now)
  const started = ph.status !== 2
  const r = rng('stats', g.id)
  const events: RawEvent[] = []
  if (started) {
    for (const goal of g.goals) {
      if (goal.minute > ph.minute) continue
      const team = goal.side === 'home' ? g.home : g.away
      events.push({
        teamId: TEAM_ID.get(team) ?? 0,
        elapsed: goal.minute,
        type: 1,
        name: r() < 0.1 ? 'Penalty' : 'Normal Goal',
        player: { id: null, name: playerName(team, Math.floor(r() * 11)) },
        assistPlayer: r() < 0.7 ? { id: null, name: playerName(team, 11 + Math.floor(r() * 11)) } : null,
      })
    }
    for (const card of g.cards) {
      if (card.minute > ph.minute) continue
      const team = card.side === 'home' ? g.home : g.away
      events.push({
        teamId: TEAM_ID.get(team) ?? 0,
        elapsed: card.minute,
        type: 2,
        name: 'Yellow Card',
        player: { id: null, name: playerName(team, Math.floor(r() * 22)) },
      })
    }
    events.sort((a, b) => Number(a.elapsed) - Number(b.elapsed))
  }
  let statistics: RawStatistics | null = null
  if (started) {
    const share = ph.minute / 90
    const poss = Math.round(50 + (strength(g.home) - strength(g.away)) * 18 + (r() - 0.5) * 8)
    const sc = scoreAt(g, ph.minute)
    const shotsH = Math.round((g.lh * 5 + r() * 4) * share) + sc.h
    const shotsA = Math.round((g.la * 5 + r() * 4) * share) + sc.a
    statistics = {
      ballPossessionHome: poss,
      ballPossessionAway: 100 - poss,
      totalShotsHome: shotsH,
      totalShotsAway: shotsA,
      shotsOnGoalHome: Math.max(sc.h, Math.round(shotsH * 0.38)),
      shotsOnGoalAway: Math.max(sc.a, Math.round(shotsA * 0.38)),
      cornerKicksHome: Math.round((3 + r() * 5) * share),
      cornerKicksAway: Math.round((2 + r() * 5) * share),
      foulsHome: Math.round((8 + r() * 6) * share),
      foulsAway: Math.round((8 + r() * 6) * share),
      yellowCardsHome: g.cards.filter((c) => c.side === 'home' && c.minute <= ph.minute).length,
      yellowCardsAway: g.cards.filter((c) => c.side === 'away' && c.minute <= ph.minute).length,
      offsidesHome: Math.round(r() * 4 * share),
      offsidesAway: Math.round(r() * 4 * share),
      expectedGoalsHome: Math.round(g.lh * share * (0.8 + r() * 0.4) * 100) / 100,
      expectedGoalsAway: Math.round(g.la * share * (0.8 + r() * 0.4) * 100) / 100,
      totalPassesHome: Math.round(poss * 9 * share),
      totalPassesAway: Math.round((100 - poss) * 9 * share),
    }
  }
  return {
    game,
    statistics,
    lineups: null,
    events,
    venue: null,
    refereeName: null,
  }
}

// ─── Обработчики эндпоинтов ──────────────────────────────────────────────────

const envelope = <T>(data: T, extra: Partial<ApiEnvelope<T>> = {}): ApiEnvelope<T> => ({
  status: 'OK',
  count: Array.isArray(data) ? data.length : 1,
  data,
  ...extra,
})

const bool = (p: URLSearchParams, k: string) => /^(1|true)$/i.test(p.get(k) ?? p.get(k.toLowerCase()) ?? '')
const num = (p: URLSearchParams, k: string) => {
  const v = p.get(k) ?? p.get(k.toLowerCase())
  return v == null || v === '' ? undefined : Number(v)
}
const ids = (p: URLSearchParams, k: string) =>
  (p.get(k) ?? p.get(k.toLowerCase()) ?? '')
    .split(',')
    .map((s) => Number(s))
    .filter((n) => n > 0)

function listGames(p: URLSearchParams, now: number) {
  const tz = num(p, 'TimeZone') ?? 3
  const limit = Math.min(1000, num(p, 'Limit') ?? 1000)
  const offset = num(p, 'Offset') ?? 0
  const order = num(p, 'Order') ?? 1
  const leagueId = num(p, 'LeagueId')
  const year = num(p, 'Year')
  const team = ids(p, 'Team')
  const both = ids(p, 'BothTeams')
  const idList = ids(p, 'Id')
  const ended = bool(p, 'Ended')
  const live = bool(p, 'Live')
  const upcoming = bool(p, 'Upcoming')
  const dateParam = p.get('Date') ?? p.get('date')
  const toParam = p.get('To') ?? p.get('to')
  const fromParam = p.get('From') ?? p.get('from')
  const todayYmd = ymdInTz(now)

  let leagues = LEAGUES
  if (leagueId) leagues = leagues.filter((l) => l.id === leagueId)
  const teamNames = [...team, ...both].map((id) => TEAM_NAME.get(id)).filter(Boolean) as string[]
  if (teamNames.length) leagues = leagues.filter((l) => teamNames.some((t) => l.teams.includes(t)))

  const toTs = toParam ? Date.parse(`${toParam.slice(0, 10)}T00:00:00Z`) - tz * 3_600_000 : Infinity
  const keep = (g: MockGame) => {
    const hid = TEAM_ID.get(g.home) ?? -1
    const aid = TEAM_ID.get(g.away) ?? -1
    if (team.length && !team.includes(hid) && !team.includes(aid)) return false
    if (both.length === 2 && !(both.includes(hid) && both.includes(aid))) return false
    if (g.kickoff >= toTs) return false
    const st = phaseOf(g, now).status
    if (ended && st !== 8) return false
    if (live && ![3, 4, 5].includes(st)) return false
    if (upcoming && !(st === 2 && g.kickoff > now)) return false
    return true
  }

  let games: MockGame[] = []
  if (idList.length) {
    games = idList.map(gameById).filter((g): g is MockGame => Boolean(g))
  } else {
    let from: number
    let to: number
    const today = dayIndexOf(todayYmd)
    if (dateParam) from = to = dayIndexOf(dateParam.slice(0, 10))
    else if (live || bool(p, 'Today')) from = to = today
    else if (leagueId && year) {
      const l = leagues[0]
      const rounds = l ? 2 * (l.teams.length - 1) : 0
      const k0 = (year - 2026) * rounds
      from = l ? l.offset + k0 * l.every : 0
      to = l ? l.offset + (k0 + rounds - 1) * l.every : -1
    } else {
      from = fromParam ? dayIndexOf(fromParam.slice(0, 10)) : upcoming ? today : today - 400
      to = toParam ? dayIndexOf(toParam.slice(0, 10)) - 1 : upcoming ? today + 60 : today + 30
      if (ended) to = Math.min(to, today)
    }
    from = Math.max(0, from)
    const need = offset + limit
    // обходим дни и сразу фильтруем: для запросов формы/личных встреч это существенно
    if (order === -1) {
      for (let d = to; d >= from && games.length < need; d--) games.push(...gamesOnDay(d, leagues).filter(keep))
    } else {
      for (let d = from; d <= to && games.length < need; d++) games.push(...gamesOnDay(d, leagues).filter(keep))
    }
  }

  const matched = games.filter(keep)
  matched.sort((a, b) => (a.kickoff - b.kickoff) * (order === -1 ? -1 : 1) || a.id - b.id)
  return envelope(
    matched.slice(offset, offset + limit).map((g) => toRawGame(g, now, tz)),
    { offset, TotalCount: matched.length },
  )
}

function standings(p: URLSearchParams, now: number): ApiEnvelope<RawStandings> {
  const leagueId = num(p, 'leagueId') ?? num(p, 'LeagueId')
  const league = leagueId ? LEAGUE_BY_ID.get(leagueId) : undefined
  if (!league) return envelope<RawStandings>({ tables: [] })
  const year = num(p, 'year') ?? num(p, 'Year') ?? 2026
  const rounds = 2 * (league.teams.length - 1)
  const table = new Map<string, RawStandingRow & { form5: string[] }>()
  for (const t of league.teams) {
    table.set(t, {
      teamId: TEAM_ID.get(t) ?? 0, rank: 0, points: 0, played: 0, wins: 0, draws: 0, loses: 0,
      goalsFor: 0, goalsAgainst: 0, form: '', description: null, groupName: null, form5: [],
    })
  }
  const k0 = (year - 2026) * rounds
  for (let k = k0; k < k0 + rounds; k++) {
    for (let i = 0; i < league.teams.length / 2; i++) {
      const g = makeGame(league, k, i)
      if (!g || phaseOf(g, now).status !== 8) continue
      const s = scoreAt(g, 90)
      const h = table.get(g.home)!
      const a = table.get(g.away)!
      h.played = Number(h.played) + 1
      a.played = Number(a.played) + 1
      h.goalsFor = Number(h.goalsFor) + s.h
      h.goalsAgainst = Number(h.goalsAgainst) + s.a
      a.goalsFor = Number(a.goalsFor) + s.a
      a.goalsAgainst = Number(a.goalsAgainst) + s.h
      const res = s.h > s.a ? ['W', 'L'] : s.h < s.a ? ['L', 'W'] : ['D', 'D']
      for (const [row, r] of [[h, res[0]], [a, res[1]]] as const) {
        if (r === 'W') { row.wins = Number(row.wins) + 1; row.points = Number(row.points) + 3 }
        if (r === 'D') { row.draws = Number(row.draws) + 1; row.points = Number(row.points) + 1 }
        if (r === 'L') row.loses = Number(row.loses) + 1
        row.form5.push(r)
      }
    }
  }
  const rows = [...table.values()].sort(
    (a, b) =>
      Number(b.points) - Number(a.points) ||
      Number(b.goalsFor) - Number(b.goalsAgainst) - (Number(a.goalsFor) - Number(a.goalsAgainst)) ||
      Number(b.goalsFor) - Number(a.goalsFor),
  )
  const n = rows.length
  const out = rows.map(({ form5, ...row }, i) => ({
    ...row,
    rank: i + 1,
    form: form5.slice(-5).join(''),
    description:
      league.id === 2
        ? i < 8 ? 'Promotion - Champions League (Round of 16)' : null
        : i < 4 ? 'Promotion - Champions League (League phase)' : i >= n - 3 ? 'Relegation' : null,
  }))
  return envelope<RawStandings>({
    season: { uid: seasonUid(league.id, year), year, league: { id: league.id, name: league.name } },
    tables: [{ tableNum: 1, rows: out }],
  })
}

function leaguesList(): ApiEnvelope<RawLeagueWithSeasons[]> {
  return envelope(
    LEAGUES.map((l) => ({
      id: l.id,
      name: l.name,
      country: { code: l.code ?? '', name: l.country },
      seasons: [2025, 2026].map((year) => ({
        uid: seasonUid(l.id, year),
        year,
        dateStart: `${year}-08-07`,
        dateEnd: `${year + 1}-05-31`,
      })),
    })),
  )
}

function injuries(gameId: number): RawInjury[] {
  const g = gameById(gameId)
  if (!g) return []
  const out: RawInjury[] = []
  const reasons = ['Knee Injury', 'Hamstring Injury', 'Suspended', 'Ankle Injury', 'Muscle Injury', 'Illness',
    'Red Card', 'Yellow Cards']
  for (const team of [g.home, g.away]) {
    const r = rng('inj', g.id, team)
    const n = Math.floor(r() * r() * 5)
    for (let i = 0; i < n; i++) {
      out.push({
        gameId: g.id,
        teamId: TEAM_ID.get(team) ?? 0,
        player: { id: null, name: playerName(team, 30 + i) },
        reason: reasons[Math.floor(r() * reasons.length)],
      })
    }
  }
  return out
}

function glicko(gameId: number, now: number): ApiEnvelope<RawGameGlicko> {
  const g = gameById(gameId)
  if (!g) return envelope<RawGameGlicko>({ glicko: null })
  const tp = trueProbs(g.lh, g.la)
  const r = rng('glicko', g.id)
  return envelope<RawGameGlicko>({
    fixture: toRawGame(g, now, 3, false),
    glicko: {
      homeRating: Math.round(1500 + (strength(g.home) - 1) * 520 + (r() - 0.5) * 40),
      homeRd: Math.round(45 + r() * 30),
      awayRating: Math.round(1500 + (strength(g.away) - 1) * 520 + (r() - 0.5) * 40),
      awayRd: Math.round(45 + r() * 30),
      homeXg: Math.round(g.lh * (0.92 + r() * 0.16) * 100) / 100,
      awayXg: Math.round(g.la * (0.92 + r() * 0.16) * 100) / 100,
      homeWinProbability: Math.round(tp.ph * 1000) / 1000,
      awayWinProbability: Math.round(tp.pa * 1000) / 1000,
      updated: new Date(g.kickoff - 6 * 3_600_000).toISOString(),
      homeVolatility: 0.06,
      awayVolatility: 0.06,
    },
  })
}

function odds(gameId: number): ApiEnvelope<RawBookmakerOdds[]> {
  const g = gameById(gameId)
  if (!g) return envelope<RawBookmakerOdds[]>([])
  const r = rng('coverage', g.id)
  const books = BOOKMAKERS.filter(() => r() < 0.88)
  return envelope(
    books.map((b) => ({ bookmakerId: b.id, bookmakerName: b.name, odds: bookOdds(g, b, true) })),
  )
}

/**
 * Точка входа: имитирует GET {path}?{params} к api.sstats.net. Часы — общие с сайтом (`appNow`):
 * SSTATS_MOCK_NOW=2026-10-02T19:30:00+03:00 «переводит» их (например, чтобы посмотреть live ночью),
 * SSTATS_MOCK=design — останавливает на 4 октября, 19:30.
 */
export async function mockFetch(pathname: string, params: URLSearchParams): Promise<unknown> {
  await loadLogos()
  const now = appNow()
  const path = pathname.replace(/\/+$/, '')
  const low = path.toLowerCase()
  let m: RegExpExecArray | null
  if (low === '/games/list') return listGames(params, now)
  if (low === '/leagues') return leaguesList()
  if (low === '/seasons/standings') return standings(params, now)
  if (low === '/games/injuries') return injuries(Number(params.get('gameId')))
  if (low === '/odds/bookmakers') return envelope(BOOKMAKERS.map((b) => ({ id: b.id, bookmakerName: b.name })))
  if ((m = /^\/games\/glicko\/(\d+)$/.exec(low))) return glicko(Number(m[1]), now)
  if ((m = /^\/odds\/(\d+)$/.exec(low))) return odds(Number(m[1]))
  if ((m = /^\/games\/(\d+)$/.exec(low))) {
    const g = gameById(Number(m[1]))
    if (!g) return { status: 'Error', message: 'Game not found', data: null }
    return envelope(fullGame(g, now, Number(params.get('TimeZone') ?? 3)))
  }
  return { status: 'Error', message: `Mock: неизвестный эндпоинт ${pathname}`, data: null }
}

/** Для тестов. */
export const __mock = { LEAGUES, TEAM_ID, gameById, pairings, trueProbs, DAY }
