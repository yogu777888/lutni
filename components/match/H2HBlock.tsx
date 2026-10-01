import { formatDateShort, pct } from '@/lib/format'
import type { H2H } from '@/lib/stats'
import type { Team } from '@/lib/types'

/** Личные встречи: счёт побед полосой (цвета команд — как в сторис) и список матчей. */
export function H2HBlock({ h2h, home, away }: { h2h: H2H; home: Team; away: Team }) {
  const n = h2h.games.length
  const seg = [
    { key: 'home', v: h2h.homeWins, label: `Победы: ${home.name}`, cls: 'bg-home' },
    { key: 'draw', v: h2h.draws, label: 'Ничьи', cls: 'bg-tie' },
    { key: 'away', v: h2h.awayWins, label: `Победы: ${away.name}`, cls: 'bg-away' },
  ]
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {seg.map((s, i) => (
          <div key={s.key} className={`min-w-0 ${i === 1 ? 'text-center' : i === 2 ? 'text-right' : ''}`}>
            <div className="num text-[22px] font-semibold leading-none tracking-tight">{s.v}</div>
            <div className="mt-1 truncate text-[12px] text-dim">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden>
        {seg
          .filter((s) => s.v > 0)
          .map((s) => (
            <div key={s.key} className={s.cls} style={{ flexGrow: s.v, flexBasis: 0 }} />
          ))}
      </div>
      <p className="mt-4 text-[13px] text-dim">
        {n} последних встреч: в среднем {h2h.avgGoals.toFixed(1)} гола, ТБ 2.5 — {pct(h2h.over25Rate)}, обе забивали — {pct(h2h.bttsRate)}.
      </p>
      <ul className="mt-3 divide-y divide-edge text-[13px]">
        {h2h.games.map((g) => (
          <li key={g.id} className="flex items-center gap-2 py-2">
            <span className="num w-[74px] shrink-0 text-[11px] text-mute">{formatDateShort(g.ts)}</span>
            <span className={`min-w-0 flex-1 truncate text-right ${g.score.home > g.score.away ? 'font-medium' : 'text-dim'}`}>{g.home.name}</span>
            <span className="num shrink-0 rounded-full bg-white/[0.06] px-2.5 py-0.5 font-semibold">
              {g.score.home}:{g.score.away}
            </span>
            <span className={`min-w-0 flex-1 truncate ${g.score.away > g.score.home ? 'font-medium' : 'text-dim'}`}>{g.away.name}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
