import type { ReactNode } from 'react'
import { leagueLogoInfo } from '@/lib/league-logos'

/** Размер знака в круге — по площади, а не по длинной стороне: квадратный щит и надпись «eredivisie» на вид одного
 * размера (по длинной стороне надписи выходили мелкими, щиты — крупными; владелец: «криво»), и не за краем круга. */
function fit(aspect: number) {
  let w = 0.64 * Math.sqrt(aspect)
  let h = 0.64 / Math.sqrt(aspect)
  const k = Math.min(1, 0.8 / Math.max(w, h), 0.96 / Math.hypot(w, h))
  w *= k
  h *= k
  return { width: `${(w * 100).toFixed(1)}%`, height: `${(h * 100).toFixed(1)}%` }
}

/**
 * Знак турнира кругом: логотип лиги (lib/league-logos.ts) на светлом круге — логотипы рисуют под белый фон, и тёмные
 * (лев АПЛ, Лига чемпионов, Шотландия) на графите пропадали; логотип с квадратной подложкой (Бундеслига) — во весь круг;
 * нет логотипа — флаг страны, нет и его — `fallback`.
 */
export function LeagueMark({ id, flag, size, fallback = null, className = '' }: { id: number; flag: string | null; size: number; fallback?: ReactNode; className?: string }) {
  const logo = leagueLogoInfo(id)
  if (logo)
    return (
      <span aria-hidden className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#e6e9ed] ${className}`} style={{ width: size, height: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- маленькая картинка, оптимизация next/image не нужна */}
        <img src={logo.src} alt="" width={size} height={size} loading="lazy" className={logo.tile ? 'h-full w-full object-cover' : 'object-contain'} style={logo.tile ? undefined : fit(logo.aspect)} />
      </span>
    )
  if (flag)
    return (
      // eslint-disable-next-line @next/next/no-img-element -- маленький SVG
      <img src={`/flags/${flag}.svg`} alt="" width={size} height={size} loading="lazy" className={`shrink-0 rounded-full object-cover ring-1 ring-white/15 ${className}`} style={{ width: size, height: size }} />
    )
  return fallback
}
