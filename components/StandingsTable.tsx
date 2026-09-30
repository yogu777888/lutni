import type { Standings } from '@/lib/types'
import { TeamLogo } from './TeamLogo'

const ZONE: Record<string, string> = {
  'Лига чемпионов': 'bg-acid',
  'Лига Европы': 'bg-sky-400',
  'Лига конференций': 'bg-teal-400',
  'Плей-офф': 'bg-violet-400',
  Повышение: 'bg-acid',
  'Зона вылета': 'bg-loss',
}

export function StandingsTable({
  standings,
  highlight = [],
  compact = false,
}: {
  standings: Standings
  highlight?: number[]
  compact?: boolean
}) {
  const zones = new Set<string>()
  return (
    <div className="space-y-4">
      {standings.groups.map((g, gi) => {
        let rows = g.rows
        if (compact && rows.length > 10 && highlight.length) {
          const idx = rows.map((r, i) => (highlight.includes(r.teamId) ? i : -1)).filter((i) => i >= 0)
          const keep = new Set<number>()
          for (const i of idx) for (let k = i - 2; k <= i + 2; k++) if (k >= 0 && k < rows.length) keep.add(k)
          rows = rows.filter((_, i) => keep.has(i))
        }
        rows.forEach((r) => r.zone && zones.add(r.zone))
        return (
          <div key={gi}>
            {g.name && standings.groups.length > 1 ? <h3 className="mb-1.5 text-xs font-bold text-dim">{g.name}</h3> : null}
            <div className="scrollbar-none -mx-4 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[420px] text-[13px]">
                <thead>
                  <tr className="text-[11px] font-bold text-mute">
                    <th className="w-8 py-1.5 pl-4 text-left sm:pl-1">#</th>
                    <th className="py-1.5 text-left">Команда</th>
                    <th className="w-8 py-1.5 text-center" title="Игры">И</th>
                    <th className="w-8 py-1.5 text-center" title="Победы">В</th>
                    <th className="w-8 py-1.5 text-center" title="Ничьи">Н</th>
                    <th className="w-8 py-1.5 text-center" title="Поражения">П</th>
                    <th className="w-14 py-1.5 text-center" title="Мячи">М</th>
                    <th className="w-10 py-1.5 pr-4 text-center sm:pr-1" title="Очки">О</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const hl = highlight.includes(r.teamId)
                    return (
                      <tr key={r.teamId} className={`border-t border-edge/70 ${hl ? 'bg-acid/[0.07]' : ''}`}>
                        <td className="relative py-1.5 pl-4 sm:pl-1">
                          {r.zone && ZONE[r.zone] ? <span className={`absolute left-0 top-1 bottom-1 w-[3px] rounded-full ${ZONE[r.zone]}`} /> : null}
                          <span className="num font-semibold text-dim">{r.rank}</span>
                        </td>
                        <td className="py-1.5">
                          <span className="flex items-center gap-2">
                            <TeamLogo name={r.team} src={r.logo} size={18} />
                            <span className={`truncate ${hl ? 'font-bold text-fg' : ''}`}>{r.team}</span>
                          </span>
                        </td>
                        <td className="num py-1.5 text-center text-dim">{r.played}</td>
                        <td className="num py-1.5 text-center">{r.wins}</td>
                        <td className="num py-1.5 text-center">{r.draws}</td>
                        <td className="num py-1.5 text-center">{r.losses}</td>
                        <td className="num py-1.5 text-center text-dim">
                          {r.goalsFor}:{r.goalsAgainst}
                        </td>
                        <td className="num py-1.5 pr-4 text-center font-extrabold sm:pr-1">{r.points}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
      {zones.size ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-dim">
          {[...zones].filter((z) => ZONE[z]).map((z) => (
            <span key={z} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-[3px] rounded-full ${ZONE[z]}`} />
              {z}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
