import { SITE } from '@/config/site'

/** Русские формы множественного числа: plural(5, ['матч', 'матча', 'матчей']). */
export function plural(n: number, forms: readonly [string, string, string]): string {
  const a = Math.abs(n)
  const n10 = a % 10
  const n100 = a % 100
  if (n10 === 1 && n100 !== 11) return forms[0]
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return forms[1]
  return forms[2]
}

export const pluralN = (n: number, forms: readonly [string, string, string]) => `${n} ${plural(n, forms)}`

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  ß: 'ss', ø: 'o', æ: 'ae', œ: 'oe', ł: 'l', ı: 'i', đ: 'd', þ: 'th',
}

export function slugify(input: string, max = 80): string {
  const lower = input.toLowerCase()
  let out = ''
  for (const ch of lower) out += TRANSLIT[ch] ?? ch
  return out
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/g, '')
}

/** Первое число из строки «123-arsenal-chelsea» → 123. */
export function idFromSlug(slug: string): number | null {
  const m = /^(\d+)/.exec(slug)
  if (!m) return null
  const id = Number(m[1])
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

// ─── Даты ────────────────────────────────────────────────────────────────────
// Все «календарные» операции делаем в часовом поясе сайта (по умолчанию МСК).

const ymdFmt = new Map<string, Intl.DateTimeFormat>()
function fmt(tz: string): Intl.DateTimeFormat {
  let f = ymdFmt.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
    ymdFmt.set(tz, f)
  }
  return f
}

export const isYmd = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`))

/** Дата «YYYY-MM-DD» момента `ts` в часовом поясе сайта. */
export function ymdInTz(ts: number, tz: string = SITE.timeZone): string {
  return fmt(tz).format(new Date(ts))
}

// ─── Часы сайта ──────────────────────────────────────────────────────────────

/**
 * «Сейчас» для сайта и демо-данных — одни часы на всех: иначе «через 40 мин» и «что уже началось»
 * расходятся с матчами. В демо (SSTATS_MOCK=1 или design) часы стоят: всегда воскресенье, 4 октября
 * 2026-го, 19:30 по Москве — на главной один и тот же день во всех состояниях (идут, скоро, сыграны),
 * так попросил владелец, пока идёт работа над виджетами. SSTATS_MOCK_NOW «переводит» часы демо, и дальше
 * время идёт от этого момента (например, чтобы посмотреть, как матчи начинаются). На клиенте переменных
 * демо нет — там обычные часы.
 */
const MOCK_MODE = process.env.SSTATS_MOCK
const IN_MOCK = MOCK_MODE === '1' || MOCK_MODE === 'design'
export const DESIGN_NOW = Date.parse('2026-10-04T19:30:00+03:00')
const SHIFT_FROM = Date.parse(process.env.SSTATS_MOCK_NOW ?? '')
/** Демо со стоящими часами (без SSTATS_MOCK_NOW). */
export const CLOCK_FROZEN = IN_MOCK && !Number.isFinite(SHIFT_FROM)
const CLOCK_SHIFT = IN_MOCK && Number.isFinite(SHIFT_FROM) ? SHIFT_FROM - Date.now() : 0
export const appNow = (): number => (CLOCK_FROZEN ? DESIGN_NOW : Date.now() + CLOCK_SHIFT)

export const todayYmd = () => ymdInTz(appNow())

export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

export function diffDays(a: string, b: string): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000)
}

/** Смещение часового пояса в часах (целое — так его принимает SStats). */
export function tzOffsetHours(tz: string = SITE.timeZone, at: number = Date.now()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(at))
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]))
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
  return Math.max(-12, Math.min(12, Math.round((asUtc - Math.floor(at / 1000) * 1000) / 3_600_000)))
}

const timeFmt = new Intl.DateTimeFormat('ru-RU', { timeZone: SITE.timeZone, hour: '2-digit', minute: '2-digit' })
const dayMonthFmt = new Intl.DateTimeFormat('ru-RU', { timeZone: SITE.timeZone, day: 'numeric', month: 'long' })
const dayMonthYearFmt = new Intl.DateTimeFormat('ru-RU', {
  timeZone: SITE.timeZone,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const shortDateFmt = new Intl.DateTimeFormat('ru-RU', {
  timeZone: SITE.timeZone,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})
const shortDayFmt = new Intl.DateTimeFormat('ru-RU', { timeZone: SITE.timeZone, day: '2-digit', month: '2-digit' })
const weekdayFmt = new Intl.DateTimeFormat('ru-RU', { timeZone: SITE.timeZone, weekday: 'short' })
const weekdayLongFmt = new Intl.DateTimeFormat('ru-RU', { timeZone: SITE.timeZone, weekday: 'long' })

export const formatTime = (ts: number) => timeFmt.format(new Date(ts))
/** «1 октября» */
export const formatDayMonth = (ts: number) => dayMonthFmt.format(new Date(ts))
/** «1 октября 2026 г.» → «1 октября 2026» */
export const formatDateLong = (ts: number) => dayMonthYearFmt.format(new Date(ts)).replace(/\s*г\.$/, '')
/** «01.10.2026» */
export const formatDateShort = (ts: number) => shortDateFmt.format(new Date(ts))
/** «01.10» */
export const formatDayShort = (ts: number) => shortDayFmt.format(new Date(ts))
export const formatWeekday = (ts: number) => weekdayFmt.format(new Date(ts))
export const formatWeekdayLong = (ts: number) => weekdayLongFmt.format(new Date(ts))

const weekdayIdxFmt = new Intl.DateTimeFormat('en-US', { timeZone: SITE.timeZone, weekday: 'short' })
const WEEKDAY_IDX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
const WEEKDAY_WHEN = ['в воскресенье', 'в понедельник', 'во вторник', 'в среду', 'в четверг', 'в пятницу', 'в субботу']

/** «в четверг», «во вторник» — для фраз «матч пройдёт …». */
export const weekdayWhen = (ts: number) => WEEKDAY_WHEN[WEEKDAY_IDX[weekdayIdxFmt.format(new Date(ts))] ?? 0]

/** Полдень выбранного дня в UTC — безопасная точка для форматирования «дня». */
export const ymdToNoonTs = (ymd: string) => Date.parse(`${ymd}T12:00:00Z`)

/** «Сегодня», «Завтра», «Вчера» или «пт, 3 октября». */
export function dayLabel(ymd: string, today: string = todayYmd()): string {
  const d = diffDays(ymd, today)
  if (d === 0) return 'Сегодня'
  if (d === 1) return 'Завтра'
  if (d === -1) return 'Вчера'
  const ts = ymdToNoonTs(ymd)
  return `${formatWeekday(ts)}, ${formatDayMonth(ts)}`
}

// ─── Числа ───────────────────────────────────────────────────────────────────

export const formatOdd = (v: number | undefined | null) => (v && v > 1 ? v.toFixed(2) : '—')
export const pct = (p: number | undefined | null, digits = 0) =>
  p == null || Number.isNaN(p) ? '—' : `${(p * 100).toFixed(digits)}%`
export const signedPct = (p: number, digits = 1) => `${p >= 0 ? '+' : ''}${(p * 100).toFixed(digits)}%`
export const round1 = (x: number) => Math.round(x * 10) / 10
