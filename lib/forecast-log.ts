import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { partnerForApiBookmaker } from '@/config/bookmakers'
import { isFeatured } from '@/config/leagues'
import { leagueTitle } from './flags'
import { matchHref } from './links'
import { addDays, appNow, todayYmd, ymdInTz } from './format'
import { isValue, quoteOf, type Candidate, type Consensus, type ModelOutput } from './model'
import type { BookOdds } from './odds'
import { singleton } from './runtime'
import type { Forecast, ValueTrack } from './track-record'
import type { Match } from './types'

/**
 * Архив оценок для «Истории точности»: файл на день начала матча — `<DATA_DIR>/forecasts/2026-10-30.json` (id → запись).
 * Оценку пишем, пока матч не начался (каждый пересчёт разбора — последняя версия перед стартом), после начала запись не
 * меняется — только итог. Диск, а не кэш: архив копится месяцами и не должен пропадать при перезапуске или чистке кэша.
 * В демо не пишем (часы стоят) — страница там собирает архив из сыгранных матчей демо (`demoForecasts`).
 */
const DIR = path.join(process.env.DATA_DIR || path.join(process.cwd(), '.data'), 'forecasts')
const IN_MOCK = process.env.SSTATS_MOCK === '1' || process.env.SSTATS_MOCK === 'design'
/** Итог ждём не раньше, чем через 2 часа после начала. */
const SETTLE_AFTER = 2 * 3600_000

type Day = { rows: Map<number, Forecast>; dirty: boolean; timer: NodeJS.Timeout | null }
const days = singleton('forecast-days', () => new Map<string, Promise<Day>>())
let dirReady: Promise<unknown> | null = null

const file = (ymd: string) => path.join(DIR, `${ymd}.json`)

function day(ymd: string): Promise<Day> {
  let d = days.get(ymd)
  if (!d) {
    d = readFile(file(ymd), 'utf8')
      .then((raw) => new Map((JSON.parse(raw) as Forecast[]).map((f) => [f.id, f] as const)))
      .catch(() => new Map<number, Forecast>())
      .then((rows) => ({ rows, dirty: false, timer: null }))
    days.set(ymd, d)
  }
  return d
}

/** Пишем не чаще раза в 5 с на день: разбор матча пересчитывается часто, а файл дня один. */
function flushLater(ymd: string, d: Day) {
  d.dirty = true
  if (d.timer) return
  d.timer = setTimeout(() => {
    d.timer = null
    if (!d.dirty) return
    d.dirty = false
    void (async () => {
      dirReady ??= mkdir(DIR, { recursive: true })
      await dirReady
      const tmp = `${file(ymd)}.${process.pid}.tmp`
      await writeFile(tmp, JSON.stringify([...d.rows.values()]))
      await rename(tmp, file(ymd))
    })().catch((e) => console.error('[forecasts] не записали', ymd, e))
  }, 5_000)
  d.timer.unref?.()
}

const r3 = (x: number) => Math.round(x * 1000) / 1000
const r3n = (x: number | null | undefined) => (x == null ? null : r3(x))

/**
 * Ставки «Выгодно» до начала: новая — с кэфом букмекера сейчас (`first`), у прежних — последний кэф того же букмекера на ту
 * же ставку (`last`), даже если она уже не выгодна; пропала линия — `last` прежний.
 */
export function trackValues(prev: ValueTrack[], books: BookOdds[], candidates: Candidate[], now: number): ValueTrack[] {
  const out = new Map(prev.map((v) => [`${v.key}:${v.slug}`, { ...v }]))
  for (const v of out.values()) {
    const b = books.find((x) => partnerForApiBookmaker(x.bookmakerId, x.bookmakerName)?.slug === v.slug)
    const q = b ? quoteOf(b, v.key) : undefined
    if (q) {
      v.last = q.value
      v.lastAt = now
    }
  }
  for (const c of candidates) {
    const slug = c.bestPartner?.partner?.slug
    if (!slug || !isValue(c) || out.has(`${c.key}:${slug}`)) continue
    const odd = c.bestPartner!.value
    out.set(`${c.key}:${slug}`, { key: c.key, slug, prob: r3(c.prob), first: odd, firstAt: now, last: odd, lastAt: now })
  }
  return [...out.values()]
}

/** Последняя оценка перед началом матча (из `computeMatchInsights`); `books`/`candidates` — для «Выгодно» (`trackValues`). */
export async function recordForecast(m: Match, model: ModelOutput | null, cons: Consensus, books: BookOdds[] = [], candidates: Candidate[] = []) {
  if (IN_MOCK || !model || m.status !== 'scheduled' || m.ts <= appNow()) return
  const ymd = ymdInTz(m.ts)
  const d = await day(ymd)
  const value = trackValues(d.rows.get(m.id)?.value ?? [], books, candidates, appNow())
  d.rows.set(m.id, {
    id: m.id,
    ts: m.ts,
    league: leagueTitle(m.league.name),
    leagueId: m.league.id,
    featured: isFeatured(m.league),
    home: m.home.name,
    away: m.away.name,
    href: matchHref(m),
    at: appNow(),
    p: { home: r3(model.x12.home), draw: r3(model.x12.draw), away: r3(model.x12.away), over25: r3n(model.over['2.5']), btts: r3n(model.btts) },
    line: cons.x12
      ? { home: r3(cons.x12.home), draw: r3(cons.x12.draw), away: r3(cons.x12.away), over25: r3n(cons.over['2.5']), btts: r3n(cons.btts) }
      : null,
    ...(value.length ? { value } : {}),
  })
  flushLater(ymd, d)
}

/**
 * Сверка с итогом: за последние `back` дней (по дню начала) записи без итога, которым пора, ищем в списке матчей дня.
 * Сыгран — счёт основного времени, отменён или перенесён — `void`. Список дня — тот же кэш, что у страниц.
 */
export async function settleForecasts(load: (ymd: string) => Promise<Match[]>, back = 3) {
  if (IN_MOCK) return
  const now = appNow()
  const today = todayYmd()
  for (let i = back; i >= 0; i--) {
    const ymd = addDays(today, -i)
    const d = await day(ymd)
    const open = [...d.rows.values()].filter((f) => !f.res && !f.void && f.ts < now - SETTLE_AFTER)
    if (!open.length) continue
    const list = await load(ymd).catch(() => null)
    if (!list) continue
    const byId = new Map(list.map((m) => [m.id, m]))
    let changed = false
    for (const f of open) {
      const m = byId.get(f.id)
      if (!m) continue
      const s = m.scoreFT ?? m.score
      if (m.status === 'finished' && s) {
        f.res = { home: s.home, away: s.away }
        changed = true
      } else if (m.status === 'cancelled' || m.status === 'postponed') {
        f.void = true
        changed = true
      }
    }
    if (changed) flushLater(ymd, d)
  }
}

/** Записи за последние `back` дней (по дню начала матча). */
export async function readForecasts(back: number): Promise<Forecast[]> {
  const today = todayYmd()
  const out: Forecast[] = []
  for (let i = back; i >= 0; i--) out.push(...(await day(addDays(today, -i))).rows.values())
  return out
}

export const FORECASTS_IN_MOCK = IN_MOCK
