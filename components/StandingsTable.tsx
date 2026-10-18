import { Fragment } from 'react'
import type { Standings } from '@/lib/types'
import { TeamLogo } from './TeamLogo'
import { ZoneRank } from './ZoneRank'

/**
 * Зоны — оттенками белого, вылет — красным (владелец: «а турнирная таблица как?»): оранжевая «Лига Европы» спорила
 * с янтарём «кэф упал», зелёные «Лига конференций» и «Повышение» — светофор, которого на сайте нет. Вылет красным —
 * так принято во всём футболе, а тонкую черту у номера с «идёт» не спутать.
 */
const ZONE: Record<string, string> = {
  'Лига чемпионов': 'bg-white/85',
  'Лига Европы': 'bg-white/50',
  'Лига конференций': 'bg-white/25',
  'Плей-офф': 'bg-white/50',
  Повышение: 'bg-white/85',
  'Зона вылета': 'bg-loss',
}

/**
 * Таблица турнира. compact (страница матча) — только строки вокруг команд матча (±1: владелец — «может оставить 1
 * сверху команду одну снизу чтоб блок не такой длинный был?»), пропуски — строкой «···»: без неё
 * номера прыгали с 4 на 17, а таблица выглядела сплошной. На телефоне — «#», команда, «И», «М», «О» без прокрутки вбок
 * (очки уезжали за край), «В / Н / П» — от sm; номер — колонкой под две цифры, по правому краю («15» налезало на эмблему).
 */
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
        let shown = g.rows.map((r, i) => ({ r, i }))
        if (compact && g.rows.length > 10 && highlight.length) {
          const idx = g.rows.map((r, i) => (highlight.includes(r.teamId) ? i : -1)).filter((i) => i >= 0)
          const keep = new Set<number>()
          for (const i of idx) for (let k = i - 1; k <= i + 1; k++) if (k >= 0 && k < g.rows.length) keep.add(k)
          shown = shown.filter(({ i }) => keep.has(i))
        }
        shown.forEach(({ r }) => r.zone && zones.add(r.zone))
        const last = g.rows.length - 1
        const gap = (key: string) => (
          <tr key={key} className="border-t border-edge" aria-hidden>
            <td colSpan={8} className="py-0.5 text-center text-[13px] leading-none tracking-[0.3em] text-mute">
              ···
            </td>
          </tr>
        )
        if (compact)
          // на странице матча — словами и без легенды (владелец: «блок турнирная таблица тоже какойто не очень» — «да»):
          // «Игры · Разница · Очки» вместо «И · М · О» и «36:13», зона — цветом кружка с местом (`ZoneRank`, что за зона —
          // по нажатию) вместо полоски у края и легенды под таблицей; цифры — по правому краю, команды матча — жирным; на телефоне без «Игр» — иначе «Барс…»
          return (
            <div key={gi}>
              {g.name && standings.groups.length > 1 ? <h3 className="mb-2 text-[13px] font-medium text-dim">{g.name}</h3> : null}
              <div className="grid grid-cols-[28px_minmax(0,1fr)_60px_40px] items-center gap-x-2 pb-2 text-[13px] text-mute sm:grid-cols-[28px_minmax(0,1fr)_64px_72px_56px]">
                <span className="text-center">#</span>
                <span>Команда</span>
                <span className="text-right max-sm:hidden">Игры</span>
                <span className="text-right">Разница</span>
                <span className="text-right">Очки</span>
              </div>
              {shown.length && shown[0].i > 0 ? <Dots /> : null}
              {shown.map(({ r, i }, k) => {
                const hl = highlight.includes(r.teamId)
                const prev = k ? shown[k - 1].i : i
                const diff = r.goalsFor - r.goalsAgainst
                return (
                  <Fragment key={r.teamId}>
                    {i - prev > 1 ? <Dots /> : null}
                    <div
                      title={`Мячи ${r.goalsFor}:${r.goalsAgainst}`}
                      className={`-mx-2 grid min-h-11 grid-cols-[28px_minmax(0,1fr)_60px_40px] items-center gap-x-2 border-t border-edge px-2 text-[15px] sm:grid-cols-[28px_minmax(0,1fr)_64px_72px_56px] ${hl ? 'bg-white/[0.05]' : ''}`}
                    >
                      <span className="flex justify-center">
                        <ZoneRank rank={r.rank} zone={r.zone} />
                      </span>
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="shrink-0">
                          <TeamLogo name={r.team} src={r.logo} size={20} />
                        </span>
                        <span className={`line-clamp-2 break-words leading-tight ${hl ? 'font-semibold text-fg' : 'text-fg/90'}`}>{r.team}</span>
                      </span>
                      <span className="num text-right text-dim max-sm:hidden">{r.played}</span>
                      <span className="num text-right text-dim">{diff > 0 ? `+${diff}` : diff < 0 ? `−${-diff}` : '0'}</span>
                      <span className="num text-right font-semibold">{r.points}</span>
                    </div>
                  </Fragment>
                )
              })}
              {shown.length && shown[shown.length - 1].i < last ? <Dots /> : null}
            </div>
          )
        return (
          <div key={gi}>
            {g.name && standings.groups.length > 1 ? <h3 className="mb-2 text-[13px] font-medium text-dim">{g.name}</h3> : null}
            <div className="-mx-4 sm:mx-0">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-[13px] font-medium text-mute">
                    <th className="w-11 py-1.5 pl-4 pr-2 text-right sm:w-9 sm:pl-1">#</th>
                    <th className="py-1.5 text-left">Команда</th>
                    <th className="w-8 py-1.5 text-center" title="Игры">И</th>
                    <th className="hidden w-8 py-1.5 text-center sm:table-cell" title="Победы">В</th>
                    <th className="hidden w-8 py-1.5 text-center sm:table-cell" title="Ничьи">Н</th>
                    <th className="hidden w-8 py-1.5 text-center sm:table-cell" title="Поражения">П</th>
                    <th className="w-14 py-1.5 text-center" title="Мячи">М</th>
                    <th className="w-10 py-1.5 pr-4 text-center sm:pr-1" title="Очки">О</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.length && shown[0].i > 0 ? gap('top') : null}
                  {shown.map(({ r, i }, k) => {
                    const hl = highlight.includes(r.teamId)
                    const prev = k ? shown[k - 1].i : i
                    return (
                      <Fragment key={r.teamId}>
                        {i - prev > 1 ? gap(`gap-${i}`) : null}
                        <tr className={`border-t border-edge ${hl ? 'bg-white/[0.04]' : ''}`}>
                          <td className="relative py-2 pl-4 pr-2 text-right sm:pl-1">
                            {r.zone && ZONE[r.zone] ? <span className={`absolute left-0 top-1 bottom-1 w-[3px] rounded-full ${ZONE[r.zone]}`} /> : null}
                            <span className="num font-medium text-mute">{r.rank}</span>
                          </td>
                          <td className="py-2">
                            <span className="flex min-w-0 items-center gap-2">
                              <TeamLogo name={r.team} src={r.logo} size={18} />
                              <span className={`truncate ${hl ? 'font-semibold text-fg' : 'text-fg/90'}`}>{r.team}</span>
                            </span>
                          </td>
                          <td className="num py-2 text-center text-dim">{r.played}</td>
                          <td className="num hidden py-2 text-center sm:table-cell">{r.wins}</td>
                          <td className="num hidden py-2 text-center sm:table-cell">{r.draws}</td>
                          <td className="num hidden py-2 text-center sm:table-cell">{r.losses}</td>
                          <td className="num py-2 text-center text-dim">
                            {r.goalsFor}:{r.goalsAgainst}
                          </td>
                          <td className="num py-2 pr-4 text-center font-semibold sm:pr-1">{r.points}</td>
                        </tr>
                      </Fragment>
                    )
                  })}
                  {shown.length && shown[shown.length - 1].i < last ? gap('bottom') : null}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
      {/* легенда — только у полной таблицы (страница лиги); на странице матча зона — цветом кружка с местом */}
      {!compact && [...zones].filter((z) => ZONE[z]).length ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-dim">
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

/** Пропуск в куске таблицы — строкой «···» (номера иначе прыгали с 4 на 17). */
function Dots() {
  return (
    <div aria-hidden className="border-t border-edge py-0.5 text-center text-[13px] leading-none tracking-[0.3em] text-mute">
      ···
    </div>
  )
}
