#!/usr/bin/env node
/**
 * Цвета колец историй турниров (владелец: «кольца историй лиг окрашивать в какойто средний цвет с логотипа? типа как
 * у нас в графиках команд»): главный цвет каждого логотипа из public/leagues — тем же правилом, что цвета эмблем клубов
 * (`logoPalette` в lib/team-colors.ts: оттенки по 15°, вес — насыщенность, золото главным — только если других цветов
 * почти нет; тёмные пиксели — от L 0,05, а не 0,12: лев АПЛ тёмно-фиолетовый), светлота поднята до OKLCH L 0,62–0,8, как у полос клубов (`.club-bar-h`), — иначе тёмное кольцо тонет
 * на графите. Чёрно-белые логотипы — без цвета (кольцо белое). Пишет lib/league-colors.ts.
 *
 *   node scripts/league-colors.mjs
 *
 * Новый логотип в public/leagues — запустите заново.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIR = path.join(ROOT, 'public/leagues')

function rgbToHsl(r, g, b) {
  const R = r / 255, G = g / 255, B = b / 255
  const max = Math.max(R, G, B), min = Math.min(R, G, B)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === R ? ((G - B) / d + (G < B ? 6 : 0)) * 60 : max === G ? ((B - R) / d + 2) * 60 : ((R - G) / d + 4) * 60
  return { h, s, l }
}

const isGold = (i) => i >= 2 && i <= 4

/** Главный цвет по пикселям RGBA — как первый цвет `logoPalette`. */
function mainColor(data) {
  const bins = Array.from({ length: 24 }, () => ({ w: 0, x: 0, y: 0, s: 0, l: 0, r: 0, g: 0, b: 0 }))
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue
    const c = rgbToHsl(data[i], data[i + 1], data[i + 2])
    if (c.s < 0.25 || c.l < 0.05 || c.l > 0.9) continue
    const bin = bins[Math.floor(c.h / 15) % 24]
    bin.w += c.s
    bin.r += data[i] * c.s
    bin.g += data[i + 1] * c.s
    bin.b += data[i + 2] * c.s
  }
  const near = (i, noGold) => [[(i + 23) % 24, 0.5], [i, 1], [(i + 1) % 24, 0.5]].filter(([j]) => !(noGold && isGold(j)))
  const score = (i, noGold = false) => near(i, noGold).reduce((s, [j, f]) => s + bins[j].w * f, 0)
  let best = 0
  for (let i = 1; i < 24; i++) if (score(i) > score(best)) best = i
  let noGold = false
  if (isGold(best)) {
    let other = -1
    for (let i = 0; i < 24; i++) if (!isGold(i) && (other < 0 || score(i, true) > score(other, true))) other = i
    if (score(other, true) >= Math.max(4, score(best) / 3)) (best = other), (noGold = true)
  }
  if (score(best, noGold) < 4) return null
  // средний цвет корзины с соседями — в RGB (по весу насыщенности)
  const m = near(best, noGold).reduce((a, [j, f]) => ({ w: a.w + bins[j].w * f, r: a.r + bins[j].r * f, g: a.g + bins[j].g * f, b: a.b + bins[j].b * f }), { w: 0, r: 0, g: 0, b: 0 })
  return [m.r / m.w, m.g / m.w, m.b / m.w]
}

/** sRGB → OKLCH */
function oklch([r, g, b]) {
  const lin = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  const [R, G, B] = [lin(r), lin(g), lin(b)]
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return { L, C: Math.hypot(a, bb), h: ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360 }
}

const out = {}
for (const f of readdirSync(DIR).sort()) {
  if (!/\.(svg|webp|png)$/.test(f)) continue
  const { data } = await sharp(readFileSync(path.join(DIR, f)), { density: 72 }).resize(48, 48, { fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const rgb = mainColor(data)
  if (!rgb) continue
  const c = oklch(rgb)
  if (c.C < 0.04) continue
  const L = Math.min(0.8, Math.max(0.62, c.L))
  const C = Math.min(0.19, Math.max(0.08, c.C))
  out[f.replace(/\.\w+$/, '')] = `oklch(${L.toFixed(2)} ${C.toFixed(3)} ${Math.round(c.h)})`
}

const body = Object.entries(out).map(([k, v]) => `  '${k}': '${v}',`).join('\n')
writeFileSync(
  path.join(ROOT, 'lib/league-colors.ts'),
  `/**\n * Цвет кольца историй турнира — главный цвет логотипа (файл без расширения → цвет). Сгенерировано\n * \`node scripts/league-colors.mjs\` — руками не правьте. Нет в списке (чёрно-белый логотип) — кольцо белое.\n */\nexport const LEAGUE_COLORS: Record<string, string> = {\n${body}\n}\n`,
)
console.log(`${Object.keys(out).length} цветов из ${readdirSync(DIR).length} файлов`)
