#!/usr/bin/env node
/**
 * Настоящие эмблемы для демо-режима: один раз берёт команды демо-лиг из SStats API
 * и сохраняет «название → logoUrl» в .data/team-logos.json. Демо (SSTATS_MOCK=1 или design)
 * подхватывает файл сам — вместо монограмм будут эмблемы клубов.
 *
 *   npm run team-logos
 *
 * Запросов — по одному на страну (около 11), плюс поиск по названию для тех, кого не нашли
 * (не больше 40). Ключ — SSTATS_API_KEY из .env.local; без ключа тоже работает, но медленнее.
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
  const text = buf[0] === 0xff && buf[1] === 0xfe ? buf.toString('utf16le') : buf.toString('utf8')
  for (const raw of text.replace(/^﻿/, '').split(/\r?\n/)) {
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
const OUT_DIR = process.env.DATA_DIR || path.join(ROOT, '.data')
const OUT = path.join(OUT_DIR, 'team-logos.json')
const MAX_BY_NAME = 40

/** Команды и страны демо-лиг — прямо из lib/sstats/mock.ts, чтобы списки не расходились. */
function mockTeams() {
  const src = readFileSync(path.join(ROOT, 'lib/sstats/mock.ts'), 'utf8')
  const out = new Map()
  for (const m of src.matchAll(/country: '([^']+)'[^]*?teams: \[([^\]]*)\]/g)) {
    const country = m[1]
    for (const t of m[2].matchAll(/'([^']+)'/g)) if (!out.has(t[1])) out.set(t[1], country === 'World' ? null : country)
  }
  return out
}

const norm = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\b(fc|cf|sc|ac|afc|cd|sd|fk|sk|kv|as|ss|ssc|calcio|club)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

let calls = 0
async function get(pathname, query) {
  const params = new URLSearchParams(query)
  if (KEY) params.set('apikey', KEY)
  calls++
  const res = await fetch(`${BASE}${pathname}?${params}`, { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`${pathname}: HTTP ${res.status}`)
  const body = await res.json()
  await new Promise((r) => setTimeout(r, KEY ? 1100 : 2200)) // бережём лимит запросов в минуту
  return Array.isArray(body?.data) ? body.data : []
}

async function main() {
  const teams = mockTeams()
  const want = new Map([...teams.keys()].map((n) => [norm(n), n]))
  const logos = {}
  const take = (t) => {
    if (!t?.name || !t.logoUrl) return
    const exact = teams.has(t.name) ? t.name : want.get(norm(t.name))
    if (exact && !logos[exact]) logos[exact] = t.logoUrl
  }

  const countries = [...new Set([...teams.values()].filter(Boolean))]
  console.log(`Команд в демо: ${teams.size}, стран: ${countries.length}. Беру команды по странам…`)
  let failed = 0
  for (const country of countries) {
    try {
      for (const t of await get('/Teams/list', { Country: country, Limit: '1000' })) take(t)
    } catch (e) {
      failed++
      console.warn(`  ${country}: ${e.message}`)
      // API не отвечает совсем — дальше не тратим запросы
      if (failed >= 2 && !Object.keys(logos).length) throw new Error(`SStats API недоступен (${BASE}): ${e.message}`)
    }
  }

  const missing = [...teams.keys()].filter((n) => !logos[n])
  if (missing.length) console.log(`Не нашлись по странам: ${missing.length}. Ищу по названию (до ${MAX_BY_NAME})…`)
  for (const name of missing.slice(0, MAX_BY_NAME)) {
    try {
      const found = await get('/Teams/list', { Name: name, Limit: '5' })
      const hit = found.find((t) => norm(t.name) === norm(name) && t.logoUrl) ?? found.find((t) => t.logoUrl)
      if (hit) logos[name] = hit.logoUrl
    } catch (e) {
      console.warn(`  ${name}: ${e.message}`)
    }
  }

  // ничего не нашли — прежний файл не затираем
  if (!Object.keys(logos).length) throw new Error('Эмблем не нашлось — файл не изменён. Проверьте SSTATS_API_KEY в .env.local')
  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(OUT, JSON.stringify(logos, null, 2) + '\n')
  const still = [...teams.keys()].filter((n) => !logos[n])
  console.log(`Готово: эмблемы у ${Object.keys(logos).length} из ${teams.size} команд → ${path.relative(ROOT, OUT)}`)
  console.log(`Запросов к API: ${calls}`)
  if (still.length) console.log(`Без эмблемы (будут монограммы): ${still.join(', ')}`)
  console.log('Перезапустите сайт (npm run dev), чтобы демо подхватило эмблемы.')
}

main().catch((e) => {
  console.error(e.message ?? e)
  process.exit(1)
})
