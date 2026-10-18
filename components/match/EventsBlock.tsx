import type { MatchEvent, StatPair } from '@/lib/types'
import { visibleStats } from '@/lib/sstats/normalize'
import { Hint } from './Hint'
import { Timeline, type TimelineMark } from './Timeline'

type Side = { name: string; logo?: string | null }

const GOALS = new Set<MatchEvent['kind']>(['goal', 'own-goal', 'penalty'])

/** Подсказки к непонятным строкам статистики (xG словами — владелец: на странице жаргон убрали). */
const HINT: Record<string, string> = {
  expectedGoals: 'Сколько голов обычно забивают с таких моментов: чем больше, тем опаснее атаки. Например, 1.33 — в среднем чуть больше гола.',
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
  home: Side
  away: Side
}) {
  const shown = events.filter((e) => e.kind !== 'sub' && e.kind !== 'other' && e.kind !== 'var')
  const flow = withScore(shown, now == null ? score : null)
  const end = Math.max(90, ...shown.map((e) => e.minute + (e.extra ?? 0)), now ?? 0)
  // подсказка значка: сверху — минута и что случилось, ниже — игрок и команда (у автогола — только игрок: поставщики
  // пишут его то за команду игрока, то за получившую гол; чей он — видно по ряду, где стоит плашка)
  const what = (e: Flow) => {
    const sc = e.score ? ` ${e.score}` : ''
    if (e.kind === 'goal') return `Гол${sc}`
    if (e.kind === 'penalty') return `Гол с пенальти${sc}`
    if (e.kind === 'own-goal') return `Автогол${sc}`
    if (e.kind === 'missed-penalty') return 'Незабитый пенальти'
    return e.kind === 'red' ? 'Красная карточка' : 'Жёлтая карточка'
  }
  const who = (e: Flow) => [e.player, e.kind === 'own-goal' ? '' : e.side === 'home' ? home.name : away.name].filter(Boolean).join(' · ')
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
      head: `${minuteText(e)} · ${what(e)}`,
      sub: who(e),
    }
  })
  return <Timeline marks={marks} end={end} now={now} home={home} away={away} />
}

/**
 * Строки, которые на странице не показываем: «Передачи 325 : 266» новичку ничего не говорят (в сторис — свой отбор),
 * «Сейвы» — почти то же, что удары соперника в створ минус голы (на настоящих матчах строк было 11, на телефоне блок — ~700px).
 */
const HIDE = new Set(['totalPasses', 'goalkeeperSaves'])

/**
 * Порядок строк: сначала понятное — кто давит (владение, удары, в створ, голевые моменты), «Качество моментов» (дробь
 * с ⓘ) — после них, дальше угловые, фолы, карточки, офсайды. От md это и есть две колонки: игра / стандарты и карточки.
 */
const ORDER = ['ballPossession', 'totalShots', 'shotsOnGoal', 'bigChances', 'expectedGoals', 'dangerousAttacks', 'cornerKicks', 'fouls', 'yellowCards', 'redCards', 'offsides']
const rank = (key: string) => (ORDER.includes(key) ? ORDER.indexOf(key) : ORDER.length)

/**
 * Статистика по ходу матча — без цветов команд, как у Apple Sports: у каждой строки светлее та сторона, где больше
 * (лаймом были хозяева, а лайм у нас — «выгодно»). Дорожка под полосой видна (была 6% — полосы разной длины висели
 * посередине «ёлочкой»): каждая строка — полоса от края до края, цифры — на её концах.
 *
 * Чьи цифры — названиями над колонкой (владелец: «немного непонятно в графиках, где какая команда»): слева хозяева,
 * справа гости; мелко и серым, как подпись столбца, без эмблем (владелец: «а сейчас не много логотипов?» — с эмблемами
 * в шапках и у полосы на экране их было 10; эмблемы — на табло и в панели сверху). Колонок от md две — первая и вторая половина строк (удары и моменты / угловые, фолы,
 * карточки), шапка над каждой и черта между ними: иначе «45%» гостей в одной колонке и «1.33» хозяев в другой стояли
 * рядом и читались парой. На телефоне колонка одна — и шапка одна, порядок строк тот же.
 */
export function StatsBars({ stats: all, home, away }: { stats: StatPair[]; home: Side; away: Side }) {
  const stats = visibleStats(all)
    .filter((s) => !HIDE.has(s.key))
    .sort((a, b) => rank(a.key) - rank(b.key))
  if (!stats.length) return <p className="text-sm text-dim">Статистика появится по ходу матча.</p>
  const half = Math.ceil(stats.length / 2)
  const cols = [stats.slice(0, half), stats.slice(half)].filter((c) => c.length)
  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2))
  const bar = (more: boolean, eq: boolean) => (eq ? 'bg-white/45' : more ? 'bg-white/85' : 'bg-white/30')
  return (
    <div className="grid grid-cols-1 gap-y-3 md:grid-cols-2">
      {cols.map((col, ci) => (
        <div key={ci} className={ci ? 'md:border-l md:border-white/[0.08] md:pl-10' : cols.length > 1 ? 'md:pr-10' : ''}>
          {/* на телефоне вторая колонка идёт сразу под первой — шапка у неё не нужна */}
          <div className={`mb-2.5 justify-between gap-3 text-[13px] text-dim ${ci ? 'hidden md:flex' : 'flex'}`}>
            <span className="min-w-0 truncate">{home.name}</span>
            <span className="min-w-0 truncate text-right">{away.name}</span>
          </div>
          <ul className="space-y-3">
            {col.map((s) => {
              const total = s.home + s.away || 1
              const eq = s.home === s.away
              return (
                <li key={s.key} className="relative">
                  <div className="mb-1 flex justify-between text-[13px]">
                    <span className={`num ${s.home > s.away ? 'font-semibold text-fg' : 'text-dim'}`}>
                      {fmt(s.home)}
                      {s.suffix ?? ''}
                    </span>
                    <span className="text-[13px] text-mute">
                      {s.label}
                      {HINT[s.key] ? <Hint title={s.label} text={HINT[s.key]} /> : null}
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
        </div>
      ))}
    </div>
  )
}
