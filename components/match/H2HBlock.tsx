import { formatDateShort } from '@/lib/format'
import type { H2H } from '@/lib/stats'
import type { Team } from '@/lib/types'

/**
 * Личные встречи (владелец: «а личные встречи как?»): от трёх встреч — счёт побед, полоса и голы счётом «в 5 из 6»
 * (проценты на шести матчах звучали точнее, чем есть); меньше трёх — только сами встречи: «0 / 0 / 1», полоса во всю
 * ширину и «3 гола и больше — 100%» по одному матчу выглядели статистикой, которой нет. Полоса — без цветов команд, по
 * правилу статистики матча: у кого больше побед, та часть ярче, ничьи — серые.
 */
export function H2HBlock({ h2h, home, away }: { h2h: H2H; home: Team; away: Team }) {
  const n = h2h.games.length
  const tone = (a: number, b: number) => (a > b ? 'bg-white/85' : a < b ? 'bg-white/30' : 'bg-white/50')
  const seg = [
    { key: 'home', v: h2h.homeWins, label: `Победы: ${home.name}`, cls: tone(h2h.homeWins, h2h.awayWins) },
    { key: 'draw', v: h2h.draws, label: 'Ничьи', cls: 'bg-white/[0.14]' },
    { key: 'away', v: h2h.awayWins, label: `Победы: ${away.name}`, cls: tone(h2h.awayWins, h2h.homeWins) },
  ]
  const of = (rate: number) => `${Math.round(rate * n)} из ${n}`
  return (
    <div>
      {n >= 3 ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            {seg.map((s, i) => (
              <div key={s.key} className={`min-w-0 ${i === 1 ? 'text-center' : i === 2 ? 'text-right' : ''}`}>
                <div className="num text-[22px] font-semibold leading-none tracking-tight">{s.v}</div>
                <div className="mt-1 truncate text-[13px] text-dim">{s.label}</div>
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
            В среднем {h2h.avgGoals.toFixed(1)} гола; 3 гола и больше — в {of(h2h.over25Rate)}, обе забивали — в {of(h2h.bttsRate)}.
          </p>
        </>
      ) : null}
      <ul className={`divide-y divide-edge text-[13px] ${n >= 3 ? 'mt-3 -mb-1.5' : '-my-1.5'}`}>
        {h2h.games.map((g) => (
          <li key={g.id} className="flex min-h-12 items-center gap-2 py-1.5">
            <span className="num w-[80px] shrink-0 text-[13px] text-mute">{formatDateShort(g.ts)}</span>
            <span className={`min-w-0 flex-1 break-words text-right text-[15px] leading-tight line-clamp-2 ${g.score.home > g.score.away ? 'font-medium' : 'text-dim'}`}>{g.home.name}</span>
            <span className="num shrink-0 rounded-full bg-white/[0.06] px-2.5 py-0.5 font-semibold">
              {g.score.home}:{g.score.away}
            </span>
            <span className={`min-w-0 flex-1 break-words text-[15px] leading-tight line-clamp-2 ${g.score.away > g.score.home ? 'font-medium' : 'text-dim'}`}>{g.away.name}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
