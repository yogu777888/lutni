/**
 * Фоновый прогрев: заранее загружает в кэш то, что открывают люди, чтобы страницы открывались мгновенно, а ленты
 * подборок были наполнены (владелец: «чтоб у меня на хостинге автоматически все загружалось заранее и чтоб потом для
 * пользователя было моментально»). Кэш отдаёт сохранённое сразу и обновляет в фоне (lib/cache.ts), прогрев следит,
 * чтобы обновлять было нечего. Запросы — с низким приоритетом: живые пользователи идут первыми (см. rate-limit.ts).
 *
 * С ключом SStats (до 300 запросов в минуту, у нас — 250) — полный обход (`FULL`):
 *  - списки матчей со вчера до послезавтра (подборки показывают 3 дня);
 *  - разбор матчей топ-лиг (линия, модель, форма, теги, xG прошлых матчей), у не начавшихся — история линии PARI,
 *    у идущих и тех, что начнутся в ближайшие 90 минут, — составы, давление и статистика `/Ls/*`;
 *  - снимки линии у остальных матчей сегодня — кэфы в строках списка всех турниров;
 *  - страницы топ-турниров (сезон, таблица) и список «Лиги и турниры»;
 *  - отдельно раз в минуту — идущие матчи топ-лиг (`warmLive`): счёт, статистика, давление, кэфы по ходу.
 * Без ключа (30 в минуту) — только разбор ближайших матчей топ-лиг, как раньше.
 *
 * Env: WARMER=0 — выключить; WARMER_FULL=0/1 — полный обход (по умолчанию — есть ключ или демо);
 * WARMER_INTERVAL_MIN (10 с ключом, 15 без); WARMER_MAX_MATCHES (200 / 60); WARMER_MAX_SNAPS (400 / 0).
 */
import { isFeatured } from '@/config/leagues'
import {
  currentSeason,
  featuredFirst,
  getChanceCheck,
  getLeague,
  getLeagues,
  getLsExtra,
  getMatchFull,
  getMatchInsights,
  getMatchesByDate,
  getOddsSnap,
  getPariHistory,
  getPariLive,
  getSeasonGames,
  getStandings,
  getTeamXg,
  settle,
  settleArchive,
} from './data'
import { addDays, appNow, todayYmd } from './format'
import { HAS_KEY, IS_DESIGN, IS_MOCK } from './sstats/client'
import { singleton } from './runtime'
import type { Match } from './types'

const FULL = process.env.WARMER_FULL ? process.env.WARMER_FULL === '1' : HAS_KEY || IS_MOCK
const low = { priority: 'low' } as const
const started = (m: Match) => m.status !== 'scheduled' && m.status !== 'postponed' && m.status !== 'cancelled'
const isLive = (m: Match) => m.status === 'live' || m.status === 'suspended'

type State = {
  started: boolean
  running: boolean
  lastRun: number
  lastDuration: number
  analyzed: number
  errors: number
  queue: Set<number>
  draining: boolean
  liveRunning: boolean
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
  liveRunning: false,
}))

