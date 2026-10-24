/**
 * Полоса соотношения, как в прототипе ChatGPT: одна на строку, поделена по долям `home / (home + away)` — хозяева
 * слева, гости справа, зазор 3px, обе части одной яркости цветами клубов (`.club-bar-h/-a`). Было две половинки от
 * центра, отстающая — бледнее: у команды без цвета клуба полоса скакала серой и белой от строки к строке. Оба нуля —
 * пустая дорожка.
 */
export function SplitBar({ home, away, even = 0, className = 'h-[5px]' }: { home: number; away: number; even?: number; className?: string }) {
  const sum = home + away + even
  if (!(sum > 0) || home < 0 || away < 0 || even < 0) return <div aria-hidden className={`rounded-full bg-white/[0.06] ${className}`} />
  return (
    <div aria-hidden className={`flex gap-[3px] ${className}`}>
      {home > 0 ? <div className="club-bar-h rounded-full" style={{ flexGrow: home, flexBasis: 0 }} /> : null}
      {/* `even` — третья часть посередине, нейтральная (в «Давлении команд» — минуты на равных) */}
      {even > 0 ? <div className="rounded-full bg-white/20" style={{ flexGrow: even, flexBasis: 0 }} /> : null}
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
 * центра влево, гости — вправо. Цвет — как в «Форме команд»: у кого лучше (`lead`) — белая, у другого —
 * серая, равно — обе средние (владелец: «как будто график из форма команд легче читается?» — цвета клубов одной яркости
 * говорили только «чья сторона»). `widths === null` — только пустые дорожки.
 */
export function MirrorBars({ widths, lead, className = 'h-1.5' }: { widths: [number, number] | null; lead: 'home' | 'away' | null; className?: string }) {
  const [h, a] = widths ?? [0, 0]
  const fill = (side: 'home' | 'away') => (lead === null ? 'bg-white/45' : lead === side ? 'bg-white/85' : 'bg-white/30')
  // вид — как полоса «Формы команд»: 6px, зазор 2px, дорожка `white/9`, скругления только снаружи — одна капсула,
  // разрезанная по центру (владелец: «графики визуально сделать как в форме команд»)
  return (
    <div aria-hidden className={`flex gap-0.5 ${className}`}>
      <div className="flex flex-1 justify-end overflow-hidden rounded-l-full bg-white/[0.09]">
        {h > 0 ? <div className={`h-full rounded-l-full ${fill('home')}`} style={{ width: `${h}%` }} /> : null}
      </div>
      <div className="flex-1 overflow-hidden rounded-r-full bg-white/[0.09]">
        {a > 0 ? <div className={`h-full rounded-r-full ${fill('away')}`} style={{ width: `${a}%` }} /> : null}
      </div>
    </div>
  )
}
