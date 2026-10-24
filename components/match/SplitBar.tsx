/**
 * Полоса соотношения, как в прототипе ChatGPT: одна на строку, поделена по долям `home / (home + away)` — хозяева
 * слева, гости справа, зазор 3px, обе части одной яркости цветами клубов (`.club-bar-h/-a`). Было две половинки от
 * центра, отстающая — бледнее: у команды без цвета клуба полоса скакала серой и белой от строки к строке. Оба нуля —
 * пустая дорожка.
 */
export function SplitBar({ home, away, className = 'h-[5px]' }: { home: number; away: number; className?: string }) {
  const sum = home + away
  if (!(sum > 0) || home < 0 || away < 0) return <div aria-hidden className={`rounded-full bg-white/[0.06] ${className}`} />
  return (
    <div aria-hidden className={`flex gap-[3px] ${className}`}>
      {home > 0 ? <div className="club-bar-h rounded-full" style={{ flexGrow: home, flexBasis: 0 }} /> : null}
      {away > 0 ? <div className="club-bar-a rounded-full" style={{ flexGrow: away, flexBasis: 0 }} /> : null}
    </div>
  )
}

/**
 * Ширина заливки каждой половины зеркальной полосы, 0–100. Количества — от большего в строке (удары 12 и 3 — 100% и
 * 25%), проценты и владение (`abs`) — по своей шкале 0–100 (точность передач 85% и 72% — 85 и 72). Нет значения у
 * кого-то или оно отрицательное — `null`: полосы нет (нулём не подменяем); 0 : 0 — обе пустые.
 */
export function mirrorWidths(home: number | null, away: number | null, abs: boolean): [number, number] | null {
  if (home === null || away === null || !Number.isFinite(home) || !Number.isFinite(away) || home < 0 || away < 0) return null
  const clamp = (v: number) => Math.max(0, Math.min(100, v))
  if (abs) return [clamp(home), clamp(away)]
  const max = Math.max(home, away)
  return max > 0 ? [clamp((home / max) * 100), clamp((away / max) * 100)] : [0, 0]
}

/**
 * Зеркальная полоса строки статистики: центр — неподвижная точка, у каждой команды своя половина, хозяева растут от
 * центра влево, гости — вправо, зазор 3px; цвета клубов чуть приглушены (`saturate`), чтобы не спорили с цифрами.
 * `widths === null` — только пустые дорожки.
 */
export function MirrorBars({ widths, className = 'h-[5px]' }: { widths: [number, number] | null; className?: string }) {
  const [h, a] = widths ?? [0, 0]
  return (
    <div aria-hidden className={`flex gap-[3px] saturate-[.8] ${className}`}>
      <div className="flex flex-1 justify-end overflow-hidden rounded-full bg-white/[0.06]">
        {h > 0 ? <div className="club-bar-h rounded-full" style={{ width: `${h}%` }} /> : null}
      </div>
      <div className="flex flex-1 overflow-hidden rounded-full bg-white/[0.06]">
        {a > 0 ? <div className="club-bar-a rounded-full" style={{ width: `${a}%` }} /> : null}
      </div>
    </div>
  )
}
