/**
 * Длинная тень эмблемы — заранее нарисованной картинкой, а не SVG-фильтром в браузере (владелец: «может я скачаю все лого
 * команд и через какой-то код сделаю тени…» — делает сам сервер: при первом показе эмблемы дорисовывает тень и хранит
 * готовую картинку на диске, новые команды подхватываются сами). Фильтр `#crest-shadow` — самое дорогое, что рисовала
 * страница: каждая перерисовка рядом с эмблемой пересчитывала его заново, в Safari — особенно медленно.
 *
 * Вид — как у фильтра: силуэт эмблемы удваивается со сдвигом вниз вправо (1 → 2 → 4 … px), залит `SHADOW_TONE`, эмблема
 * сверху. Картинка — эмблема в своём прямоугольнике (`aspect`) и след справа и снизу длиной `TRAIL` её большей стороны —
 * до края любого круга (эмблема — ~62% круга, дальше всех идёт след от верхнего левого угла — ~1,07 стороны); круг срезает.
 */
import sharp from 'sharp'
import { TRAIL } from './crest-geo'

/** Цвет тени — тот же, что был у фильтра (`SHADOW_TONE` в components/LeagueMark.tsx). */
const TONE = [0xbb, 0xc1, 0xc8]
/** Тень на тёмной подложке (`DARK_SHADOW` в lib/crest-geo.ts, `&d=1`). */
const TONE_DARK = [0x1f, 0x25, 0x2c]
/** Большая сторона эмблемы в картинке: самая крупная на экране — ~52px (ряд кружков над историей), на ретине ×2. */
const SIZE = 128

/** Размер эмблемы в картинке для пропорции `aspect` (ширина / высота). */
export function crestBox(aspect: number) {
  return aspect >= 1 ? { w: SIZE, h: Math.max(1, Math.round(SIZE / aspect)) } : { w: Math.max(1, Math.round(SIZE * aspect)), h: SIZE }
}

/**
 * `tile` — логотип с квадратной подложкой в самом файле (Бундеслига, `TILES` в lib/league-logos.ts): квадрат на всю
 * картинку и скругление 22%, как прежде делал `border-radius`; тень — от скруглённого квадрата.
 */
export async function bakeCrest(src: Buffer, aspect: number, tile: boolean | 'round' = false, dark = false): Promise<Buffer> {
  const tone = dark ? TONE_DARK : TONE
  const { w, h } = crestBox(tile ? 1 : aspect)
  let img = sharp(src, { density: 288 }).resize(w, h, tile ? { fit: 'cover' } : { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  if (tile) {
    // 'round' — флаг страны кругом (турнир без логотипа в левой панели)
    const r = Math.round(w * (tile === 'round' ? 0.5 : 0.22))
    const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" ry="${r}"/></svg>`)
    img = sharp(await img.ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer())
  }
  const logo = await img.ensureAlpha().raw().toBuffer()
  const t = Math.ceil(TRAIL * Math.max(w, h))
  const W = w + t
  const H = h + t
  // альфа силуэта на полном холсте
  let a = new Float32Array(W * H)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) a[y * W + x] = logo[(y * w + x) * 4 + 3] / 255
  // удвоения: слой поверх себя, сдвинутого на d по обеим осям (как feMerge в прежнем фильтре)
  for (let d = 1; d < t * 2; d *= 2) {
    const b = new Float32Array(W * H)
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const top = a[y * W + x]
        const under = x >= d && y >= d ? a[(y - d) * W + (x - d)] : 0
        b[y * W + x] = top + under * (1 - top)
      }
    a = b
  }
  const shadow = Buffer.alloc(W * H * 4)
  for (let i = 0; i < W * H; i++) {
    shadow[i * 4] = tone[0]
    shadow[i * 4 + 1] = tone[1]
    shadow[i * 4 + 2] = tone[2]
    shadow[i * 4 + 3] = Math.round(a[i] * 255)
  }
  return sharp(shadow, { raw: { width: W, height: H, channels: 4 } })
    .composite([{ input: logo, raw: { width: w, height: h, channels: 4 }, left: 0, top: 0 }])
    // сжатый webp: у тени ровные заливки, у эмблемы — как у исходника 150px; без потерь выходило ~19 КБ, так ~5
    .webp({ quality: 85, alphaQuality: 100, effort: 5 })
    .toBuffer()
}
