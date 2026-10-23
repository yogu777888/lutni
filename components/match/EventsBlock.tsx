import type { LsRed } from '@/lib/sstats/ls'
import type { MatchEvent, StatPair } from '@/lib/types'
import { visibleStats } from '@/lib/sstats/normalize'
import { Hint } from './Hint'
import { XG_HINT } from './Xg'
import { TeamLogo } from '../TeamLogo'

type Side = { name: string; logo?: string | null }

const GOALS = new Set<MatchEvent['kind']>(['goal', 'own-goal', 'penalty'])

/** Подсказки к непонятным строкам статистики (xG словами — владелец: на странице жаргон убрали). */
const HINT: Record<string, string> = {
  expectedGoals: XG_HINT,
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

/**
 * Строки, которые на странице не показываем: «Передачи 325 : 266» новичку ничего не говорят (в сторис — свой отбор),
 * «Сейвы» — почти то же, что удары соперника в створ минус голы (на настоящих матчах строк было 11, на телефоне блок — ~700px).
 */
const HIDE = new Set(['totalPasses', 'goalkeeperSaves'])

/**
 * Порядок строк: сначала понятное — кто давит (владение, удары, в створ, голевые моменты), «Качество моментов» (дробь
 * с ⓘ) — после них, дальше угловые, фолы, карточки, офсайды. От md это и есть две колонки: игра / стандарты и карточки.
 */
// shotsInsideBox, hitWoodwork, passAccuracy — из `/Ls/GameInfo` (`lsStats` в lib/sstats/ls.ts)
const ORDER = ['ballPossession', 'totalShots', 'shotsOnGoal', 'shotsInsideBox', 'hitWoodwork', 'bigChances', 'expectedGoals', 'dangerousAttacks', 'passAccuracy', 'cornerKicks', 'fouls', 'yellowCards', 'redCards', 'offsides']
const rank = (key: string) => (ORDER.includes(key) ? ORDER.indexOf(key) : ORDER.length)

/**
 * Статистика по ходу матча — как «Статистика команд» в Apple Sports (владелец выбрал вариант «А» из трёх картинок):
 * сверху эмблема и название хозяев слева, гостей справа; строка — цифра хозяев слева, подпись по центру, гостей справа,
 * под ней полоса от центра: хозяева — влево, гости — вправо, цветами клубов (`ClubVars` → `--club-h` /
 * `--club-a`, тёмный цвет клуба высветлен до читаемого — `.club-bar` в app/globals.css; цветов ещё нет — белые). У кого
 * больше — цифра белым жирным и полоса яркой, у другого — серым и полоса бледнее; равные — обе яркие. Владение — первой
 * строкой крупнее. Были белые пилюли у лидера — столбик «кнопок» слева, серые цифры справа, блок выглядел перекошенным.
 */
export function StatsBars({ stats: all, home, away }: { stats: StatPair[]; home: Side; away: Side }) {
  const stats = visibleStats(all)
    .filter((s) => !HIDE.has(s.key))
    .sort((a, b) => rank(a.key) - rank(b.key))
  if (!stats.length) return <p className="text-sm text-dim">Статистика появится по ходу матча.</p>
  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2))
  const team = (t: Side, right: boolean) => (
    <span className={`flex min-w-0 items-center gap-2.5 ${right ? 'flex-row-reverse text-right' : ''}`}>
      <TeamLogo name={t.name} src={t.logo ?? null} size={28} />
      <span className="truncate text-[16px] font-semibold">{t.name}</span>
    </span>
  )
  return (
    <div>
      <div className="flex items-center justify-between gap-4 border-b border-edge pb-3.5">
        {team(home, false)}
        {team(away, true)}
      </div>
      <ul>
        {stats.map((s, i) => {
          const big = i === 0 && s.key === 'ballPossession'
          const sum = s.home + s.away || 1
          const lead = (v: number, o: number) => v >= o
          const num = (v: number, o: number) => (
            <span className={`num shrink-0 ${big ? 'text-[26px] leading-none' : 'text-[16px]'} ${lead(v, o) ? 'font-bold text-fg' : 'text-dim'}`}>
              {fmt(v)}
              {s.suffix}
            </span>
          )
          return (
            <li key={s.key} className={`${i ? 'border-t border-edge' : ''} ${big ? 'pb-3.5 pt-4' : 'py-3'}`}>
              <div className="flex items-baseline justify-between gap-3">
                {num(s.home, s.away)}
                <span className="min-w-0 truncate text-center text-[14px] text-dim">
                  {s.label}
                  {HINT[s.key] ? <Hint title={s.label} text={HINT[s.key]} /> : null}
                </span>
                {num(s.away, s.home)}
              </div>
              <div aria-hidden className={`mt-2 flex gap-1 ${big ? 'h-2' : 'h-1.5'}`}>
                <div className="flex flex-1 justify-end rounded-full bg-white/[0.06]">
                  <div className={`club-bar club-bar-h rounded-full ${lead(s.home, s.away) ? '' : 'opacity-45'}`} style={{ width: `${(s.home / sum) * 100}%` }} />
                </div>
                <div className="flex-1 rounded-full bg-white/[0.06]">
                  <div className={`club-bar club-bar-a h-full rounded-full ${lead(s.away, s.home) ? '' : 'opacity-45'}`} style={{ width: `${(s.away / sum) * 100}%` }} />
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
