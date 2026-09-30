import { formatDateShort, pct } from '@/lib/format'
import type { H2H } from '@/lib/stats'
import type { Team } from '@/lib/types'

export function H2HBlock({ h2h, home, away }: { h2h: H2H; home: Team; away: Team }) {
  const n = h2h.games.length
  const seg = [
    { v: h2h.homeWins, label: home.name, cls: 'bg-acid text-acid-ink' },
    { v: h2h.draws, label: 'Ничьи', cls: 'bg-panel-3' },
    { v: h2h.awayWins, label: away.name, cls: 'bg-sky-400 text-black' },
  ]
  return (
    <div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {seg.map((s, i) => (
          <div key={i} className="rounded-xl bg-panel-2 p-2.5">
            <div className={`num mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-base font-extrabold ${s.cls}`}>{s.v}</div>
            <div className="mt-1 truncate text-[11px] text-dim">{s.label}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-dim">
        {n} последних встреч: в среднем {h2h.avgGoals.toFixed(1)} гола, ТБ 2.5 — {pct(h2h.over25Rate)}, обе забивали — {pct(h2h.bttsRate)}.
      </p>
      <ul className="mt-3 divide-y divide-edge/70 text-[13px]">
        {h2h.games.map((g) => (
          <li key={g.id} className="flex items-center gap-2 py-1.5">
            <span className="num w-[74px] shrink-0 text-[11px] text-mute">{formatDateShort(g.ts)}</span>
            <span className="min-w-0 flex-1 truncate text-right">{g.home.name}</span>
            <span className="num shrink-0 rounded-md bg-panel-2 px-2 py-0.5 font-bold">
              {g.score.home}:{g.score.away}
            </span>
            <span className="min-w-0 flex-1 truncate">{g.away.name}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
