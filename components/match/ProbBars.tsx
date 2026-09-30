import { pct } from '@/lib/format'

/** Трёхцветная полоса вероятностей П1 / Х / П2. */
export function X12Bar({ home, draw, away, labels = ['П1', 'Х', 'П2'] }: { home: number; draw: number; away: number; labels?: string[] }) {
  const seg = [
    { p: home, cls: 'bg-acid text-acid-ink', label: labels[0] },
    { p: draw, cls: 'bg-panel-3 text-fg', label: labels[1] },
    { p: away, cls: 'bg-sky-400 text-black', label: labels[2] },
  ]
  return (
    <div className="flex h-9 w-full overflow-hidden rounded-lg text-[12px] font-bold">
      {seg.map((s, i) => (
        <div
          key={i}
          className={`flex min-w-0 items-center justify-center whitespace-nowrap px-1 ${s.cls}`}
          style={{ width: `${Math.max(s.p * 100, 7)}%` }}
          title={`${s.label}: ${pct(s.p, 1)}`}
        >
          <span className="truncate">
            {s.p >= 0.12 ? `${s.label} ` : ''}
            {pct(s.p)}
          </span>
        </div>
      ))}
    </div>
  )
}

/** Двусторонняя полоса: «больше / меньше», «да / нет». */
export function SplitBar({ left, leftLabel, rightLabel }: { left: number; leftLabel: string; rightLabel: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[12px] font-semibold">
        <span>
          {leftLabel} <span className="num text-acid">{pct(left)}</span>
        </span>
        <span>
          <span className="num text-dim">{pct(1 - left)}</span> {rightLabel}
        </span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-panel-3">
        <div className="bg-acid" style={{ width: `${left * 100}%` }} />
      </div>
    </div>
  )
}
