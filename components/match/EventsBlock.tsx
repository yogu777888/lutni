import type { MatchEvent, StatPair } from '@/lib/types'
import { visibleStats } from '@/lib/sstats/normalize'
import { Timeline, type TimelineMark } from './Timeline'

const GOALS = new Set<MatchEvent['kind']>(['goal', 'own-goal', 'penalty'])

/** Подсказки к непонятным строкам статистики (xG словами — владелец: на странице жаргон убрали). */
const HINT: Record<string, string> = {
  expectedGoals: 'Сколько голов обычно забивают с таких моментов: чем больше, тем опаснее атаки',
}

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
    const name = e.player
      ? `${e.player}${e.kind === 'own-goal' ? ' (авт.)' : e.kind === 'penalty' ? ' (пен.)' : ''}`
      : e.kind === 'own-goal' ? 'Автогол' : e.kind === 'penalty' ? 'Пенальти' : 'Гол'
    const list = out[side].get(name) ?? []
    list.push(minuteText(e))
    out[side].set(name, list)
  }
  const fmt = (m: Map<string, string[]>) => [...m].map(([n, mins]) => `${n} ${mins.join(', ')}`)
  return { home: fmt(out.home), away: fmt(out.away) }
}

const minuteText = (e: MatchEvent) => `${e.minute}${e.extra ? `+${e.extra}` : ''}′`

/**
 * Ход матча (владелец: «сейчас в матче как?», согласился): полоса 0′–90′ во всю ширину (`Timeline`) — хозяева над
 * чертой, гости под ней; гол — плашкой со счётом после него, карточки — цветом карточки, при наведении — минута,
 * игрок и счёт. Строки голов под полосой («16′ 1:0 B. Schmidt») больше нет: авторы и минуты — под названиями команд
 * на табло, счёт после гола — в плашке; так гол показан один раз, а не три.
 */
export function EventsBlock({
  events,
  score,
  now,
  home,
  away,
}: {
  events: MatchEvent[]
  score: { home: number; away: number } | null
  /** минута идущего матча (до неё — прошедшая часть полосы); null — матч окончен */
  now: number | null
  home: string
  away: string
}) {
  const shown = events.filter((e) => e.kind !== 'sub' && e.kind !== 'other' && e.kind !== 'var')
  const flow = withScore(shown, now == null ? score : null)
  const end = Math.max(90, ...shown.map((e) => e.minute + (e.extra ?? 0)), now ?? 0)
  const tip = (e: Flow) =>
    `${minuteText(e)} · ${e.side === 'home' ? home : away}: ${e.player || 'игрок не указан'}${e.score ? ` — ${e.score}` : ''}${
      e.kind === 'penalty' ? ' (пенальти)' : e.kind === 'own-goal' ? ' (автогол)' : e.kind === 'missed-penalty' ? ' (незабитый пенальти)' : ''
    }${e.kind === 'yellow' ? ' (жёлтая)' : e.kind === 'red' ? ' (красная)' : ''}`
  let h = 0
  const marks: TimelineMark[] = flow.map((e) => {
    const goal = GOALS.has(e.kind)
    // плашка гола — в ряду команды, которой он засчитан (автогол — по изменению счёта, как в `scorers`)
    let side = e.side
    if (goal && e.score) {
      const nh = Number(e.score.split(':')[0])
      side = nh > h ? 'home' : 'away'
      h = nh
    }
    return {
      kind: goal ? 'goal' : e.kind === 'yellow' ? 'yellow' : e.kind === 'red' ? 'red' : 'miss',
      side,
      at: e.minute + (e.extra ?? 0),
      label: goal ? e.score : null,
      tip: tip(e),
    }
  })
  return <Timeline marks={marks} end={end} now={now} home={home} away={away} />
}

/** Строки, которые на странице не показываем: «Передачи 325 : 266» новичку ничего не говорят (в сторис — свой отбор). */
const HIDE = new Set(['totalPasses'])

/**
 * Статистика по ходу матча — без цветов команд, как у Apple Sports: у каждой строки светлее та сторона, где больше
 * (лаймом были хозяева, а лайм у нас — «выгодно»). Две колонки строк — блок вдвое ниже. Дорожка под полосой видна
 * (была 6% — полосы разной длины висели посередине «ёлочкой», а цифры стояли в 200px от них): каждая строка — полоса
 * от края до края, цифры — на её концах.
 */
export function StatsBars({ stats: all }: { stats: StatPair[] }) {
  const stats = visibleStats(all).filter((s) => !HIDE.has(s.key))
  if (!stats.length) return <p className="text-sm text-dim">Статистика появится по ходу матча.</p>
  return (
    <ul className="grid gap-x-10 gap-y-3 md:grid-cols-2">
      {stats.map((s) => {
        const total = s.home + s.away || 1
        const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2))
        const bar = (more: boolean, eq: boolean) => (eq ? 'bg-white/45' : more ? 'bg-white/85' : 'bg-white/30')
        const eq = s.home === s.away
        return (
          <li key={s.key} title={HINT[s.key]}>
            <div className="mb-1 flex justify-between text-[13px]">
              <span className={`num ${s.home > s.away ? 'font-semibold text-fg' : 'text-dim'}`}>
                {fmt(s.home)}
                {s.suffix ?? ''}
              </span>
              <span className="text-xs text-mute">
                {s.label}
                {HINT[s.key] ? <span className="ml-1 text-mute/70">ⓘ</span> : null}
              </span>
              <span className={`num ${s.away > s.home ? 'font-semibold text-fg' : 'text-dim'}`}>
                {fmt(s.away)}
                {s.suffix ?? ''}
              </span>
            </div>
            <div className="flex h-1.5 gap-0.5">
              <div className="flex flex-1 justify-end overflow-hidden rounded-l-full bg-white/[0.09]">
                <div className={`h-full rounded-l-full ${bar(s.home > s.away, eq)}`} style={{ width: `${(s.home / total) * 100}%` }} />
              </div>
              <div className="flex-1 overflow-hidden rounded-r-full bg-white/[0.09]">
                <div className={`h-full rounded-r-full ${bar(s.away > s.home, eq)}`} style={{ width: `${(s.away / total) * 100}%` }} />
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
