import type { ReactNode } from 'react'
import { leagueLogo } from '@/lib/league-logos'

/**
 * Знак турнира кругом: логотип лиги (lib/league-logos.ts) на светлом круге — логотипы рисуют под белый фон, и тёмные
 * (лев АПЛ, Лига чемпионов, Шотландия) на графите пропадали; нет логотипа — флаг страны, нет и его — `fallback`.
 */
export function LeagueMark({ id, flag, size, fallback = null, className = '' }: { id: number; flag: string | null; size: number; fallback?: ReactNode; className?: string }) {
  const logo = leagueLogo(id)
  if (logo)
    return (
      <span aria-hidden className={`grid shrink-0 place-items-center rounded-full bg-[#e6e9ed] ${className}`} style={{ width: size, height: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- маленькая картинка, оптимизация next/image не нужна */}
        <img src={logo} alt="" width={size} height={size} loading="lazy" className="h-[74%] w-[74%] object-contain" />
      </span>
    )
  if (flag)
    return (
      // eslint-disable-next-line @next/next/no-img-element -- маленький SVG
      <img src={`/flags/${flag}.svg`} alt="" width={size} height={size} loading="lazy" className={`shrink-0 rounded-full object-cover ring-1 ring-white/15 ${className}`} style={{ width: size, height: size }} />
    )
  return fallback
}
