/**
 * Фоновый прогрев: заранее разбирает ближайшие матчи топ-лиг (линия, модель,
 * форма, теги), чтобы страницы открывались мгновенно, а ленты тегов (#value,
 * #серия…) были наполнены. Работает с низким приоритетом и не мешает
 * запросам живых пользователей (см. rate-limit.ts).
 *
 * Env: WARMER=0 — выключить; WARMER_INTERVAL_MIN (15); WARMER_MAX_MATCHES (60).
 */
import { isFeatured } from '@/config/leagues'
import { featuredFirst, getChanceCheck, getMatchInsights, getMatchesByDate, settle } from './data'
import { addDays, todayYmd } from './format'
import { singleton } from './runtime'

type State = {
  started: boolean
  running: boolean
  lastRun: number
  lastDuration: number
  analyzed: number
  errors: number
  queue: Set<number>
  draining: boolean
}

export const warmerState = singleton<State>('warmer', () => ({
  started: false,
  running: false,
  lastRun: 0,
  lastDuration: 0,
  analyzed: 0,
  errors: 0,
  queue: new Set(),
  draining: false,
}))

async function analyze(id: number) {
  try {
    await getMatchInsights(id, { priority: 'low' })
    warmerState.analyzed++
  } catch {
    warmerState.errors++
  }
}

/** Поставить матчи в очередь на фоновый разбор (без ожидания). */
export function enqueueAnalysis(ids: number[]) {
  for (const id of ids) warmerState.queue.add(id)
  if (warmerState.draining) return
  warmerState.draining = true
  void (async () => {
    try {
      while (warmerState.queue.size) {
        const [id] = warmerState.queue
        warmerState.queue.delete(id)
        await analyze(id)
      }
    } finally {
      warmerState.draining = false
    }
  })()
}

export async function warmOnce() {
  if (warmerState.running) return
  warmerState.running = true
  const started = Date.now()
  try {
    // «Проверка шансов» на главной: 30 прошедших дней считаются один раз и дальше берутся из кэша
    await settle(getChanceCheck({ priority: 'low' }), null)
    const max = Number(process.env.WARMER_MAX_MATCHES || 60)
    const today = todayYmd()
    const now = Date.now()
    const targets = []
    for (const ymd of [today, addDays(today, 1)]) {
      try {
        const list = await getMatchesByDate(ymd, { priority: 'low' })
        targets.push(...list.filter((m) => m.status === 'scheduled' && m.ts > now && isFeatured(m.league)))
      } catch {
        warmerState.errors++
      }
    }
    targets.sort(featuredFirst)
    for (const m of targets.slice(0, max)) await analyze(m.id)
  } finally {
    warmerState.running = false
    warmerState.lastRun = Date.now()
    warmerState.lastDuration = Date.now() - started
  }
}

export function startWarmer() {
  if (warmerState.started || process.env.WARMER === '0') return
  warmerState.started = true
  const every = Math.max(5, Number(process.env.WARMER_INTERVAL_MIN || 15)) * 60_000
  setTimeout(() => void warmOnce(), 3_000)
  const timer = setInterval(() => void warmOnce(), every)
  timer.unref?.()
  console.log(`[warmer] запущен: каждые ${every / 60_000} мин`)
}
