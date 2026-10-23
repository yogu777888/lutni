import { minuteLabel, type MomentumPoint } from '@/lib/sstats/ls'
import type { MatchEvent } from '@/lib/types'

type Side = { name: string }

/**
 * «Кто давил» — давление по минутам из `/Ls/GameMomentum` (владелец: «сделай всё»): столбик вверх — атакуют хозяева,
 * вниз — гости, цветом клуба (`ClubVars` → `.club-bar-h/-a`; цветов нет — белые). Таймы — двумя частями с зазором,
 * у каждой ширина по числу минут; голы — точкой у края столбика своей минуты. Подписи осей — 0′, 45′, 90′ под чертой.
 */
export function Momentum({ points, events, home, away }: { points: MomentumPoint[]; events: MatchEvent[]; home: Side; away: Side }) {
  const parts = ([1, 2, 3] as const).map((p) => points.filter((x) => x.part === p)).filter((x) => x.length)
  // гол — к столбику его минуты (в добавленное время первого тайма — к последним минутам первой части)
  const goalAt = new Map<string, 'home' | 'away'>()
  for (const e of events) {
    if (e.kind !== 'goal' && e.kind !== 'penalty' && e.kind !== 'own-goal') continue
    const minute = e.minute + (e.extra ?? 0)
    const part = e.minute <= 45 ? 1 : e.minute <= 90 ? 2 : 3
    goalAt.set(`${part}:${minute}`, e.side)
  }
  const lead = (x: MomentumPoint) => (x.v > 0.05 ? `давят «${home.name}»` : x.v < -0.05 ? `давят «${away.name}»` : 'равная игра')
  return (
    <div className="mx-auto max-w-xl">
      <div className="flex items-center justify-between gap-3 text-[13px] text-dim">
        <span className="flex min-w-0 items-center gap-2">
          <span className="club-bar-h h-2.5 w-2.5 shrink-0 rounded-full" aria-hidden />
          <span className="truncate">{home.name}</span>
        </span>
        <span className="shrink-0 font-semibold text-fg">Кто давил</span>
        <span className="flex min-w-0 items-center justify-end gap-2">
          <span className="truncate">{away.name}</span>
          <span className="club-bar-a h-2.5 w-2.5 shrink-0 rounded-full" aria-hidden />
        </span>
      </div>
      <div className="mt-3 flex gap-1.5" role="img" aria-label={`Давление по минутам: вверх — «${home.name}», вниз — «${away.name}»`}>
        {parts.map((pts, i) => (
          <div key={i} className="min-w-0" style={{ flex: pts.length }}>
            <div className="relative flex h-[112px] items-stretch gap-px">
              <span className="absolute inset-x-0 top-1/2 h-px bg-white/15" aria-hidden />
              {pts.map((x) => {
                const g = goalAt.get(`${x.part}:${x.minute}`)
                return (
                  <span key={x.minute} title={`${minuteLabel(x)} · ${lead(x)}${g ? ` · гол «${g === 'home' ? home.name : away.name}»` : ''}`} className="relative flex-1">
                    {x.v > 0 ? (
                      <span className="club-bar-h absolute inset-x-0 bottom-1/2 rounded-t-[2px]" style={{ height: `${Math.max(x.v * 50, 1.5)}%` }} />
                    ) : (
                      <span className="club-bar-a absolute inset-x-0 top-1/2 rounded-b-[2px]" style={{ height: `${Math.max(-x.v * 50, 1.5)}%` }} />
                    )}
                    {g ? (
                      <span
                        aria-hidden
                        className={`absolute left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-fg ring-2 ring-panel ${g === 'home' ? 'top-0' : 'bottom-0'}`}
                      />
                    ) : null}
                  </span>
                )
              })}
            </div>
            {/* у первой части — «0′» и «45′», у следующих — только конец: «45′» дважды подряд читался ошибкой */}
            <div className="mt-1.5 flex justify-between text-[13px] text-mute">
              <span>{i === 0 ? '0′' : ''}</span>
              <span>{i === 0 ? '45′' : i === 1 ? '90′' : '120′'}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[13px] text-mute">Столбик вверх — атакуют хозяева, вниз — гости; точка — гол.</p>
    </div>
  )
}
