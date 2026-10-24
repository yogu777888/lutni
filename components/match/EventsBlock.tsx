import type { LsRed } from '@/lib/sstats/ls'
import type { MatchEvent } from '@/lib/types'
import { TeamLogo } from '../TeamLogo'

type Side = { name: string; logo?: string | null }

const GOALS = new Set<MatchEvent['kind']>(['goal', 'own-goal', 'penalty'])

type Flow = MatchEvent & { score: string | null }

/**
 * Счёт после каждого гола. Автогол засчитываем по стороне события; если итог не сходится со счётом матча — пробуем
 * наоборот (поставщики пишут автогол то за команду игрока, то за получившую гол); не сходится и так — счёт не пишем.
 */
function withScore(events: MatchEvent[], final: { home: number; away: number } | null): Flow[] {
  const run = (flipOwn: boolean) => {
    let h = 0
    let a = 0
    const out = events.map((e) => {
      if (!GOALS.has(e.kind)) return { ...e, score: null }
      const home = e.kind === 'own-goal' && flipOwn ? e.side === 'away' : e.side === 'home'
      if (home) h++
      else a++
      return { ...e, score: `${h}:${a}` }
    })
    return { out, ok: !final || (h === final.home && a === final.away) }
  }
  const direct = run(false)
  if (direct.ok) return direct.out
  const flipped = run(true)
  if (flipped.ok) return flipped.out
  return events.map((e) => ({ ...e, score: null }))
}

/**
 * Авторы голов по командам для табло (как у Apple Sports — под названием команды): «Petrov 17′, 62′», автогол —
 * «Smith 40′ (авт.)» у команды, которой засчитан; сторона — так же, как в счёте после гола (`withScore`).
 */
export function scorers(events: MatchEvent[], final: { home: number; away: number } | null): { home: string[]; away: string[] } {
  const flow = withScore(events.filter((e) => GOALS.has(e.kind)), final)
  const out = { home: new Map<string, string[]>(), away: new Map<string, string[]>() }
  let h = 0
  for (const e of flow) {
    // сторона гола — по изменению счёта (так учтён и автогол); счёта нет — по стороне события
    let side: 'home' | 'away' = e.side
    if (e.score) {
      const nh = Number(e.score.split(':')[0])
      side = nh > h ? 'home' : 'away'
      h = nh
    }
    // автора нет в данных (бывает в низших лигах и MLS) — «Гол 20′», а не «— 20′»
    // только фамилия: «F. Wilson» → «Wilson» (инициалы латиницей ничего не говорят и съедают строку табло)
    const who = e.player ? e.player.replace(/^(?:\p{Lu}\.\s*)+/u, '') || e.player : null
    const name = who
      ? `${who}${e.kind === 'own-goal' ? ' (авт.)' : e.kind === 'penalty' ? ' (пен.)' : ''}`
      : e.kind === 'own-goal' ? 'Автогол' : e.kind === 'penalty' ? 'Пенальти' : 'Гол'
    const list = out[side].get(name) ?? []
    list.push(minuteText(e))
    out[side].set(name, list)
  }
  // по игроку, минуты через пробел: «Wilson 17′ 57′»
  const fmt = (m: Map<string, string[]>) => [...m].map(([n, mins]) => `${n} ${mins.join(' ')}`)
  return { home: fmt(out.home), away: fmt(out.away) }
}

const minuteText = (e: MatchEvent) => `${e.minute}${e.extra ? `+${e.extra}` : ''}′`

const short = (p: string | null) => (p ? p.replace(/^(?:\p{Lu}\.\s*)+/u, '') || p : null)

/**
 * «Ключевые события» (владелец прислал прототип ChatGPT — «Ключевые события», «да»): хронология строками — минута,
 * эмблема команды, что произошло и кто; у гола — счёт после него пилюлей справа и передача, у удаления — причина
 * из `/Ls/GameInfo` («за фол»). Голы, удаления, незабитые пенальти; жёлтых, замен и VAR нет (VAR в данных без слов —
 * «гол отменён» или «пенальти назначен», не понять). Между таймами — «Перерыв». На табло авторы голов — одной строкой с
 * «+2», здесь — все и по порядку.
 */
export function KeyEvents({ events, home, away, final, reds = [] }: { events: MatchEvent[]; home: Side; away: Side; final: { home: number; away: number } | null; reds?: LsRed[] }) {
  const keep = events.filter((e) => GOALS.has(e.kind) || e.kind === 'red' || e.kind === 'missed-penalty')
  if (!keep.length) return null
  const flow = withScore(keep, final)
  const why = (e: MatchEvent) => (e.kind === 'red' ? reds.find((r) => r.side === e.side && Math.abs(r.minute - e.minute) <= 1)?.reason : null)
  const what: Record<string, string> = { goal: 'Гол', 'own-goal': 'Автогол', penalty: 'Гол с пенальти', red: 'Удаление', 'missed-penalty': 'Незабитый пенальти' }
  const breakAt = flow.findIndex((e) => e.minute > 45)
  return (
    <ul className="-my-1">
      {flow.map((e, i) => {
        const team = e.side === 'home' ? home : away
        const who = short(e.player)
        const sub = GOALS.has(e.kind) ? (e.assist ? `передача — ${short(e.assist)}` : null) : why(e) ?? null
        return (
          <li key={i}>
            {i === breakAt && i > 0 ? (
              <div className="flex items-center gap-3 py-2 text-[13px] text-mute">
                <span className="h-px flex-1 bg-white/10" />
                Перерыв
                <span className="h-px flex-1 bg-white/10" />
              </div>
            ) : null}
            <div className="flex min-h-12 items-center gap-3 py-1.5">
              <span className="num w-10 shrink-0 text-[15px] font-semibold text-dim">{minuteText(e)}</span>
              <TeamLogo name={team.name} src={team.logo ?? null} size={20} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] leading-snug">
                  {e.kind === 'red' ? <span aria-hidden className="mr-1.5 inline-block h-3.5 w-2.5 translate-y-[2px] rounded-[2px] bg-[#ff453a]" /> : null}
                  <span className={GOALS.has(e.kind) ? 'font-semibold' : ''}>{what[e.kind]}</span>
                  {who ? <span className="text-dim"> · {who}</span> : null}
                </span>
                {sub ? <span className="block truncate text-[13px] text-mute">{sub}</span> : null}
              </span>
              {e.score ? <span className="num shrink-0 rounded-full bg-white/[0.08] px-2.5 py-0.5 text-[14px] font-semibold">{e.score}</span> : null}
              <span className="sr-only">{team.name}</span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
