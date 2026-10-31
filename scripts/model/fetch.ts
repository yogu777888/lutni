/**
 * История для проверки модели на прошлых сезонах (владелец: «давай модель»). Складывает ответы SStats как есть
 * в `.data/backtest/` (в git не попадает):
 *  - `list/<лига>-<год>.json` — сезон топ-турнира из `/Games/list`: счёт и линия перед матчем (это кэфы Pinnacle);
 *  - `odds/<id>.json` — `/Odds/{id}`: кэфы закрытия ~19 букмекеров, среди них Марафон — как в разборе матча на сайте;
 *  - `glicko/<id>.json` — `/Games/glicko/{id}`: рейтинг силы и ожидаемые голы SStats, которые берёт модель.
 * По матчу качаем только лиги `GAME_LEAGUES` (два запроса на матч), свежие первыми — остановить можно когда угодно,
 * уже скачанное не повторяем. Без ключа — 25 запросов в минуту (лимит API — 30), с ключом `SSTATS_API_KEY` — 200.
 *
 *   npm run model:fetch            — всё (ключ — `SSTATS_API_KEY` в `.env`; Node 22.18+)
 *   npm run model:fetch -- lists   — только списки сезонов, `-- games` — только матчи
 * За прокси (контейнер разработки) — с `NODE_USE_ENV_PROXY=1`. Прервать можно в любой момент (Ctrl+C) и запустить снова.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { DIR, GAME_LEAGUES, GAME_YEARS, LIST_LEAGUES, YEARS, listFile, readList } from './data'

const BASE = (process.env.SSTATS_API_URL || 'https://api.sstats.net').replace(/\/+$/, '')
const KEY = process.env.SSTATS_API_KEY || ''
const RPM = Number(process.env.SSTATS_RPM || (KEY ? 200 : 25))
const GAP = 60_000 / RPM

let last = 0
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function get(pathname: string, params: Record<string, string | number> = {}): Promise<unknown> {
  const q = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))
  if (KEY) q.set('apikey', KEY)
  for (let attempt = 0; ; attempt++) {
    const wait = last + GAP - Date.now()
    if (wait > 0) await sleep(wait)
    last = Date.now()
    try {
      const res = await fetch(`${BASE}${pathname}?${q}`, { signal: AbortSignal.timeout(60_000) })
      if (res.status === 429) {
        await sleep(65_000)
        continue
      }
      if (!res.ok) throw new Error(`${res.status} ${pathname}`)
      return await res.json()
    } catch (e) {
      if (attempt >= 3) throw e
      await sleep(5_000 * (attempt + 1))
    }
  }
}

function save(file: string, data: unknown) {
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(data))
}

async function lists() {
  for (const year of YEARS)
    for (const league of LIST_LEAGUES) {
      const f = listFile(league, year)
      // идущий сезон перекачиваем каждый раз: в нём прибавляются сыгранные матчи
      if (existsSync(f) && year < YEARS[YEARS.length - 1]) continue
      const j = await get('/Games/list', { LeagueId: league, Year: year, Limit: 1000 })
      save(f, j)
      console.log(`список ${league}-${year}: ${((j as { data?: unknown[] }).data ?? []).length}`)
    }
}

async function games() {
  const now = Date.now() / 1000
  const todo = GAME_YEARS.flatMap((year, yi) =>
    GAME_LEAGUES.flatMap((league) =>
      readList(league, year)
        .filter((g) => g.homeFTResult != null && g.awayFTResult != null && g.dateUtc < now - 3 * 3600)
        .map((g) => ({ id: g.id, ts: g.dateUtc, older: yi >= 2 })),
    ),
  )
    // 2026/27 и 2025/26 — от свежих к старым вперемешку по лигам, 2024/25 — после них
    .sort((a, b) => Number(a.older) - Number(b.older) || b.ts - a.ts)
  let done = 0
  for (const g of todo) {
    const fo = path.join(DIR, 'odds', `${g.id}.json`)
    const fg = path.join(DIR, 'glicko', `${g.id}.json`)
    if (!existsSync(fo)) save(fo, await get(`/Odds/${g.id}`))
    if (!existsSync(fg)) save(fg, await get(`/Games/glicko/${g.id}`))
    if (++done % 50 === 0) console.log(`матчей: ${done} из ${todo.length}`)
  }
  console.log(`готово: ${done} матчей`)
}

const mode = process.argv[2] ?? 'all'
if (mode === 'lists' || mode === 'all') await lists()
if (mode === 'games' || mode === 'all') await games()
