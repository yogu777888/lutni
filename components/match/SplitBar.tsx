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
 * Проценты со своей шкалой у каждой команды (точность передач 82% и 77% — не доли одного целого): две дорожки от
 * центра, каждая — из 100%, хозяева растут влево, гости вправо.
 */
export function PctBars({ home, away, className = 'h-[5px]' }: { home: number | null; away: number | null; className?: string }) {
  const w = (v: number | null) => `${Math.max(0, Math.min(100, v ?? 0))}%`
  return (
    <div aria-hidden className={`flex gap-[3px] ${className}`}>
      <div className="flex flex-1 justify-end overflow-hidden rounded-full bg-white/[0.06]">
        <div className="club-bar-h rounded-full" style={{ width: w(home) }} />
      </div>
      <div className="flex flex-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="club-bar-a rounded-full" style={{ width: w(away) }} />
      </div>
    </div>
  )
}
