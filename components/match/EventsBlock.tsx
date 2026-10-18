import type { MatchEvent, StatPair } from '@/lib/types'
import { visibleStats } from '@/lib/sstats/normalize'
import { Hint } from './Hint'
import { Timeline, type TimelineMark } from './Timeline'
import { TeamLogo } from '../TeamLogo'

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
  // на полосе — голы и красные (владелец: «блок сейчас в матче некрасивый очень и длинный» — жёлтые громоздились столбиком
  // над голами; их число — в «Вся статистика»); счёт после гола считаем по всем голам
  const shown = events.filter((e) => e.kind !== 'sub' && e.kind !== 'other' && e.kind !== 'var')
  const flow = withScore(shown, now == null ? score : null).filter((e) => GOALS.has(e.kind) || e.kind === 'red')
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

/** Ключевые строки под владением — видны сразу; остальные — под «Вся статистика». */
const KEY = ['totalShots', 'shotsOnGoal', 'bigChances', 'expectedGoals', 'cornerKicks']

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
  // владение — главной строкой; ниже четыре ключевые; остальное — под «Вся статистика» (владелец: «блок сейчас в матче
  // некрасивый очень и длинный» — восемь одинаковых строк «ёлочкой», офсайды наравне с ударами)
  const poss = stats.find((s) => s.key === 'ballPossession')
  const rest = stats.filter((s) => s !== poss)
  const key = rest.filter((s) => KEY.includes(s.key)).slice(0, 4)
  const more = rest.filter((s) => !key.includes(s))
  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2))
  const bar = (more: boolean, eq: boolean) => (eq ? 'bg-white/45' : more ? 'bg-white/85' : 'bg-white/30')
  const row = (s: StatPair) => {
    const total = s.home + s.away || 1
    const eq = s.home === s.away
    return (
      <li key={s.key}>
        <div className="flex items-baseline justify-between gap-3 text-[14px]">
          <span className={`num ${s.home > s.away ? 'font-semibold text-fg' : 'text-dim'}`}>
            {fmt(s.home)}
            {s.suffix ?? ''}
          </span>
          <span className="truncate text-[13px] text-mute">
            {s.label}
            {HINT[s.key] ? <Hint title={s.label} text={HINT[s.key]} /> : null}
          </span>
          <span className={`num ${s.away > s.home ? 'font-semibold text-fg' : 'text-dim'}`}>
            {fmt(s.away)}
            {s.suffix ?? ''}
          </span>
        </div>
        <div className="mt-1.5 flex h-1 gap-0.5">
          <div className="flex flex-1 justify-end overflow-hidden rounded-l-full bg-white/[0.08]">
            <div className={`h-full rounded-l-full ${bar(s.home > s.away, eq)}`} style={{ width: `${(s.home / total) * 100}%` }} />
          </div>
          <div className="flex-1 overflow-hidden rounded-r-full bg-white/[0.08]">
            <div className={`h-full rounded-r-full ${bar(s.away > s.home, eq)}`} style={{ width: `${(s.away / total) * 100}%` }} />
          </div>
        </div>
      </li>
    )
  }
  return (
    <div>
      {/* владение — крупно, с эмблемами по краям: заодно задаёт, чьи цифры слева и справа (строка названий не нужна) */}
      {poss ? (
        <div>
          <div className="flex items-center gap-2.5">
            <TeamLogo name={home.name} src={home.logo ?? null} size={24} />
            <span className={`num text-[22px] font-bold tracking-[-0.02em] ${poss.home >= poss.away ? 'text-fg' : 'text-dim'}`}>{poss.home}%</span>
            {/* «Владение», без «мячом»: на 360px подпись переносилась в две строки */}
            <span className="flex-1 text-center text-[13px] text-mute">Владение</span>
            <span className={`num text-[22px] font-bold tracking-[-0.02em] ${poss.away >= poss.home ? 'text-fg' : 'text-dim'}`}>{poss.away}%</span>
            <TeamLogo name={away.name} src={away.logo ?? null} size={24} />
          </div>
          <div className="mt-2.5 flex h-2 gap-0.5" aria-hidden>
            <div className={`h-full rounded-l-full ${bar(poss.home > poss.away, poss.home === poss.away)}`} style={{ width: `${poss.home}%` }} />
            <div className={`h-full flex-1 rounded-r-full ${bar(poss.away > poss.home, poss.home === poss.away)}`} />
          </div>
        </div>
      ) : (
        <div className="flex justify-between gap-3 text-[13px] text-dim">
          <span className="flex items-center gap-2"><TeamLogo name={home.name} src={home.logo ?? null} size={20} />{home.name}</span>
          <span className="flex items-center gap-2">{away.name}<TeamLogo name={away.name} src={away.logo ?? null} size={20} /></span>
        </div>
      )}
      <ul className="mt-5 grid gap-x-10 gap-y-4 md:grid-cols-2">{key.map(row)}</ul>
      {more.length ? (
        <details className="group mt-4 border-t border-edge">
          <summary className="flex h-11 list-none items-center justify-between text-[14px] font-medium text-dim transition-colors hover:text-fg [&::-webkit-details-marker]:hidden">
            Вся статистика
            <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>
          <ul className="grid gap-x-10 gap-y-4 pb-1 pt-1 md:grid-cols-2">{more.map(row)}</ul>
        </details>
      ) : null}
    </div>
  )
}
