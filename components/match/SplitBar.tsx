/**
 * Полоса соотношения, как в прототипе ChatGPT: одна на строку, поделена по долям — хозяева слева, гости справа, зазор 2px,
 * обе части одной яркости цветами клубов (`.club-bar-h/-a`). Было две половинки от центра, отстающая — бледнее: у команды
 * без цвета клуба полоса скакала серой и белой от строки к строке. Оба нуля — пустая дорожка.
 */
export function SplitBar({ home, away, className = 'h-1.5' }: { home: number; away: number; className?: string }) {
  const sum = home + away
  if (!sum) return <div aria-hidden className={`rounded-full bg-white/[0.06] ${className}`} />
  return (
    <div aria-hidden className={`flex gap-0.5 ${className}`}>
      {home > 0 ? <div className="club-bar-h rounded-full" style={{ flexGrow: home, flexBasis: 0 }} /> : null}
      {away > 0 ? <div className="club-bar-a rounded-full" style={{ flexGrow: away, flexBasis: 0 }} /> : null}
    </div>
  )
}
