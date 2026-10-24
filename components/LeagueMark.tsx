import type { ReactNode } from 'react'
import { leagueLogoInfo } from '@/lib/league-logos'

/** Размер знака в круге — по площади, а не по длинной стороне: квадратный щит и надпись «eredivisie» на вид одного
 * размера (по длинной стороне надписи выходили мелкими, щиты — крупными; владелец: «криво»), и не за краем круга. */
function fit(aspect: number, bare: boolean) {
  // без круга (`bare`) — знак крупнее: квадрат 86% места, по стороне до 100%
  const base = bare ? 0.86 : 0.72
  let w = base * Math.sqrt(aspect)
  let h = base / Math.sqrt(aspect)
  const k = bare ? Math.min(1, 1 / Math.max(w, h)) : Math.min(1, 0.86 / Math.max(w, h), 1 / Math.hypot(w, h))
  w *= k
  h *= k
  return { width: `${(w * 100).toFixed(1)}%`, height: `${(h * 100).toFixed(1)}%` }
}

/**
 * Знак турнира: логотип лиги (lib/league-logos.ts) в сером круге `white/10`, как в Apple Sports (логотип — 72% круга) (светлый круг владелец
 * отверг: «не нравится белый фон у логотипов»); тёмные знаки (лев АПЛ, Лига чемпионов, Шотландия) — с перевёрнутой
 * яркостью (`dark`), иначе на графите пропадают; логотип с квадратной подложкой (Бундеслига) — во весь круг; `bare` —
 * без круга и крупнее (заголовки блоков лиг); нет логотипа — флаг страны, нет и его — `fallback`.
 */
export function LeagueMark({ id, flag, size, bare = false, fallback = null, className = '' }: { id: number; flag: string | null; size: number; bare?: boolean; fallback?: ReactNode; className?: string }) {
  const logo = leagueLogoInfo(id)
  if (logo)
    return (
      <span aria-hidden className={`grid shrink-0 place-items-center overflow-hidden rounded-full ${bare && !logo.tile ? '' : 'bg-white/[0.1]'} ${className}`} style={{ width: size, height: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- маленькая картинка, оптимизация next/image не нужна */}
        <img
          src={logo.src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          className={logo.tile ? 'h-full w-full object-cover' : 'object-contain'}
          style={{ ...(logo.tile ? {} : fit(logo.aspect, bare)), ...(logo.dark ? { filter: 'invert(1) hue-rotate(180deg)' } : {}) }}
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
