import type { Injury, Team } from '@/lib/types'
import { TeamLogo } from '../TeamLogo'

export function InjuriesBlock({ injuries, home, away }: { injuries: Injury[]; home: Team; away: Team }) {
  if (!injuries.length) {
    return <p className="text-sm text-dim">Информации о травмированных и дисквалифицированных игроках нет.</p>
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {[home, away].map((t) => {
        const list = injuries.filter((i) => i.teamId === t.id)
        return (
          <div key={t.id}>
            <div className="mb-1.5 flex items-center gap-2 text-sm font-bold">
              <TeamLogo name={t.name} src={t.logo} size={18} />
              {t.name}
              <span className="num ml-auto text-xs font-semibold text-dim">{list.length}</span>
            </div>
            {list.length ? (
              <ul className="space-y-1 text-[13px]">
                {list.map((i, k) => (
                  <li key={k} className="flex justify-between gap-2 rounded-lg bg-panel-2 px-2.5 py-1.5">
                    <span className="truncate font-semibold">{i.player}</span>
                    <span className="shrink-0 text-xs text-dim">{i.reason}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-dim">Потерь нет</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
