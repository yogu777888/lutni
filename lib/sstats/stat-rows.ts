/**
 * Строки блока «Статистика» на странице матча: все показатели `/Ls/GameInfo` (`metrics` и `otherStats`) по периодам
 * — матч, 1-й и 2-й тайм, дополнительное время — и строки `/Games/{id}` для матча целиком (они обновляются чаще).
 * Одна таблица `META`: подпись, группа, вид полосы и «больше — хуже» — и для `/Games`, и для `/Ls`. Незнакомые метрики
 * не прячем: подпись — как в API, группа — по группам API. Нет значения — `null`, нулём не подменяем.
 */
import type { StatPair } from '../types'
import type { RawLsInfo, RawLsMetric, RawLsPeriod } from './ls'

export type StatGroup = 'ball' | 'attack' | 'defense' | 'gk' | 'discipline' | 'other'

export const GROUP_TITLE: Record<StatGroup, string> = {
  ball: 'Игра с мячом',
  attack: 'Атака',
  defense: 'Оборона',
  gk: 'Вратари',
  discipline: 'Дисциплина',
  other: 'Остальные показатели',
}
export const GROUP_ORDER: StatGroup[] = ['ball', 'attack', 'defense', 'gk', 'discipline', 'other']

/**
 * `count` — количество: полоса по долям `home / (home + away)`; `share` — доли одного целого (владение, в сумме 100):
 * тоже по долям; `pct` — у каждой команды своя шкала 0–100 (точность передач 82% и 77%): две половинки от центра,
 * каждая — из 100%.
 */
export type StatKind = 'count' | 'share' | 'pct'

export type StatRow = {
  key: string
  label: string
  group: StatGroup
  home: number | null
  away: number | null
  kind: StatKind
  suffix?: string
  /** «372/452» у процента из точных и всех */
  detail?: { home: string | null; away: string | null }
  /** больше — не лучше (карточки, фолы, ошибки): лидера не выделяем */
  neutral?: boolean
}

export type StatPeriodKey = 'all' | 'first' | 'second' | 'extra'
export type StatPeriod = { key: StatPeriodKey; label: string; rows: StatRow[] }

type Meta = { key: string; id?: string; label: string; group: StatGroup; kind?: StatKind; neutral?: boolean }

/** Порядок строк в группе — порядок здесь. Ключи без `id` — только из `/Games`. */
const META: Meta[] = [
  { key: 'ballPossession', id: '12', label: 'Владение мячом', group: 'ball', kind: 'share' },
  { key: 'passAccuracy', id: '342', label: 'Точность передач', group: 'ball', kind: 'pct' },
  { key: 'totalPasses', label: 'Передачи', group: 'ball' },
  { key: 'longPasses', id: '517', label: 'Длинные передачи', group: 'ball', kind: 'pct' },
  { key: 'finalThirdPasses', id: '467', label: 'Передачи в последней трети', group: 'ball', kind: 'pct' },
  { key: 'crosses', id: '433', label: 'Навесы', group: 'ball', kind: 'pct' },
  { key: 'throughPasses', id: '521', label: 'Точные передачи вразрез', group: 'ball' },
  { key: 'expectedGoals', id: '432', label: 'Ожидаемые голы (xG)', group: 'attack' },
  { key: 'xgOnTarget', id: '499', label: 'xG ударов в створ (xGOT)', group: 'attack' },
  { key: 'expectedAssists', id: '503', label: 'Ожидаемые передачи (xA)', group: 'attack' },
  { key: 'totalShots', id: '34', label: 'Удары', group: 'attack' },
  { key: 'shotsOnGoal', id: '13', label: 'Удары в створ', group: 'attack' },
  { key: 'shotsOffGoal', id: '14', label: 'Удары мимо', group: 'attack' },
  { key: 'blockedShots', id: '158', label: 'Заблокированные удары', group: 'attack' },
  { key: 'shotsInsideBox', id: '461', label: 'Удары из штрафной', group: 'attack' },
  { key: 'shotsOutsideBox', id: '463', label: 'Удары из‑за штрафной', group: 'attack' },
  { key: 'hitWoodwork', id: '457', label: 'Попадания в каркас ворот', group: 'attack' },
  { key: 'bigChances', id: '459', label: 'Голевые моменты', group: 'attack' },
  { key: 'touchesInBox', id: '471', label: 'Касания в штрафной соперника', group: 'attack' },
  { key: 'dangerousAttacks', label: 'Опасные атаки', group: 'attack' },
  { key: 'cornerKicks', id: '16', label: 'Угловые', group: 'attack' },
  { key: 'tackles', id: '475', label: 'Отборы', group: 'defense', kind: 'pct' },
  { key: 'duelsWon', id: '513', label: 'Выигранные единоборства', group: 'defense' },
  { key: 'interceptions', id: '434', label: 'Перехваты', group: 'defense' },
  { key: 'clearances', id: '479', label: 'Выносы', group: 'defense' },
  { key: 'errorsToShot', id: '507', label: 'Ошибки, приведшие к удару', group: 'defense', neutral: true },
  { key: 'errorsToGoal', id: '509', label: 'Ошибки, приведшие к голу', group: 'defense', neutral: true },
  { key: 'goalkeeperSaves', id: '19', label: 'Сейвы', group: 'gk' },
  { key: 'xgotFaced', id: '501', label: 'xGOT по своим воротам', group: 'gk', neutral: true },
  { key: 'goalsPrevented', id: '511', label: 'Предотвращённые голы', group: 'gk' },
  { key: 'goalKicks', id: '20', label: 'Удары от ворот', group: 'gk' },
  { key: 'fouls', id: '21', label: 'Фолы', group: 'discipline', neutral: true },
  { key: 'yellowCards', id: '23', label: 'Жёлтые карточки', group: 'discipline', neutral: true },
  { key: 'redCards', id: '22', label: 'Красные карточки', group: 'discipline', neutral: true },
  { key: 'offsides', id: '17', label: 'Офсайды', group: 'discipline', neutral: true },
  { key: 'freeKicks', id: '15', label: 'Штрафные удары', group: 'other' },
  { key: 'throwIns', id: '18', label: 'Вбрасывания аутов', group: 'other' },
]
const BY_KEY = new Map(META.map((m) => [m.key, m]))
const BY_ID = new Map(META.filter((m) => m.id).map((m) => [m.id!, m]))
const RANK = new Map(META.map((m, i) => [m.key, i]))

