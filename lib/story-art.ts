/**
 * Обложки историй: в кружках на главной — одна тёмная основа и белая иконка тега
 * (цвет — только в кольце), а цвета тегов подсвечивают фон просмотрщика историй.
 * Свою картинку можно подложить файлом public/stories/<ключ>.(webp|jpg|png):
 * ключ — slug тега, «live», «top» или «all» (см. lib/story-covers.ts).
 */
/** Значок темы — имя из Phosphor Icons (components/story/ArtIcon.tsx). */
export type ArtIcon =
  | 'broadcast'
  | 'star'
  | 'seal-percent'
  | 'trend-down'
  | 'soccer-ball'
  | 'shield'
  | 'arrows-left-right'
  | 'crown'
  | 'circle-half'
  | 'lightning'
  | 'fire'
  | 'castle-turret'
  | 'bandaids'
  | 'arrows-in-line-horizontal'
  | 'trophy'
  | 'hash'

/** a — свечение сверху слева, b — снизу справа, base — тёмная основа. */
export type Art = { a: string; b: string; base: string; icon: ArtIcon }

const ART: Record<string, Art> = {
  live: { a: '#ff5c5c', b: '#ff2d75', base: '#1c0709', icon: 'broadcast' },
  top: { a: '#c8ff2e', b: '#f4f1e6', base: '#121604', icon: 'star' },
  all: { a: '#c8ff2e', b: '#34332b', base: '#121210', icon: 'hash' },
  value: { a: '#c8ff2e', b: '#3fd17a', base: '#0f1702', icon: 'seal-percent' },
  progruz: { a: '#ffb020', b: '#ff6a3d', base: '#1c1000', icon: 'trend-down' },
  'tb-2-5': { a: '#2ee6c9', b: '#3987e5', base: '#04161a', icon: 'soccer-ball' },
  'tm-2-5': { a: '#5b7bff', b: '#2ee6c9', base: '#070c1e', icon: 'shield' },
  'obe-zabyut': { a: '#2ee6a6', b: '#c8ff2e', base: '#031612', icon: 'arrows-left-right' },
  favorit: { a: '#ffd84d', b: '#ff9f1c', base: '#1c1500', icon: 'crown' },
  ravnye: { a: '#9b7bff', b: '#4cc9f0', base: '#0f0b1e', icon: 'circle-half' },
  andedog: { a: '#ff4fd8', b: '#9b7bff', base: '#190a1c', icon: 'lightning' },
  seriya: { a: '#ff7a1a', b: '#ff3d6e', base: '#1c0b03', icon: 'fire' },
  krepost: { a: '#4c8dff', b: '#9bd0ff', base: '#06111e', icon: 'castle-turret' },
  kadry: { a: '#ff4d6d', b: '#ffb3c1', base: '#1c060d', icon: 'bandaids' },
  h2h: { a: '#4cc9f0', b: '#c8ff2e', base: '#061417', icon: 'arrows-in-line-horizontal' },
  'top-match': { a: '#ffd84d', b: '#c8ff2e', base: '#161203', icon: 'trophy' },
}

const DEFAULT: Art = { a: '#c8ff2e', b: '#3987e5', base: '#121210', icon: 'hash' }

export const artFor = (key: string | null | undefined): Art => (key ? ART[key] : undefined) ?? DEFAULT

export const hasArt = (key: string) => key in ART

/**
 * Объёмные значки тем — картинки владельца (сгенерированы в ChatGPT в стиле логотипа: «надутое» белое матовое
 * стекло), public/story-icons/<ключ>.webp: обрезаны по предмету, по центру, размер выровнен по диагонали габаритов.
 * В кружках историй — вместо плоских; плоские (Phosphor, `icon`) — запасные. Там же цветные значки плиток «Подборок»
 * (pitch, goal, arrows-up-down — DaySummary.tsx).
 */
const PICS = new Set(['live', 'top', 'value', 'progruz', 'tb-2-5', 'tm-2-5', 'obe-zabyut', 'favorit', 'ravnye', 'andedog', 'seriya', 'krepost', 'kadry', 'h2h', 'top-match'])

export const artPic = (key: string): string | null => (PICS.has(key) ? `/story-icons/${key}.webp` : null)

/**
 * Фон кружка на главной: один для всех, во всех видах — тот же тон, что у плиток «Подборок» (один материал у всего,
 * на что нажимают; кружок держит форму и с серым кольцом просмотренного). Различаются кружки значком (он и даёт
 * цвет), а кольцо говорит, смотрели ли историю (не смотрели / LIVE / просмотрено).
 */
export const CIRCLE_BG = 'var(--color-panel-2)'

/** Фон просмотрщика историй: то же свечение, но мягко и сверху — текст остаётся читаемым. */
export function artGlow(art: Art): string {
  const mix = (c: string, p: number) => `color-mix(in oklab, ${c} ${p}%, transparent)`
  return [
    `radial-gradient(120% 60% at 30% -10%, ${mix(art.a, 30)}, transparent 62%)`,
    `radial-gradient(90% 50% at 90% 110%, ${mix(art.b, 18)}, transparent 62%)`,
    'var(--color-ink)',
  ].join(', ')
}
