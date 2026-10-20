'use client'

import { useMatchTint } from '../shell/tint'

/** Оттенок (0–360) и насыщенность (0–1) цвета `hsl(h s% l%)` (так их отдаёт `/api/tint`) или `#rrggbb`; иначе null. */
function hs(c: string): { h: number; s: number } | null {
  const k = /^hsl\(\s*([\d.]+)\s+([\d.]+)%/i.exec(c.trim())
  if (k) return { h: +k[1], s: +k[2] / 100 }
  const m = /^#?([0-9a-f]{6})$/i.exec(c.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((x) => x / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  if (!d) return { h: 0, s: 0 }
  const l = (max + min) / 2
  const s = d / (1 - Math.abs(2 * l - 1))
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { h: h * 60, s }
}

/** Оба цвета яркие и одного оттенка (меньше 35°) — полосы не различить. */
function alike(a: string, b: string): boolean {
  const x = hs(a)
  const y = hs(b)
  if (!x || !y || x.s < 0.2 || y.s < 0.2) return false
  const gap = Math.abs(x.h - y.h)
  return Math.min(gap, 360 - gap) < 35
}

/**
 * Цвета клубов матча — переменными `--club-h` / `--club-a` для блока внутри (полосы статистики «Сейчас в матче»), те же,
 * что у эмблем клубов (`useMatchTint`). Цвета догружаются (`/api/tint`); пока их нет — переменных нет, полосы белые.
 * Второго цвета у гостей не нашлось и цвета одного оттенка — у гостей белые полосы (владелец прислал «Овьедо» —
 * «Реал Мадрид»: обе команды синие, не видно, где чья).
 */
export function ClubVars({ id, ymd, children }: { id: number; ymd: string; children: React.ReactNode }) {
  const t = useMatchTint(id, ymd, null)
  const away = t && alike(t.home, t.away) ? '#ffffff' : t?.away
  return <div style={t ? ({ '--club-h': t.home, '--club-a': away } as React.CSSProperties) : undefined}>{children}</div>
}
