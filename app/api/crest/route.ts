import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { bakeCrest } from '@/lib/crest-shadow'

export const dynamic = 'force-dynamic'

/**
 * Эмблема с длинной тенью готовой картинкой (lib/crest-shadow.ts): ?u=<адрес эмблемы>&a=<ширина/высота>. Первый раз —
 * скачиваем эмблему, дорисовываем тень и кладём на диск (`CREST_DIR`, по умолчанию .cache/crests), дальше отдаём с диска;
 * браузер хранит год. Только эмблемы SStats и логотипы лиг из public/leagues — чужие адреса не качаем.
 */
const DIR = process.env.CREST_DIR || path.join(process.cwd(), '.cache', 'crests')
const REMOTE = /^https:\/\/(?:[\w-]+\.)?sstats\.net\/[\w./-]+\.(?:png|jpe?g|webp|svg)$/i
const LOCAL = /^\/leagues\/[\w.-]+\.(?:png|webp|svg)$/i
const busy = new Map<string, Promise<Buffer>>()

async function source(u: string): Promise<Buffer> {
  if (LOCAL.test(u)) return readFile(path.join(process.cwd(), 'public', u))
  const r = await fetch(u, { signal: AbortSignal.timeout(6000) })
  if (!r.ok) throw new Error(`crest ${r.status}`)
  return Buffer.from(await r.arrayBuffer())
}

async function baked(u: string, a: number): Promise<Buffer> {
  const file = path.join(DIR, `${createHash('sha1').update(`${u}|${a}`).digest('hex')}.webp`)
  try {
    return await readFile(file)
  } catch {}
  const out = await bakeCrest(await source(u), a)
  await mkdir(DIR, { recursive: true })
  await writeFile(file, out).catch(() => {})
  return out
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams
  const u = q.get('u') ?? ''
  const a = Math.round(Math.min(8, Math.max(0.125, Number(q.get('a')) || 1)) * 1000) / 1000
  if (!REMOTE.test(u) && !LOCAL.test(u)) return new Response('bad crest', { status: 400 })
  const key = `${u}|${a}`
  try {
    let p = busy.get(key)
    if (!p) {
      p = baked(u, a).finally(() => busy.delete(key))
      busy.set(key, p)
    }
    const body = await p
    return new Response(new Uint8Array(body), {
      headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable' },
    })
  } catch {
    // не скачалась или не разобралась — эмблема без тени, не пустое место; не кэшируем, в следующий раз попробуем снова
    return new Response(null, { status: 302, headers: { Location: u, 'Cache-Control': 'no-store' } })
  }
}
