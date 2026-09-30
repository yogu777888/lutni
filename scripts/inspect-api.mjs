#!/usr/bin/env node
/**
 * Проверка доступа к SStats API и «калибровка» сайта под реальные данные.
 *
 *   npm run inspect-api            — возьмёт ближайший матч АПЛ
 *   npm run inspect-api -- 1234567 — конкретный матч
 *
 * Печатает список букмекеров, названия рынков и исходов, форму ответов
 * Glicko/травм/таблиц и сохраняет сырые ответы в scripts/samples/ —
 * по ним легко поправить разбор рынков (lib/odds.ts) и сопоставление
 * букмекеров с партнёрами (config/bookmakers.ts → apiNames).
 */
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')

/** Подхватываем .env.local и .env, как это делает Next.js (уже заданные переменные не трогаем). */
function loadEnvFile(file) {
  const p = path.join(ROOT, file)
  if (!existsSync(p)) return
  const buf = readFileSync(p)
  // файл, сохранённый в UTF-16 (например, `echo > .env.local` в старом PowerShell)
  const text = buf[0] === 0xff && buf[1] === 0xfe ? buf.toString('utf16le') : buf.toString('utf8')
  for (const raw of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(raw)
    if (!m || raw.trim().startsWith('#')) continue
    const value = m[2].replace(/^(['"])(.*)\1$/, '$2')
    if (process.env[m[1]] === undefined) process.env[m[1]] = value
  }
}
loadEnvFile('.env.local')
loadEnvFile('.env')

const BASE = (process.env.SSTATS_API_URL || 'https://api.sstats.net').replace(/\/+$/, '')
const KEY = process.env.SSTATS_API_KEY || ''
const OUT = path.join(HERE, 'samples')

/** GET к API. Ключ уходит только в запрос: в консоль и в файлы он не пишется. */
async function get(pathname, params = {}, { save = true } = {}) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
  if (KEY) qs.set('apikey', KEY)
  const url = `${BASE}${pathname}?${qs}`
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(`${pathname}: HTTP ${res.status}, не JSON: ${text.slice(0, 200)}`)
  }
  if (!res.ok) throw new Error(`${pathname}: HTTP ${res.status} ${JSON.stringify(json).slice(0, 200)}`)
  if (save) {
    const name = pathname.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '')
    await mkdir(OUT, { recursive: true })
    await writeFile(path.join(OUT, `${name}.json`), JSON.stringify(json, null, 2))
  }
  return Array.isArray(json) ? json : (json.data ?? json)
}

const line = (s = '') => console.log(s)
const head = (s) => line(`\n\x1b[1m━━ ${s}\x1b[0m`)

try {
  head('Ключ API')
  if (KEY) {
    // ответ содержит сам ключ — поэтому не сохраняем его в samples/
    const acc = await get('/Account/Info', {}, { save: false })
    line(`Ключ принят, аккаунт: ${acc?.userName || '(без имени)'}`)
  } else {
    line('SSTATS_API_KEY не задан — работаем без ключа (лимит 30 запросов в минуту с IP)')
  }

  head('Букмекеры (/Odds/bookmakers)')
  const books = await get('/Odds/bookmakers')
  line(books.map((b) => `${b.id}: ${b.bookmakerName}`).join('\n'))

  let gameId = Number(process.argv[2]) || 0
  if (!gameId) {
    head('Ближайшие матчи АПЛ (/Games/list)')
    const list = await get('/Games/list', { LeagueId: 39, Upcoming: true, Limit: 3, TimeZone: 3 })
    for (const g of list) line(`${g.id}  ${g.date}  ${g.homeTeam?.name} — ${g.awayTeam?.name}  статус ${g.status}`)
    if (list[0]) {
      line('\nКороткие кэфы в списке:')
      for (const b of list[0].odds ?? []) line(`  [${b.marketId}] ${b.marketName}: ${(b.odds ?? []).map((o) => `${o.name}=${o.value}`).join(', ')}`)
    }
    gameId = list[0]?.id
  }
  if (!gameId) throw new Error('Не нашли матч — передайте ID: npm run inspect-api -- <id>')

  head(`Все коэффициенты матча ${gameId} (/Odds/${gameId})`)
  const odds = await get(`/Odds/${gameId}`)
  const markets = new Map()
  for (const b of odds) {
    for (const m of b.odds ?? []) {
      const key = `[${m.marketId}] ${m.marketName}`
      const e = markets.get(key) ?? { books: new Set(), outcomes: new Set() }
      e.books.add(b.bookmakerName)
      for (const o of m.odds ?? []) e.outcomes.add(o.name)
      markets.set(key, e)
    }
  }
  line(`Букмекеров с линией: ${odds.length} (${odds.map((b) => b.bookmakerName).join(', ')})`)
  for (const [k, e] of markets) line(`${k}  — ${e.books.size} БК; исходы: ${[...e.outcomes].slice(0, 12).join(' | ')}`)

  head(`Glicko (/Games/glicko/${gameId})`)
  line(JSON.stringify((await get(`/Games/glicko/${gameId}`))?.glicko ?? null))

  head(`Травмы (/Games/injuries?gameId=${gameId})`)
  const inj = await get('/Games/injuries', { gameId })
  line(JSON.stringify(Array.isArray(inj) ? inj.slice(0, 3) : inj).slice(0, 600))

  head('Лиги (/Leagues)')
  const leagues = await get('/Leagues')
  line(`Всего: ${leagues.length}`)
  for (const id of [2, 39, 140, 135, 78, 61, 235]) {
    const l = leagues.find((x) => Number(x.id) === id)
    line(`${id}: ${l ? `${l.name} (${l.country?.name}), сезоны: ${(l.seasons ?? []).slice(0, 3).map((s) => s.year).join(', ')}` : 'не найдена'}`)
  }

  head('Готово')
  line(`Сырые ответы сохранены в ${OUT}`)
  line('Сверьте названия рынков с регулярками в lib/odds.ts, а букмекеров — с apiNames в config/bookmakers.ts.')
} catch (e) {
  console.error(`\n\x1b[31mОшибка:\x1b[0m ${e.message}`)
  process.exit(1)
}
