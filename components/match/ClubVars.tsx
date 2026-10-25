'use client'

import { useMatchTint } from '../shell/tint'

type Hsl = { h: number; s: number; l: number }

/** Оттенок (0–360), насыщенность и светлота (0–1) цвета `hsl(h s% l%)` (так их отдаёт `/api/tint`) или `#rrggbb`; иначе null. */
function hsl(c: string): Hsl | null {
  const k = /^hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/i.exec(c.trim())
  if (k) return { h: +k[1], s: +k[2] / 100, l: +k[3] / 100 }
  const m = /^#?([0-9a-f]{6})$/i.exec(c.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((x) => x / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  const l = (max + min) / 2
  if (!d) return { h: 0, s: 0, l }
  const s = d / (1 - Math.abs(2 * l - 1))
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { h: h * 60, s, l }
}

/**
 * Полосы не различить: оба цвета яркие и одного оттенка (меньше 35°) или оба почти без цвета (белый, серый, чёрный)
 * и близкой светлоты.
 */
function alike(x: Hsl, y: Hsl): boolean {
  if (x.s < 0.2 && y.s < 0.2) return Math.abs(x.l - y.l) < 0.3
  if (x.s < 0.2 || y.s < 0.2) return false
  const gap = Math.abs(x.h - y.h)
  return Math.min(gap, 360 - gap) < 35
}

/**
 * Цвета одного оттенка — гостям тот же оттенок другой светлоты: к светлым хозяевам — темнее, к остальным — светлее (тёмные CSS и так высветлит до L 0,62)
 * (было — белый, владелец: у гостей свой цвет, не белый). Исходные цвета не меняем — только вид полос.
 */
function shade(home: Hsl, away: Hsl): string {
  const light = home.l > 0.7
  return `hsl(${Math.round(away.h)} ${Math.round(Math.min(away.s, 0.75) * 100)}% ${light ? 40 : 80}%)`
}

/**
 * Цвета клубов матча — переменными `--club-h` / `--club-a` для блока внутри (полосы «Статистики», линии «Давления
 * команд»), те же, что у эмблем клубов (`useMatchTint`). Цвета догружаются (`/api/tint`); пока их нет — переменных нет,
 * полосы — запасной парой серых (`.club-bar-h/-a` в `app/globals.css`: светлая у хозяев, темнее у гостей). Тёмные цвета
 * высветляет CSS (`oklch` L ≥ 0,62). Цвета одного оттенка (владелец прислал «Овьедо» — «Реал Мадрид»: обе синие) —
 * у гостей тот же оттенок другой светлоты (`shade`).
 */
export function ClubVars({ id, ymd, className, children }: { id: number; ymd: string; className?: string; children: React.ReactNode }) {
  const t = useMatchTint(id, ymd, null)
  const h = t ? hsl(t.home) : null
  const a = t ? hsl(t.away) : null
  const same = !t || !h || !a || alike(h, a)
  const away = t && h && a && alike(h, a) ? shade(h, a) : t?.away
  // `data-alike` — цвета похожи (или их нет — две серые): линии «Давления команд» у гостей пунктиром
  return (
    <div className={className} data-alike={same ? '' : undefined} style={t ? ({ '--club-h': t.home, '--club-a': away } as React.CSSProperties) : undefined}>
      {children}
    </div>
  )
}
