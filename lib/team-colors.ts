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

/** Цвета фона «Афиши»: хозяева слева, гости справа; у каждого — главный и второй (для второго пятна). */
export type MatchColors = { home: string; away: string; home2: string; away2: string }

/** Если у эмблемы нет своего цвета — графит (как есть: пределы насыщенности для клубных цветов к нему не применяем). */
const GRAPHITE = 'hsl(40 6% 30%)'
const GRAPHITE_2 = 'hsl(40 6% 38%)'

/** Второй цвет, если у эмблемы он один: соседний оттенок, светлее — пятна разные, а фон остаётся «своим». */
const accent = (c: Hsl): Hsl => ({ h: (c.h + 22) % 360, s: Math.min(1, c.s * 1.1), l: c.l + 0.1 })

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
 * Цвета эмблемы: главный и, если есть, второй — заметный другой оттенок (не ближе 45° к главному и весом от
 * четверти главного; золото тут можно — это акцент). Пусто, если цветных пикселей почти нет (чёрно-белые эмблемы).
 * Главным золото берём, только если других заметных цветов почти нет (меньше трети от золота): у «Барселоны»,
 * «Леванте», «Бетиса» оно — окантовка или корона, а клубный цвет другой; у «Боруссии» Дортмунд, кроме жёлтого,
 * только чёрный — она жёлтая.
 */
export function logoPalette(src: string | null | undefined): Promise<Hsl[]> {
  if (!src) return Promise.resolve([])
  const key = `logo-palette:v4:${createHash('sha1').update(src).digest('hex')}`
  return cache.get(
    key,
    async () => {
      const buf = await loadImage(src)
      if (!buf) return []
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
      const mean = (i: number, noGold: boolean): Hsl => {
        const m = near(i, noGold).reduce(
          (a, [j, f]) => ({ w: a.w + bins[j].w * f, x: a.x + bins[j].x * f, y: a.y + bins[j].y * f, s: a.s + bins[j].s * f, l: a.l + bins[j].l * f }),
          { w: 0, x: 0, y: 0, s: 0, l: 0 },
        )
        return { h: ((Math.atan2(m.y, m.x) * 180) / Math.PI + 360) % 360, s: m.s / m.w, l: m.l / m.w }
      }
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
      const top = score(best, noGold)
      if (top < 4) return []
      const out = [mean(best, noGold)]
      let second = -1
      for (let i = 0; i < 24; i++) {
        const d = Math.min(Math.abs(i - best), 24 - Math.abs(i - best))
        if (d >= 3 && (second < 0 || score(i) > score(second))) second = i
      }
      if (second >= 0 && score(second) >= Math.max(3, top / 4)) out.push(mean(second, false))
      return out
    },
    { ttl: 30 * 24 * 3600 },
  )
}

/** Главный цвет эмблемы или null (чёрно-белые эмблемы, нет эмблемы). */
export async function logoColor(src: string | null | undefined): Promise<Hsl | null> {
  return (await logoPalette(src))[0] ?? null
}

/** Цвет для фона: без неона и без «грязи» — насыщенность и светлота в спокойных пределах. */
const css = (c: Hsl, darker = 0, accent = false) => {
  // жёлтые и лаймовые оттенки темнее: на них белый текст иначе не читается; второму цвету (пятну) можно светлее —
  // иначе золото эмблемы превращается в грязно-оливковое
  const top = c.h >= 40 && c.h <= 90 ? (accent ? 0.47 : 0.4) : accent ? 0.52 : 0.48
  return `hsl(${Math.round(c.h)} ${Math.round(Math.min(0.8, Math.max(0.45, c.s)) * 100)}% ${Math.round((Math.min(top, Math.max(0.32, c.l)) - darker) * 100)}%)`
}

/**
 * Цвета матча для «Афиши»: у каждого клуба главный и второй (с эмблемы или соседний оттенок). Похожие оттенки у
 * соперников (разница меньше 25°) — гостей темнее, чтобы цвета не слились в одно пятно. У команды без цвета — графит.
 */
export async function matchColors(m: Match): Promise<MatchColors | null> {
  const [a, b] = await Promise.all([logoPalette(m.home.logo).catch(() => []), logoPalette(m.away.logo).catch(() => [])])
  if (!a.length && !b.length) return null
  const dh = a.length && b.length ? Math.abs(a[0].h - b[0].h) : 180
  const d = Math.min(dh, 360 - dh) < 25 ? 0.14 : 0
  return {
    home: a.length ? css(a[0]) : GRAPHITE,
    away: b.length ? css(b[0], d) : GRAPHITE,
    home2: a.length ? css(a[1] ?? accent(a[0]), 0, true) : GRAPHITE_2,
    away2: b.length ? css(b[1] ?? accent(b[0]), d, true) : GRAPHITE_2,
  }
}
