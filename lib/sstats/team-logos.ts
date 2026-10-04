import { readFileSync, statSync } from 'node:fs'
import path from 'node:path'

/**
 * Эмблемы команд для демо: `.data/team-logos.json` (название команды → logoUrl), его делает
 * `npm run team-logos` — один раз берёт команды демо-лиг из SStats API. Файл перечитывается,
 * когда меняется: после скрипта достаточно обновить страницу. Нет файла — монограммы.
 * Только для сервера.
 */
const FILE = path.join(process.env.DATA_DIR || path.join(process.cwd(), '.data'), 'team-logos.json')
let cached: { mtime: number; logos: Record<string, string> } | null = null

export function teamLogos(): Record<string, string> {
  try {
    const mtime = statSync(FILE).mtimeMs
    if (!cached || cached.mtime !== mtime) cached = { mtime, logos: JSON.parse(readFileSync(FILE, 'utf8')) }
    return cached.logos
  } catch {
    cached = null
    return {}
  }
}
