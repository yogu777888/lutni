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
      <div className="mb-2 grid grid-cols-3 gap-2 text-[13px]">
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

/**
 * Шанс одного исхода строкой, как строки статистики матча: подпись и процент, под ними полоса от края до края
 * (владелец: «а голы и счёт как?» — была «доля против остального»: «54% — 3 гола и больше» и «46% — до 2 голов»
 * повторяли одно число, а «Кто-то не забьёт» читалось коряво).
 */
export function ChanceRow({ label, p }: { label: string; p: number }) {
  return (
    <li>
      <div className="mb-1 flex justify-between gap-3 text-[13px]">
        <span className="text-dim">{label}</span>
        <span className="num font-semibold text-fg">{pct(p)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.09]">
        <div className="h-full rounded-full bg-white/70" style={{ width: `${p * 100}%` }} />
      </div>
    </li>
  )
}
