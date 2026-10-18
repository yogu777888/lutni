import type { MatchEvent, StatPair } from '@/lib/types'
import { visibleStats } from '@/lib/sstats/normalize'
import { Hint } from './Hint'
import { TeamLogo } from '../TeamLogo'
import { NavIcon } from '../NavIcon'

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
 * События матча — списком, как «Ход игры» в Apple Sports (владелец: «все равно он некрасивый и недоделанный какой-то? эппл
 * бы так не сделал»; была полоса 0′–90′ с плашками — диаграмма, а не табло): строка — минута по центру, событие хозяев
 * слева, гостей справа; гол — мяч, игрок и счёт после гола, красная — карточка и игрок; между таймами — черта «Перерыв».
 * Жёлтые не показываем — их число в статистике ниже; замены и VAR — тоже нет.
 */
export function EventsBlock({
  events,
  score,
  now,
}: {
  events: MatchEvent[]
  score: { home: number; away: number } | null
  /** минута идущего матча; null — матч окончен */
  now: number | null
  home?: Side
  away?: Side
}) {
  const shown = events.filter((e) => e.kind !== 'sub' && e.kind !== 'other' && e.kind !== 'var')
  const flow = withScore(shown, now == null ? score : null).filter((e) => GOALS.has(e.kind) || e.kind === 'red' || e.kind === 'missed-penalty')
  if (!flow.length) return null
  // сторона гола — по изменению счёта (так учтён и автогол), как в `scorers`
  let h = 0
  const rows = flow.map((e) => {
    let side = e.side
    if (GOALS.has(e.kind) && e.score) {
      const nh = Number(e.score.split(':')[0])
      side = nh > h ? 'home' : 'away'
      h = nh
    }
    return { e, side }
  })
  const firstSecond = rows.findIndex((r) => r.e.minute > 45)
  const icon = (e: Flow) =>
    GOALS.has(e.kind) ? (
      // мяч — тот же значок, что «Матчи» в нижнем меню (Phosphor)
      <NavIcon href="/" on size={18} className="shrink-0 text-fg" />
    ) : e.kind === 'red' ? (
      <span aria-hidden className="h-4 w-3 shrink-0 rounded-[2px] bg-[#ff453a]" />
    ) : (
      <span aria-hidden className="h-4 w-4 shrink-0 rounded-full ring-[1.5px] ring-inset ring-mute" />
    )
  const label = (e: Flow) =>
    e.kind === 'own-goal' ? 'автогол' : e.kind === 'penalty' ? 'пенальти' : e.kind === 'missed-penalty' ? 'незабитый пенальти' : e.kind === 'red' ? 'удаление' : null
  const cell = (e: Flow, right: boolean) => (
    <div className={`flex min-w-0 items-center gap-2 ${right ? 'justify-start' : 'flex-row-reverse justify-start text-right'}`}>
      {icon(e)}
      <div className="min-w-0">
        <div className="truncate text-[15px] font-medium leading-tight">{e.player || (GOALS.has(e.kind) ? 'Гол' : 'Карточка')}</div>
        {label(e) || e.score ? (
          <div className="text-[13px] leading-tight text-dim">{[e.score, label(e)].filter(Boolean).join(' · ')}</div>
        ) : null}
      </div>
    </div>
  )
  return (
    <ul className="mx-auto -my-1 max-w-xl">
      {rows.map(({ e, side }, i) => (
        <li key={i}>
          {i === firstSecond && firstSecond > 0 ? (
            <div className="my-1.5 flex items-center gap-3 text-[12px] text-mute">
              <span className="h-px flex-1 bg-edge" />
              Перерыв
              <span className="h-px flex-1 bg-edge" />
            </div>
          ) : null}
          <div className="grid min-h-11 grid-cols-[minmax(0,1fr)_3.25rem_minmax(0,1fr)] items-center gap-2 py-1">
            <div>{side === 'home' ? cell(e, false) : null}</div>
            <div className="num text-center text-[13px] font-semibold text-dim">{minuteText(e)}</div>
            <div>{side === 'away' ? cell(e, true) : null}</div>
          </div>
        </li>
      ))}
    </ul>
  )
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
  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2))
  // без полос, как «Статистика команд» в Apple Sports (владелец: «эппл бы так не сделал»): у кого больше — цифра в белой
  // пилюле, у другого — серым; равные — обе белым текстом без пилюли
  const val = (v: number, other: number, suffix = '') =>
    v > other ? (
      <span className="num inline-flex h-7 min-w-11 items-center justify-center rounded-full bg-white px-2.5 text-[15px] font-semibold text-ink">
        {fmt(v)}
        {suffix}
      </span>
    ) : (
      <span className={`num inline-flex h-7 min-w-11 items-center justify-center px-2.5 text-[15px] ${v === other ? 'font-semibold text-fg' : 'text-dim'}`}>
        {fmt(v)}
        {suffix}
      </span>
    )
  return (
    // одной колонкой по центру (в две колонки на компьютере путалось, чьи цифры где)
    <div className="mx-auto max-w-xl">
      {/* чьи цифры — эмблемами над колонками */}
      <div className="mb-1 flex items-center justify-between px-1.5">
        <TeamLogo name={home.name} src={home.logo ?? null} size={26} />
        <span className="text-[13px] text-mute">Статистика</span>
        <TeamLogo name={away.name} src={away.logo ?? null} size={26} />
      </div>
      <ul>
        {stats.map((s) => (
          <li key={s.key} className="grid min-h-10 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
            {val(s.home, s.away, s.suffix)}
            <span className="truncate text-center text-[14px] text-dim">
              {s.label}
              {HINT[s.key] ? <Hint title={s.label} text={HINT[s.key]} /> : null}
            </span>
            {val(s.away, s.home, s.suffix)}
          </li>
        ))}
      </ul>
    </div>
  )
}
