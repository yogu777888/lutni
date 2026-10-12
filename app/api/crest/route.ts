import sharp from 'sharp'

export const dynamic = 'force-dynamic'

/** Откуда можно брать эмблемы: только сервер картинок SStats (иначе маршрут стал бы открытым прокси). */
const ALLOWED = /^https:\/\/(?:[a-z0-9-]+\.)?sstats\.net\/assets\/logos\/\d+\.png$/

const done = new Map<string, Buffer>()
const LIMIT = 400

/**
 * Эмблема крупно: ?u=<адрес эмблемы>&w=<ширина>. У SStats эмблемы 150×150 — в баннере «Матча дня» (до 190px, на
 * ретине ×2) браузер растягивал их и они выходили мыльными. Здесь увеличиваем один раз качественно (lanczos3 и
 * лёгкая резкость) и отдаём с долгим кэшем — края гладкие, детали не размазаны. Готовые храним в памяти.
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const u = url.searchParams.get('u') ?? ''
  const w = Math.min(512, Math.max(64, Math.round(Number(url.searchParams.get('w')) || 384)))
  if (!ALLOWED.test(u)) return new Response('bad src', { status: 400 })
  const key = `${u}|${w}`
  let out = done.get(key)
  if (!out) {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), 4000)
    try {
      const res = await fetch(u, { signal: ctl.signal })
      if (!res.ok) return Response.redirect(u, 302)
      out = await sharp(Buffer.from(await res.arrayBuffer()))
        .resize(w, w, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
        .sharpen({ sigma: 0.8 })
        .png({ compressionLevel: 9 })
        .toBuffer()
    } catch {
      return Response.redirect(u, 302)
    } finally {
      clearTimeout(timer)
    }
    if (done.size >= LIMIT) done.delete(done.keys().next().value!)
    done.set(key, out)
  }
  return new Response(new Uint8Array(out), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=2592000, immutable', 'X-Robots-Tag': 'noindex' },
  })
}
