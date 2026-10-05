/**
 * Цвета клубов для «Афиши» (вид «Главных матчей»): главный цвет — из эмблемы, автоматически для всех команд.
 * Картинку уменьшаем до 32 px и ищем самый «весомый» насыщенный оттенок; серые, белые и чёрные пиксели не
 * считаем. Считаем один раз на эмблему и храним месяц (`cache`). Нет эмблемы или она серая — графит.
 * Только для сервера (sharp).
 */
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { cache } from './cache'
import type { Match } from './types'

type Hsl = { h: number; s: number; l: number }

/** Цвета фона «Афиши»: хозяева слева, гости справа. */
export type MatchColors = { home: string; away: string }

/** Если у эмблемы нет своего цвета. */
const GRAPHITE: Hsl = { h: 40, s: 0.06, l: 0.3 }

function rgbToHsl(r: number, g: number, b: number): Hsl {
  const R = r / 255
  const G = g / 255
  const B = b / 255
  const max = Math.max(R, G, B)
  const min = Math.min(R, G, B)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === R ? ((G - B) / d + (G < B ? 6 : 0)) * 60 : max === G ? ((B - R) / d + 2) * 60 : ((R - G) / d + 4) * 60
  return { h, s, l }
}

async function loadImage(src: string): Promise<Buffer | null> {
  if (src.startsWith('data:')) {
    // data:image/svg+xml;utf8,… или data:image/png;base64,…
    const m = /^data:([^,]*),(.*)$/s.exec(src)
    if (!m) return null
    return /;base64/i.test(m[1]) ? Buffer.from(m[2], 'base64') : Buffer.from(decodeURIComponent(m[2]), 'utf8')
  }
  if (!/^https?:\/\//.test(src)) return null
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 2500)
  try {
    const res = await fetch(src, { signal: ctl.signal })
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Главный цвет эмблемы или null, если цветных пикселей почти нет (чёрно-белые эмблемы). */
export function logoColor(src: string | null | undefined): Promise<Hsl | null> {
  if (!src) return Promise.resolve(null)
  const key = `logo-color:v2:${createHash('sha1').update(src).digest('hex')}`
  return cache.get(
    key,
    async () => {
      const buf = await loadImage(src)
      if (!buf) return null
      const { data } = await sharp(buf, { density: 72 }).resize(32, 32, { fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      // оттенки по 15°: вес — насыщенность, чтобы яркий клубный цвет перевешивал бледные тени
      const bins = Array.from({ length: 24 }, () => ({ w: 0, h: 0, s: 0, l: 0 }))
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 200) continue
        const c = rgbToHsl(data[i], data[i + 1], data[i + 2])
        if (c.s < 0.25 || c.l < 0.12 || c.l > 0.9) continue
        const b = bins[Math.floor(c.h / 15) % 24]
        b.w += c.s
        b.h += c.h * c.s
        b.s += c.s * c.s
        b.l += c.l * c.s
      }
      const best = bins.reduce((a, b) => (b.w > a.w ? b : a))
      if (best.w < 4) return null
      return { h: best.h / best.w, s: best.s / best.w, l: best.l / best.w }
    },
    { ttl: 30 * 24 * 3600 },
  )
}

/** Цвет для фона: без неона и без «грязи» — насыщенность и светлота в спокойных пределах. */
const css = (c: Hsl, darker = 0) =>
  `hsl(${Math.round(c.h)} ${Math.round(Math.min(0.8, Math.max(0.35, c.s)) * 100)}% ${Math.round((Math.min(0.5, Math.max(0.34, c.l)) - darker) * 100)}%)`

/**
 * Цвета матча для «Афиши». Похожие оттенки у соперников (разница меньше 25°) — гостей темнее, чтобы цвета
 * не слились в одно пятно. У команды без цвета — графит.
 */
export async function matchColors(m: Match): Promise<MatchColors | null> {
  const [a, b] = await Promise.all([logoColor(m.home.logo).catch(() => null), logoColor(m.away.logo).catch(() => null)])
  if (!a && !b) return null
  const home = a ?? GRAPHITE
  const away = b ?? GRAPHITE
  const dh = Math.abs(home.h - away.h)
  const close = Boolean(a && b) && Math.min(dh, 360 - dh) < 25
  return { home: a ? css(home) : css(GRAPHITE), away: b ? css(away, close ? 0.14 : 0) : css(GRAPHITE) }
}
