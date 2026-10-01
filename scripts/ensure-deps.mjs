#!/usr/bin/env node
/**
 * Запускается перед `npm run dev`. Если после `git pull` поменялись зависимости
 * (package-lock.json), ставит их сама — чтобы не ловить «Module not found».
 * Отпечаток установленного lock-файла хранится в node_modules/.tagbet-deps.
 */
import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const MARKER = 'node_modules/.tagbet-deps'
const lockHash = () => createHash('sha1').update(readFileSync('package-lock.json')).digest('hex')

const installed = existsSync(MARKER) ? readFileSync(MARKER, 'utf8').trim() : ''
if (!existsSync('node_modules') || installed !== lockHash()) {
  console.log('\n[tag.bet] Зависимости изменились — выполняю npm install…\n')
  execSync('npm install --no-audit --no-fund', { stdio: 'inherit' })
  writeFileSync(MARKER, lockHash())
}
