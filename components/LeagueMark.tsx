import type { CSSProperties, ReactNode } from 'react'
import { leagueLogoInfo } from '@/lib/league-logos'
import { crestScale, crestSrc } from '@/lib/crest-geo'

/** Размер знака в круге — по площади, а не по длинной стороне: квадратный щит и надпись «eredivisie» на вид одного
 * размера (по длинной стороне надписи выходили мелкими, щиты — крупными; владелец: «криво»), и не за краем круга. */
function fit(aspect: number, bare: boolean) {
  // без круга (`bare`) — знак крупнее: квадрат 86% места, по стороне до 100%
  const base = bare ? 0.86 : 0.64
  let w = base * Math.sqrt(aspect)
  let h = base / Math.sqrt(aspect)
  const k = bare ? Math.min(1, 1 / Math.max(w, h)) : Math.min(1, 0.8 / Math.max(w, h), 0.96 / Math.hypot(w, h))
  w *= k
  h *= k
  return { width: `${(w * 100).toFixed(1)}%`, height: `${(h * 100).toFixed(1)}%` }
}

/** Логотип с квадратной подложкой (Бундеслига) — скруглённым квадратом внутри круга, как иконка приложения: во весь круг
 * круг срезал надпись «BUNDESLIGA» внизу (владелец: «логотип бундеслиги почему-то кругло обрезается»). 70% — углы не
 * выходят за круг. */
const tile = (bare: boolean) => ({ width: bare ? '86%' : '70%', height: bare ? '86%' : '70%', borderRadius: '22%' })

/**
 * Знак турнира: логотип лиги (lib/league-logos.ts) в сером круге `white/10`, как в Apple Sports (логотип — 64% круга) (светлый круг владелец
 * отверг: «не нравится белый фон у логотипов»); тёмные знаки (лев АПЛ, Лига чемпионов, Шотландия) — с перевёрнутой
 * яркостью (`dark`), иначе на графите пропадают; логотип с квадратной подложкой (Бундеслига) — скруглённым квадратом в круге; `bare` —
 * без круга и крупнее (заголовки блоков лиг); нет логотипа — флаг страны, нет и его — `fallback`.
 */
/**
 * Светлая круглая подложка под эмблемы и логотипы в кругах историй (владелец: «может добавим логотипам круглую светлую
 * подложку?», потом «чуть темнее… и давай на все истории»): эмблемы рисуют под белый фон — тёмные на графите пропадали.
 * Чуть темнее белого `#e6e9ed` — чистый светлый круг был ярче названий в панели.
 */
export const PLATE = '#cdd2d8'

/**
 * Тень эмблемы на светлой подложке — «длинная», с твёрдыми краями, вниз вправо до края круга (владелец: «да не размытую а с
 * твердыми углами»). Рисует сервер готовой картинкой (`/api/crest`, lib/crest-shadow.ts, цвет `#bbc1c8`); SVG-фильтра
 * `#crest-shadow` в браузере больше нет — ни у эмблем, ни у логотипов-плиток. Светлый контур не делать — владелец отверг.
 */
/** Эмблема с длинной тенью — готовой картинкой; `tile` — логотип с квадратной подложкой, скруглённым квадратом. */
export function ShadowCrest({ src, aspect = 1, tile = false, className = '', style }: { src: string; aspect?: number; tile?: boolean; className?: string; style?: CSSProperties }) {
  // тень — уже в картинке (/api/crest, lib/crest-shadow.ts): эмблема в левом верхнем углу, след вправо и вниз; место — по
  // эмблеме, картинка шире и выше его и выходит за рамку, круг подложки срезает
  const k = crestScale(tile ? 1 : aspect)
  return (
    <span className={`relative block ${className}`} style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element -- готовая картинка с нашего сервера */}
      <img
        src={crestSrc(src, aspect, tile)}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className="pointer-events-none absolute left-0 top-0 max-w-none"
        style={{ width: `${k.x * 100}%`, height: `${k.y * 100}%` }}
      />
    </span>
  )
}

/** `light` — на светлой подложке `PLATE` (круги историй): тёмные логотипы тогда без перевёрнутой яркости. */
export function LeagueMark({ id, flag, size, bare = false, fill, light = false, fallback = null, className = '' }: { id: number; flag: string | null; size: number; bare?: boolean; fill?: string; light?: boolean; fallback?: ReactNode; className?: string }) {
  const logo = leagueLogoInfo(id)
  if (light) fill = PLATE
  // логотипы-плитки (Бундеслига) — тоже готовой картинкой: скругление и тень уже в ней (`t=1` у /api/crest)
  if (logo && fill === PLATE && logo.tile)
    return (
      <span aria-hidden className={`grid shrink-0 grid-cols-1 grid-rows-1 place-items-center ${bare ? '' : 'overflow-hidden rounded-full'} ${className}`} style={{ width: size, height: size, ...(!bare ? { background: fill } : {}) }}>
        <ShadowCrest src={logo.src} tile style={{ width: tile(bare).width, height: tile(bare).height }} />
      </span>
    )
  if (logo && fill === PLATE && !(logo.dark && !light))
    return (
      <span aria-hidden className={`grid shrink-0 grid-cols-1 grid-rows-1 place-items-center ${bare ? '' : 'overflow-hidden rounded-full'} ${className}`} style={{ width: size, height: size, ...(!bare ? { background: fill } : {}) }}>
        <ShadowCrest src={logo.src} aspect={logo.aspect} style={fit(logo.aspect, bare)} />
      </span>
    )
  if (logo)
    return (
      <span aria-hidden className={`grid shrink-0 place-items-center ${bare ? '' : `overflow-hidden rounded-full ${fill ? '' : 'bg-white/[0.1]'}`} ${className}`} style={{ width: size, height: size, ...(fill && !bare ? { background: fill } : {}) }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- маленькая картинка, оптимизация next/image не нужна */}
        <img
          src={logo.src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          className={logo.tile ? 'object-cover' : 'object-contain'}
          style={{ ...(logo.tile ? tile(bare) : fit(logo.aspect, bare)), ...(logo.dark && !light ? { filter: 'invert(1) hue-rotate(180deg)' } : {}) }}
        />
      </span>
    )
  if (flag)
    return (
      // eslint-disable-next-line @next/next/no-img-element -- маленький SVG
      <img src={`/flags/${flag}.svg`} alt="" width={size} height={size} loading="lazy" className={`shrink-0 rounded-full object-cover ring-1 ring-white/15 ${className}`} style={{ width: size, height: size }} />
    )
  return fallback
}