async function analyze(id: number, full = false) {
  try {
    const ins = await getMatchInsights(id, low)
    if (!ins) return
    const m = ins.match
    // xG прошлых матчей обеих команд — для «Сильного и слабого места»: страница ждёт их не дольше 1,5 с
    await Promise.all([
      settle(getTeamXg(ins.homeForm, low), null),
      settle(getTeamXg(ins.awayForm, low), null),
      // остальное страница матча тоже ждёт (≤1,5–2 с) — с ключом загружаем заранее
      full && m.status === 'scheduled' ? settle(getPariHistory(m, low), null) : null,
      // составы появляются за 90 минут до начала, давление и статистика — по ходу (сама `getLsExtra` знает, что пора)
      full ? settle(getLsExtra(m, new Set(ins.full.stats.map((s) => s.key)), low), null) : null,
    ])
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
  const t0 = Date.now()
  try {
    const max = Number(process.env.WARMER_MAX_MATCHES || (FULL ? 200 : 60))
    const today = todayYmd()
    const now = appNow()
    // списки — сами по себе дешёвые (запрос на день), а без них не открывается ни одна страница
    const days = FULL ? [addDays(today, -1), today, addDays(today, 1), addDays(today, 2)] : [today, addDays(today, 1)]
    const lists = new Map<string, Match[]>()
    for (const ymd of days) {
      try {
        lists.set(ymd, await getMatchesByDate(ymd, low))
      } catch {
        warmerState.errors++
      }
    }
    const near = [today, addDays(today, 1)].flatMap((d) => lists.get(d) ?? [])
    const targets = near.filter(
      (m) =>
        isFeatured(m.league) &&
        // в демо для дизайна — все матчи топ-лиг, и идущие: у каждого главного матча есть форма для графика;
        // с ключом — и сегодняшние начавшиеся (их страницы открывают по ходу и после)
        (IS_DESIGN || (m.status === 'scheduled' && m.ts > now) || (FULL && started(m) && m.ts > now - 12 * 3600_000)),
    )
    // сначала не начавшиеся (по ним ставят), потом идущие и сыгранные
    targets.sort((a, b) => Number(started(a)) - Number(started(b)) || featuredFirst(a, b))
    if (FULL) {
      // матчи топ-лиг послезавтра — в подборках («3 дня»)
      targets.push(...(lists.get(addDays(today, 2)) ?? []).filter((m) => isFeatured(m.league) && m.status === 'scheduled').sort(featuredFirst))
    }
    for (const m of targets.slice(0, max)) await analyze(m.id, FULL)
    // «Проверка шансов» (/about#proverka) — после матчей: 30 прошедших дней считаются один раз и дальше берутся из кэша,
    // а первым шагом после перезапуска они держали пустыми «Все выгодные» и лайм в списке (разборы матчей — только в
    // памяти), пока не досчитаются
    await settle(getChanceCheck(low), null)
    // «История точности»: оценки сыгранных матчей — сверить с итогом (lib/forecast-log.ts)
    await settleArchive()
    if (FULL) {
      // кэфы в строках остальных турниров сегодня (список берёт их только из кэша)
      const maxSnaps = Number(process.env.WARMER_MAX_SNAPS || 400)
      const rest = (lists.get(today) ?? []).filter((m) => m.status === 'scheduled' && m.ts > now && !isFeatured(m.league))
      for (const m of rest.slice(0, maxSnaps)) await settle(getOddsSnap(m, low), null)
      await warmLeagues(near)
    }
  } finally {
    warmerState.running = false
    warmerState.lastRun = Date.now()
    warmerState.lastDuration = Date.now() - t0
  }
}

/** Страницы топ-турниров дня (сезон и таблица — как `load` в app/league/[slug]/page.tsx) и список «Лиги и турниры». */
async function warmLeagues(matches: Match[]) {
  await settle(getLeagues(low), [])
  const ids = [...new Set(matches.filter((m) => isFeatured(m.league)).map((m) => m.league.id))]
  for (const id of ids) {
    const league = await settle(getLeague(id, low), null)
    const year = league ? currentSeason(league) : null
    if (!year) continue
    await Promise.all([settle(getSeasonGames(id, year, low), []), settle(getStandings(id, year, low), null)])
  }
}

/**
 * Идущие матчи топ-лиг — раз в минуту, столько же живут в кэше их счёт и кэфы: страница идущего матча открывается
 * уже обновлённой. На матч — до 4 запросов (счёт, статистика, давление, составы — у `/Ls/*` свои сроки), кэфы PARI по
 * ходу — один запрос на все матчи. Приоритет обычный, а не фоновый: в долгий первый обход после запуска фоновые
 * запросы стоят в очереди минутами, и счёт отставал бы; это до ~40 запросов в минуту из 250.
 */
export async function warmLive() {
  if (warmerState.liveRunning) return
  warmerState.liveRunning = true
  try {
    const now = { priority: 'high' } as const
    const list = await settle(getMatchesByDate(todayYmd(), now), [] as Match[])
    const live = list.filter((m) => isLive(m) && isFeatured(m.league)).sort(featuredFirst).slice(0, 10)
    if (!live.length) return
    await settle(getPariLive(now), [])
    for (const m of live) {
      const full = await settle(getMatchFull(m.id, now), null)
      if (full) await settle(getLsExtra(full.match, new Set(full.stats.map((s) => s.key)), now), null)
    }
  } finally {
    warmerState.liveRunning = false
  }
}

export function startWarmer() {
  if (warmerState.started || process.env.WARMER === '0') return
  warmerState.started = true
  const every = Math.max(5, Number(process.env.WARMER_INTERVAL_MIN || (FULL ? 10 : 15))) * 60_000
  setTimeout(() => void warmOnce(), 3_000)
  const timer = setInterval(() => void warmOnce(), every)
  timer.unref?.()
  if (FULL) {
    const live = setInterval(() => void warmLive(), 60_000)
    live.unref?.()
  }
  console.log(`[warmer] запущен: каждые ${every / 60_000} мин${FULL ? ', полный обход, идущие матчи — раз в минуту' : ''}`)
}
