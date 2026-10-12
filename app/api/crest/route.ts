import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import ImageTracer from 'imagetracerjs'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'

/** Откуда можно брать эмблемы: только сервер картинок SStats (иначе маршрут стал бы открытым прокси). */
const ALLOWED = /^https:\/\/(?:[a-z0-9-]+\.)?sstats\.net\/assets\/logos\/(\d+)\.png$/
const DIR = path.join(process.env.DATA_DIR || path.join(process.cwd(), '.data'), 'crests')
/** Обводка сложнее этого (гравюра «Аякса», мелкие надписи «Уигана») выходит грязной — тогда отдаём увеличенную картинку. */
const MAX_SVG = 220_000

type Out = { body: Buffer; type: string }
const done = new Map<string, Out>()
const LIMIT = 400

/**
 * Эмблема крупно для баннера «Матча дня»: ?u=<адрес эмблемы SStats>. Их картинки — 150×150, растянутые браузером
 * до 168px (на ретине ×2), они мыльные. Здесь эмблему обводим в вектор (imagetracerjs): цвета сводятся к ~12 плоским
 * заливкам с гладкими краями — эмблема выглядит нарисованной и чёткой при любом размере (владелец: «лого всё равно
 * не чёткие, есть фильтр, чтоб как будто рисованные?»). Полупрозрачный край перед обводкой обрезаем — иначе вокруг
 * эмблемы тёмная кайма. Слишком сложная эмблема — увеличенная картинка (lanczos3 + резкость). Готовое храним
 * в памяти и на диске (`.data/crests`), отдаём с кэшем на 30 дней. Не скачалось за 4 с — редирект на исходную.
 */
export async function GET(req: Request) {
  const u = new URL(req.url).searchParams.get('u') ?? ''
  const id = ALLOWED.exec(u)?.[1]
  if (!id) return new Response('bad src', { status: 400 })
  let out = done.get(id) ?? (await fromDisk(id))
  if (!out) {
    const src = await download(u)
    if (!src) return Response.redirect(u, 302)
    try {
      out = await render(src)
    } catch {
      return Response.redirect(u, 302)
    }
    await mkdir(DIR, { recursive: true })
      .then(() => writeFile(path.join(DIR, `${id}.${out!.type === 'image/svg+xml' ? 'svg' : 'png'}`), out!.body))
      .catch(() => {})
  }
  if (done.size >= LIMIT) done.delete(done.keys().next().value!)
  done.set(id, out)
  return new Response(new Uint8Array(out.body), {
    headers: { 'Content-Type': out.type, 'Cache-Control': 'public, max-age=2592000, immutable', 'X-Robots-Tag': 'noindex' },
  })
}

async function fromDisk(id: string): Promise<Out | null> {
  for (const [ext, type] of [
    ['svg', 'image/svg+xml'],
    ['png', 'image/png'],
  ] as const) {
    const body = await readFile(path.join(DIR, `${id}.${ext}`)).catch(() => null)
    if (body) return { body, type }
  }
  return null
}

async function download(u: string): Promise<Buffer | null> {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 4000)
  try {
    const res = await fetch(u, { signal: ctl.signal })
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function render(src: Buffer): Promise<Out> {
  const W = 600
  const clear = { r: 0, g: 0, b: 0, alpha: 0 }
  const { data, info } = await sharp(src).resize(W, W, { fit: 'contain', background: clear, kernel: 'lanczos3' }).blur(1).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  // край — без полупрозрачных пикселей: иначе в палитру попадают тёмные смеси с прозрачным и вокруг эмблемы кайма
  for (let i = 3; i < data.length; i += 4) data[i] = data[i] < 128 ? 0 : 255
  const svg = ImageTracer.imagedataToSVG(
    { width: info.width, height: info.height, data: new Uint8ClampedArray(data) },
    { numberofcolors: 12, colorquantcycles: 6, colorsampling: 2, mincolorratio: 0.003, ltres: 0.4, qtres: 0.4, pathomit: 24, roundcoords: 1, strokewidth: 0, linefilter: true, viewbox: true },
  )
  if (svg.length <= MAX_SVG) return { body: Buffer.from(svg), type: 'image/svg+xml' }
  const png = await sharp(src).resize(384, 384, { fit: 'contain', background: clear, kernel: 'lanczos3' }).sharpen({ sigma: 0.8 }).png({ compressionLevel: 9 }).toBuffer()
  return { body: png, type: 'image/png' }
}
