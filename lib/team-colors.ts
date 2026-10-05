/**
 * Цвета клубов для «Афиши» (вид «Главных матчей»): главный цвет — из эмблемы, автоматически для всех команд.
 * Картинку уменьшаем до 32 px и ищем самый «весомый» насыщенный оттенок; серые, белые и чёрные пиксели не
 * считаем, золото — только если других цветов почти нет. Считаем один раз на эмблему и храним месяц (`cache`). Нет эмблемы или она серая — графит.
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

/** Золото и жёлтый (30°–75°): у многих эмблем это окантовка, корона или мяч, а не цвет клуба. */
const isGold = (i: number) => i >= 2 && i <= 4

type Bin = { w: number; x: number; y: number; s: number; l: number }

/**
 * Главный цвет эмблемы или null, если цветных пикселей почти нет (чёрно-белые эмблемы). Золото берём, только
 * если других заметных цветов почти нет (меньше трети от золота): у «Барселоны», «Леванте», «Бетиса» оно —
 * окантовка или корона, а клубный цвет другой; у «Боруссии» Дортмунд, кроме жёлтого, только чёрный — она жёлтая.
 */
export function logoColor(src: string | null | undefined): Promise<Hsl | null> {
  if (!src) return Promise.resolve(null)
  const key = `logo-color:v3:${createHash('sha1').update(src).digest('hex')}`
  return cache.get(
    key,
    async () => {
      const buf = await loadImage(src)
      if (!buf) return null
      const { data } = await sharp(buf, { density: 72 }).resize(32, 32, { fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      // оттенки по 15°: вес — насыщенность, чтобы яркий клубный цвет перевешивал бледные тени
      const bins: Bin[] = Array.from({ length: 24 }, () => ({ w: 0, x: 0, y: 0, s: 0, l: 0 }))
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 200) continue
        const c = rgbToHsl(data[i], data[i + 1], data[i + 2])
        if (c.s < 0.25 || c.l < 0.12 || c.l > 0.9) continue
        const b = bins[Math.floor(c.h / 15) % 24]
        const rad = (c.h * Math.PI) / 180
        b.w += c.s
        b.x += Math.cos(rad) * c.s
        b.y += Math.sin(rad) * c.s
        b.s += c.s * c.s
        b.l += c.l * c.s
      }
      // корзина с соседями (по полвеса): цвет на границе двух корзин не делится пополам
      const near = (i: number, noGold: boolean) =>
        (
          [
            [(i + 23) % 24, 0.5],
            [i, 1],
            [(i + 1) % 24, 0.5],
          ] as const
        ).filter(([j]) => !(noGold && isGold(j)))
      const score = (i: number, noGold = false) => near(i, noGold).reduce((sum, [j, f]) => sum + bins[j].w * f, 0)
      let best = 0
      for (let i = 1; i < 24; i++) if (score(i) > score(best)) best = i
      let noGold = false
      if (isGold(best)) {
        let other = -1
        for (let i = 0; i < 24; i++) if (!isGold(i) && (other < 0 || score(i, true) > score(other, true))) other = i
        if (score(other, true) >= Math.max(4, score(best) / 3)) {
          best = other
          noGold = true
        }
      }
      if (score(best, noGold) < 4) return null
      const m = near(best, noGold).reduce(
        (a, [j, f]) => ({ w: a.w + bins[j].w * f, x: a.x + bins[j].x * f, y: a.y + bins[j].y * f, s: a.s + bins[j].s * f, l: a.l + bins[j].l * f }),
        { w: 0, x: 0, y: 0, s: 0, l: 0 },
      )
      return { h: ((Math.atan2(m.y, m.x) * 180) / Math.PI + 360) % 360, s: m.s / m.w, l: m.l / m.w }
    },
    { ttl: 30 * 24 * 3600 },
  )
}

/** Цвет для фона: без неона и без «грязи» — насыщенность и светлота в спокойных пределах. */
const css = (c: Hsl, darker = 0) => {
  // жёлтые и лаймовые оттенки темнее: на них белый текст иначе не читается
  const top = c.h >= 40 && c.h <= 90 ? 0.4 : 0.48
  return `hsl(${Math.round(c.h)} ${Math.round(Math.min(0.8, Math.max(0.45, c.s)) * 100)}% ${Math.round((Math.min(top, Math.max(0.32, c.l)) - darker) * 100)}%)`
}

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
