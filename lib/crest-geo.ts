/** Геометрия эмблемы с готовой тенью (lib/crest-shadow.ts) — общая для сервера и разметки, без `sharp`. */

/** Длина следа тени — доля большей стороны эмблемы: до края любого круга (эмблема — ~62% круга). */
export const TRAIL = 1.1

/** Во сколько раз картинка шире и выше места эмблемы. */
export function crestScale(aspect: number) {
  return aspect >= 1 ? { x: 1 + TRAIL, y: 1 + TRAIL * aspect } : { x: 1 + TRAIL / aspect, y: 1 + TRAIL }
}

/** Адрес эмблемы с тенью. */
export const crestSrc = (src: string, aspect = 1, tile = false) =>
  `/api/crest?u=${encodeURIComponent(src)}${tile ? '&t=1' : aspect === 1 ? '' : `&a=${Math.round(aspect * 1000) / 1000}`}`
