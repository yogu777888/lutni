import { appendFile, mkdir, open, stat } from 'node:fs/promises'
import path from 'node:path'
import { ymdInTz } from './format'

/**
 * Журнал переходов на букмекеров (JSON Lines). Простой и надёжный: без БД,
 * читается глазами и грепом, агрегируется на странице /admin.
 */
export type Click = {
  ts: number
  partner: string
  placement: string
  match: string | null
  ref: string | null
  country: string | null
  device: 'mobile' | 'desktop'
}

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), '.data')
const FILE = path.join(DATA_DIR, 'clicks.jsonl')
let dirReady: Promise<unknown> | null = null

export async function logClick(c: Click) {
  console.log(`[click] ${c.partner} ${c.placement}${c.match ? ` m=${c.match}` : ''}`)
  dirReady ??= mkdir(DATA_DIR, { recursive: true })
  await dirReady
  await appendFile(FILE, `${JSON.stringify(c)}\n`)
}

/** Читаем хвост файла (до 20 МБ) — этого хватает на сотни тысяч кликов. */
export async function readClicks(sinceTs: number): Promise<Click[]> {
  try {
    const { size } = await stat(FILE)
    const max = 20 * 1024 * 1024
    const start = Math.max(0, size - max)
    const fh = await open(FILE, 'r')
    try {
      const buf = Buffer.alloc(size - start)
      await fh.read(buf, 0, buf.length, start)
      const lines = buf.toString('utf8').split('\n')
      if (start > 0) lines.shift()
      const out: Click[] = []
      for (const line of lines) {
        if (!line) continue
        try {
          const c = JSON.parse(line) as Click
          if (c.ts >= sinceTs) out.push(c)
        } catch {
          // битая строка — пропускаем
        }
      }
      return out
    } finally {
      await fh.close()
    }
  } catch {
    return []
  }
}

const top = (m: Map<string, number>, n = 20) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n)

export function aggregateClicks(clicks: Click[]) {
  const count = (key: (c: Click) => string | null) => {
    const m = new Map<string, number>()
    for (const c of clicks) {
      const k = key(c)
      if (k) m.set(k, (m.get(k) ?? 0) + 1)
    }
    return m
  }
  return {
    total: clicks.length,
    byPartner: top(count((c) => c.partner)),
    byPlacement: top(count((c) => c.placement)),
    byDay: [...count((c) => ymdInTz(c.ts)).entries()].sort((a, b) => b[0].localeCompare(a[0])),
    byMatch: top(count((c) => c.match), 10),
    byDevice: top(count((c) => c.device)),
    byCountry: top(count((c) => c.country), 10),
  }
}
