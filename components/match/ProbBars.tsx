import { pct } from '@/lib/format'

/**
 * Вероятности П1 / Х / П2: тонкая полоса (хозяева — гости — ничья в середине нейтральная)
 * и подписи над ней цветом текста. Цвета команд — те же, что в сторис.
 */
export function X12Bar({
  home,
  draw,
  away,
  names,
}: {
  home: number
  draw: number
  away: number
  names?: [string, string]
}) {
  const seg = [
    { key: 'home', p: home, cls: 'bg-home', label: 'П1', name: names?.[0] },
    { key: 'draw', p: draw, cls: 'bg-tie', label: 'Х', name: 'ничья' },
    { key: 'away', p: away, cls: 'bg-away', label: 'П2', name: names?.[1] },
  ]
  return (
    <div>
      <div className="mb-2 grid grid-cols-3 gap-2 text-[12px]">
        {seg.map((s, i) => (
          <div key={s.key} className={`min-w-0 ${i === 1 ? 'text-center' : i === 2 ? 'text-right' : ''}`}>
            <div className="num text-[22px] font-semibold leading-none tracking-tight">{pct(s.p)}</div>
            <div className="mt-1 truncate text-dim">
              {s.label}
              {s.name ? <span className="text-mute"> · {s.name}</span> : null}
            </div>
          </div>
        ))}
      </div>
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden>
        {seg.map((s) => (
          <div key={s.key} className={s.cls} style={{ width: `${s.p * 100}%` }} title={`${s.label}: ${pct(s.p, 1)}`} />
        ))}
      </div>
    </div>
  )
}

/** Одна доля против остального: «больше / меньше», «да / нет». */
export function SplitBar({ left, leftLabel, rightLabel }: { left: number; leftLabel: string; rightLabel: string }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-[13px]">
        <span>
          {leftLabel} <span className="num ml-1 font-semibold">{pct(left)}</span>
        </span>
        <span className="text-dim">
          <span className="num mr-1">{pct(1 - left)}</span> {rightLabel}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
        <div className="h-full rounded-full bg-fg/85" style={{ width: `${left * 100}%` }} />
      </div>
    </div>
  )
}
