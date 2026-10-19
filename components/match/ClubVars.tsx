'use client'

import { useMatchTint } from '../shell/tint'

/**
 * Цвета клубов матча — переменными `--club-h` / `--club-a` для блока внутри (полосы статистики «Сейчас в матче»), те же,
 * * что у эмблем клубов (`useMatchTint`). Цвета догружаются (`/api/tint`); пока их нет — переменных нет, полосы белые.
 */
export function ClubVars({ id, ymd, children }: { id: number; ymd: string; children: React.ReactNode }) {
  const t = useMatchTint(id, ymd, null)
  return <div style={t ? ({ '--club-h': t.home, '--club-a': t.away } as React.CSSProperties) : undefined}>{children}</div>
}