/** «Основные»: шесть ключевых строк одним списком, в этом порядке. */
export const MAIN_KEYS = ['expectedGoals', 'ballPossession', 'totalShots', 'shotsOnGoal', 'bigChances', 'cornerKicks']

/** Пояснения к непонятным строкам — ⓘ у подписи. */
export const STAT_HINT: Record<string, string> = {
  xgOnTarget: 'Ожидаемые голы по ударам в створ: учитывает ещё и куда полетел мяч. Больше xG — удары были точнее обычного.',
  expectedAssists: 'Ожидаемые голевые передачи — сколько голов должны были принести передачи под удар, по качеству этих моментов.',
  bigChances: 'Голевой момент — ситуация, где игрок обычно забивает: выход один на один, удар в упор.',
  xgotFaced: 'xGOT ударов соперника в створ — сколько голов вратарь «должен был» пропустить.',
  goalsPrevented: 'Сколько голов вратарь спас сверх ожидаемого: xGOT ударов соперника минус пропущенные. Меньше нуля — пропустил больше ожидаемого.',
  touchesInBox: 'Сколько раз игроки команды касались мяча в штрафной площади соперника.',
}

const ord = (r: StatRow) => RANK.get(r.key) ?? META.length

function apiGroup(groups: string[] | null | undefined): StatGroup {
  const g = (groups ?? []).map((x) => x.toLowerCase())
  if (g.includes('goalkeeping')) return 'gk'
  if (g.includes('defense') || g.includes('defence')) return 'defense'
  if (g.includes('passes')) return 'ball'
  if (g.includes('shots') || g.includes('attack')) return 'attack'
  return 'other'
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** «56%», «0.98», «-0,53» → число; «82% (372/452)» → 82; иначе null. */
function parseRaw(raw: unknown): number | null {
  if (finite(raw)) return raw
  if (typeof raw !== 'string') return null
  const m = /^\s*(-?\d+(?:[.,]\d+)?)/.exec(raw)
  return m ? Number(m[1].replace(',', '.')) : null
}

function metricRow(m: RawLsMetric): StatRow | null {
  const meta = BY_ID.get(m.id)
  const side = (s: RawLsMetric['home']) => {
    if (!s) return { v: null, pct: false, detail: null }
    const pct = finite(s.percentage) && !finite(s.value)
    const v = finite(s.value) ? s.value : finite(s.percentage) ? s.percentage : parseRaw(s.raw)
    const detail = finite(s.successful) && finite(s.total) ? `${s.successful}/${s.total}` : null
    return { v, pct: pct || (!finite(s.value) && typeof s.raw === 'string' && s.raw.includes('%')), detail }
  }
  const h = side(m.home)
  const a = side(m.away)
  if (h.v === null && a.v === null) return null
  const pct = h.pct || a.pct
  const kind: StatKind = meta?.kind ?? (pct ? 'pct' : 'count')
  return {
    key: meta?.key ?? `ls-${m.id}`,
    label: meta?.label ?? (m.name || `Показатель ${m.id}`),
    group: meta?.group ?? apiGroup(m.groups),
    home: h.v,
    away: a.v,
    kind,
    suffix: kind === 'count' ? undefined : '%',
    detail: h.detail || a.detail ? { home: h.detail, away: a.detail } : undefined,
    neutral: meta?.neutral,
  }
}

const sortRows = (rows: StatRow[]) => rows.sort((x, y) => ord(x) - ord(y))

/** Строки периода: `metrics` и то из `otherStats`, чего в `metrics` нет (сверяем по названию). */
export function periodRows(p: RawLsPeriod | null | undefined): StatRow[] {
  const rows = (p?.metrics ?? []).map(metricRow).filter((r): r is StatRow => !!r)
  const names = new Set((p?.metrics ?? []).map((m) => (m.name ?? '').toLowerCase()))
  for (const [name, v] of Object.entries(p?.otherStats ?? {})) {
    if (names.has(name.toLowerCase())) continue
    const home = parseRaw(v?.home)
    const away = parseRaw(v?.away)
    if (home === null && away === null) continue
    rows.push({ key: `other-${name.toLowerCase().replace(/\W+/g, '-')}`, label: name, group: 'other', home, away, kind: 'count' })
  }
  return sortRows(rows)
}

/** Ключ периода в API: «fullTime», «firstHalf», «secondHalf», дополнительное время — «extraTime» (бывает «extraTIme»). */
function periodKey(k: string): StatPeriodKey | null {
  const s = k.toLowerCase()
  if (s === 'fulltime') return 'all'
  if (s === 'firsthalf') return 'first'
  if (s === 'secondhalf') return 'second'
  if (s.startsWith('extra')) return 'extra'
  return null
}
const PERIOD_LABEL: Record<StatPeriodKey, string> = { all: 'Матч', first: '1-й тайм', second: '2-й тайм', extra: 'Доп. время' }
const PERIOD_ORDER: StatPeriodKey[] = ['all', 'first', 'second', 'extra']

/** Периоды `/Ls/GameInfo`, где есть строки (тайм — от трёх: иначе вкладка почти пустая). */
export function lsPeriods(info: RawLsInfo | null | undefined): StatPeriod[] {
  const out: StatPeriod[] = []
  for (const [k, p] of Object.entries(info?.statistics ?? {})) {
    const key = periodKey(k)
    if (!key || out.some((x) => x.key === key)) continue
    const rows = periodRows(p)
    if (rows.length >= (key === 'all' ? 1 : 3)) out.push({ key, label: PERIOD_LABEL[key], rows })
  }
  // в первом тайме «1-й тайм» повторял бы «Матч»: таймы — когда начался второй
  const shown = out.some((p) => p.key === 'second') ? out : out.filter((p) => p.key !== 'first')
  return shown.sort((a, b) => PERIOD_ORDER.indexOf(a.key) - PERIOD_ORDER.indexOf(b.key))
}

/** Строка `/Games` (`StatPair`) — в вид блока. */
export function pairRow(s: StatPair): StatRow {
  const meta = BY_KEY.get(s.key)
  const kind: StatKind = meta?.kind ?? (s.suffix === '%' ? 'pct' : 'count')
  return { key: s.key, label: meta?.label ?? s.label, group: meta?.group ?? 'other', home: s.home, away: s.away, kind, suffix: s.suffix, neutral: meta?.neutral }
}

/**
 * Матч целиком: строки `/Games` важнее (обновляются вместе со счётом), остальное — из `/Ls/GameInfo`; у процента
 * из `/Ls` остаётся «372/452».
 */
export function matchRows(games: StatPair[], ls: StatRow[]): StatRow[] {
  const byKey = new Map(ls.map((r) => [r.key, r]))
  for (const s of games) {
    const r = pairRow(s)
    const old = byKey.get(s.key)
    byKey.set(s.key, old ? { ...old, home: r.home, away: r.away, detail: r.home === old.home && r.away === old.away ? old.detail : undefined } : r)
  }
  return sortRows([...byKey.values()])
}

/** «Все показатели»: 0 : 0 не показываем (кроме жёлтых — как `visibleStats`), одна сторона без значения — показываем. */
export const shownAll = (r: StatRow) => !(r.home === 0 && r.away === 0) || r.key === 'yellowCards'
