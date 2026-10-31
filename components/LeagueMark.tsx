import type { ReactNode } from 'react'
import { leagueLogoInfo } from '@/lib/league-logos'

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
 * Тень эмблемы на светлой подложке — «длинная», с твёрдыми краями, уходит вниз вправо до края круга, круг её срезает
 * (владелец: «да не размытую а с твердыми углами. и чтоб вниз вправо уходила например?», потом «надо тень до края круга
 * делать»). SVG-фильтр `CrestShadowDefs` (стоит один раз в app/layout.tsx): силуэт эмблемы удваиваем со сдвигом 0,5 → 1 →
 * 2 → … px (каждый шаг — объединение с собой, сдвинутым на текущую длину), за `DOUBLINGS` шагов — след 0,5 × 2^N px, залит
 * подложкой темнее. Цепочка CSS `drop-shadow` не годится: доли пикселя Chrome отбрасывает, а по 1px на ретине видны
 * ступеньки. Только на `PLATE`; светлый контур не делать — владелец отверг. Цвет — `SHADOW_TONE`.
 */
const SHADOW_TONE = '#bbc1c8'
/** 7 удвоений — след 64px: длиннее радиуса самого крупного круга, до края доходит всегда */
const DOUBLINGS = 7
export const CREST_SHADOW = 'url(#crest-shadow)'

export function CrestShadowDefs() {
  return (
    <svg aria-hidden width="0" height="0" className="pointer-events-none absolute">
      <filter id="crest-shadow" x="0" y="0" width="400%" height="400%" colorInterpolationFilters="sRGB">
        {Array.from({ length: DOUBLINGS }, (_, i) => {
          const from = i ? `t${i - 1}` : 'SourceAlpha'
          const d = 2 ** i / 2
          return [
            <feOffset key={`o${i}`} in={from} dx={d} dy={d} result={`o${i}`} />,
            <feMerge key={`m${i}`} result={`t${i}`}>
              <feMergeNode in={from} />
              <feMergeNode in={`o${i}`} />
            </feMerge>,
          ]
        })}
        <feFlood floodColor={SHADOW_TONE} />
        <feComposite in2={`t${DOUBLINGS - 1}`} operator="in" result="shadow" />
        <feMerge>
          <feMergeNode in="shadow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </svg>
  )
}

/** `light` — на светлой подложке `PLATE` (круги историй): тёмные логотипы тогда без перевёрнутой яркости. */
export function LeagueMark({ id, flag, size, bare = false, fill, light = false, fallback = null, className = '' }: { id: number; flag: string | null; size: number; bare?: boolean; fill?: string; light?: boolean; fallback?: ReactNode; className?: string }) {
  const logo = leagueLogoInfo(id)
  if (light) fill = PLATE
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
          style={{ ...(logo.tile ? tile(bare) : fit(logo.aspect, bare)), ...(logo.dark && !light ? { filter: 'invert(1) hue-rotate(180deg)' } : fill === PLATE ? { filter: CREST_SHADOW } : {}) }}
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
