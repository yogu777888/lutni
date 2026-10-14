import type { MatchEvent, StatPair } from '@/lib/types'
import { visibleStats } from '@/lib/sstats/normalize'

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

const minuteText = (e: MatchEvent) => `${e.minute}${e.extra ? `+${e.extra}` : ''}′`

function Mark({ e }: { e: Flow }) {
  if (GOALS.has(e.kind))
    return (
      <span className="grid h-5 w-5 place-items-center rounded-full bg-fg text-ink">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
          <circle cx="12" cy="12" r="5" />
        </svg>
      </span>
    )
  if (e.kind === 'red') return <span className="block h-4 w-3 rounded-xs bg-[#ff4d4f]" />
  if (e.kind === 'yellow') return <span className="block h-4 w-3 rounded-xs bg-[#f5c518]" />
  return <span className="grid h-5 w-5 place-items-center rounded-full bg-white/15 text-[11px] text-dim">✕</span>
}

/**
 * Ход матча (владелец: «сейчас в матче как тебе?», согласился): полоса 0′–90′ во всю ширину — сверху события хозяев,
 * снизу гостей (голы — белые точки, карточки — цветом карточки), при наведении — минута, игрок и счёт; под полосой —
 * голы строкой со счётом после каждого («17′ 1:0 B. Petrov»), чтобы история матча читалась и без наведения
 * (на телефоне наведения нет). Раньше события стояли списком в левой половине — при трёх событиях она пустовала.
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
  const x = (e: { minute: number; extra?: number | null }) => `${Math.min(100, ((e.minute + (e.extra ?? 0)) / end) * 100)}%`
  const goals = flow.filter((e) => GOALS.has(e.kind))
  const tip = (e: Flow) =>
    `${minuteText(e)} · ${e.side === 'home' ? home : away}: ${e.player || '—'}${e.score ? ` — ${e.score}` : ''}${
      e.kind === 'penalty' ? ' (пенальти)' : e.kind === 'own-goal' ? ' (автогол)' : e.kind === 'missed-penalty' ? ' (незабитый пенальти)' : ''
    }${e.kind === 'yellow' ? ' (жёлтая)' : e.kind === 'red' ? ' (красная)' : ''}`
  return (
    <div>
      {/* полоса матча: хозяева сверху, гости снизу; слева — чьи это ряды */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4">
        <div className="flex h-[76px] max-w-[96px] flex-col justify-between py-1.5 text-[12px] leading-tight text-dim sm:max-w-[140px]">
          <span className="truncate">{home}</span>
          <span className="truncate">{away}</span>
        </div>
        <div className="relative h-[76px]" aria-label="Ход матча по минутам">
          <span className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 rounded-full bg-white/10" />
          <span
            className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-white/35"
            style={{ width: now == null ? '100%' : x({ minute: now }) }}
          />
          <span className="absolute left-1/2 top-1/2 h-2.5 w-px -translate-y-1/2 bg-white/25" title="Перерыв" />
          {now != null ? (
            <span className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-live" style={{ left: x({ minute: now }) }} />
          ) : null}
          {flow.map((e, i) => (
            <span key={i} title={tip(e)} className={`group absolute -translate-x-1/2 ${e.side === 'home' ? 'top-1' : 'bottom-1'}`} style={{ left: x(e) }}>
              <Mark e={e} />
            </span>
          ))}
          <span className="absolute -bottom-4 left-0 text-[11px] text-mute">0′</span>
          <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[11px] text-mute">45′</span>
          <span className="absolute -bottom-4 right-0 text-[11px] text-mute">{end}′</span>
        </div>
      </div>

      {goals.length ? (
        <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-[14px]">
          {goals.map((e, i) => (
            <li key={i} className="flex items-baseline gap-2">
              <span className="num text-[12px] text-mute">{minuteText(e)}</span>
              {e.score ? <b className="num font-semibold text-fg">{e.score}</b> : null}
              <span className="text-fg/85">
                {e.player || '—'}
                {e.kind === 'penalty' ? <span className="text-mute"> · пенальти</span> : null}
                {e.kind === 'own-goal' ? <span className="text-mute"> · автогол</span> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-7 text-[13px] text-mute">Голов пока нет.</p>
      )}
    </div>
  )
}

/**
 * Статистика по ходу матча — без цветов команд, как у Apple Sports: у каждой строки светлее та сторона, где больше
 * (лаймом были хозяева, а лайм у нас — «выгодно»). Две колонки строк — блок вдвое ниже.
 */
export function StatsBars({ stats: all }: { stats: StatPair[] }) {
  const stats = visibleStats(all)
  if (!stats.length) return <p className="text-sm text-dim">Статистика появится по ходу матча.</p>
  return (
    <ul className="grid gap-x-10 gap-y-3 md:grid-cols-2">
      {stats.map((s) => {
        const total = s.home + s.away || 1
        const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2))
        const bar = (more: boolean, eq: boolean) => (eq ? 'bg-white/45' : more ? 'bg-white/85' : 'bg-white/20')
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
              <div className="flex flex-1 justify-end overflow-hidden rounded-l-full bg-white/[0.06]">
                <div className={`h-full rounded-l-full ${bar(s.home > s.away, eq)}`} style={{ width: `${(s.home / total) * 100}%` }} />
              </div>
              <div className="flex-1 overflow-hidden rounded-r-full bg-white/[0.06]">
                <div className={`h-full rounded-r-full ${bar(s.away > s.home, eq)}`} style={{ width: `${(s.away / total) * 100}%` }} />
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
