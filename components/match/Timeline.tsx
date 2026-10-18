'use client'

import { useEffect, useRef, useState } from 'react'
import { TeamLogo } from '../TeamLogo'

export type TimelineMark = {
  kind: 'goal' | 'yellow' | 'red' | 'miss'
  side: 'home' | 'away'
  /** минута с добавленным временем */
  at: number
  /** у гола — счёт после него («1:0»), null — счёт не сошёлся с итогом */
  label: string | null
  /** подсказка: «17′ · Гол 1:0» и ниже «B. Petrov · Бетис» */
  head: string
  sub: string
}

const H = 20 // высота яруса
const GAP = 3 // между значками и ярусами
const NEAR = 5 // от черты до значка

/** Ширина значка на глаз: плашка гола — по длине счёта, карточка 12px, незабитый пенальти 20px. */
const widthOf = (m: TimelineMark) => (m.kind === 'goal' ? 12 + (m.label ?? 'гол').length * 6 : m.kind === 'miss' ? 20 : 12)

function Mark({ m }: { m: TimelineMark }) {
  if (m.kind === 'goal')
    return (
      <span className="num grid h-5 min-w-5 place-items-center rounded-full bg-fg px-1.5 text-[13px] font-semibold leading-none text-ink">
        {m.label ?? 'гол'}
      </span>
    )
  if (m.kind === 'red') return <span className="block h-4 w-3 rounded-xs bg-[#ff4d4f]" />
  if (m.kind === 'yellow') return <span className="block h-4 w-3 rounded-xs bg-[#f5c518]" />
  return <span className="grid h-5 w-5 place-items-center rounded-full bg-white/15 text-[13px] text-dim">✕</span>
}

/**
 * Полоса матча 0′–90′ (владелец: «сейчас в матче как?», согласился): значки — вплотную к черте (висели в ~25px от неё,
 * и не было видно, к какой минуте относятся), хозяева над чертой, гости под ней; гол — белая плашка со счётом после
 * него («1:0»: это единственное, чего нет на табло — авторы и минуты там под названиями команд), минута, игрок и
 * команда — в подсказке. Значки одной команды, которые наезжают друг на друга (на телефоне минута — ~2,5px), уходят
 * ярусом дальше от черты — поэтому ширина полосы меряется на месте, а не считается на сервере.
 */
export function Timeline({
  marks,
  end,
  now,
  home,
  away,
}: {
  marks: TimelineMark[]
  end: number
  /** минута идущего матча (до неё — пройденная часть полосы); null — матч окончен */
  now: number | null
  home: { name: string; logo?: string | null }
  away: { name: string; logo?: string | null }
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(0)
  // открытая подсказка (номер значка): мышью — при наведении, на телефоне — по нажатию (`title` там не открывается),
  // с клавиатуры — в фокусе; закрывается нажатием мимо и Esc
  const [act, setAct] = useState<number | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useEffect(() => {
    if (act == null) return
    const off = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setAct(null)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAct(null)
    document.addEventListener('pointerdown', off)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', off)
      document.removeEventListener('keydown', esc)
    }
  }, [act])

  const pct = (at: number) => Math.min(100, (at / end) * 100)
  // значок у края не вылезает за полосу: центр — не ближе половины ширины к краю (то же правило — в `left` ниже)
  const center = (m: TimelineMark) => {
    const half = widthOf(m) / 2
    return Math.min(Math.max((pct(m.at) / 100) * w, half), w - half)
  }
  const tiers = marks.map(() => 0)
  if (w) {
    for (const side of ['home', 'away'] as const) {
      const taken: [number, number][][] = [] // занятые отрезки в каждом ярусе
      marks
        .map((m, i) => ({ m, i }))
        .filter(({ m }) => m.side === side)
        // ближний к черте ярус — сначала голам: карточка уступает место плашке со счётом
        .sort((a, b) => Number(a.m.kind !== 'goal') - Number(b.m.kind !== 'goal') || a.m.at - b.m.at)
        .forEach(({ m, i }) => {
          const half = widthOf(m) / 2
          const l = center(m) - half
          const r = center(m) + half
          let t = taken.findIndex((row) => row.every(([a, b]) => r + GAP <= a || l >= b + GAP))
          if (t === -1) t = taken.push([]) - 1
          taken[t].push([l, r])
          tiers[i] = t
        })
    }
  }
  // высота — по числу ярусов у каждой команды отдельно: второй ярус хозяев не добавляет пустоты под чертой
  const room = (side: 'home' | 'away') => {
    const n = Math.max(1, ...marks.map((m, i) => (m.side === side ? tiers[i] + 1 : 0)))
    return NEAR + n * H + (n - 1) * GAP + 3
  }
  const half = room('home') // от верха до черты
  const height = half + room('away')
  const off = (t: number) => NEAR + t * (H + GAP)

  const tipAt = act == null || !w ? null : marks[act]
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4">
      {/* чьи ряды: подпись — на уровне ближнего к черте яруса; эмблема — одна на команду в блоке (владелец: «в формах
          команд есть лого, а тут нет»; до этого — «а сейчас не много логотипов?»: их было 10, над колонками статистики
          названия остались текстом) */}
      <div className="relative max-w-[116px] text-[13px] leading-tight text-dim sm:max-w-[164px]" style={{ height }}>
        <span className="invisible flex h-0 gap-1.5 overflow-hidden">
          <span className="w-[22px] shrink-0" />
          {home.name.length > away.name.length ? home.name : away.name}
        </span>
        {[home, away].map((t, i) => (
          <span
            key={i}
            className="absolute left-0 right-0 flex -translate-y-1/2 items-center gap-1.5"
            style={{ top: i ? half + NEAR + H / 2 : half - NEAR - H / 2 }}
          >
            <TeamLogo name={t.name} src={t.logo ?? null} size={22} />
            <span className="min-w-0 truncate">{t.name}</span>
          </span>
        ))}
      </div>
      <div>
        <div ref={ref} className="relative" style={{ height }} aria-label="Ход матча по минутам">
          <span className="absolute left-0 h-0.5 w-full rounded-full bg-white/10" style={{ top: half - 1 }} />
          <span
            className="absolute left-0 h-0.5 rounded-full bg-white/55"
            style={{ top: half - 1, width: now == null ? '100%' : `${pct(now)}%` }}
          />
          <span className="absolute h-2.5 w-px -translate-x-1/2 bg-white/30" style={{ top: half - 5, left: `${pct(45)}%` }} title="Перерыв" />
          {now != null ? (
            <span className="absolute h-2 w-2 -translate-x-1/2 rounded-full bg-live" style={{ top: half - 4, left: `${pct(now)}%` }} />
          ) : null}
          {marks.map((m, i) => {
            const hw = widthOf(m) / 2
            return (
              <button
                key={i}
                type="button"
                aria-label={m.sub ? `${m.head} — ${m.sub}` : m.head}
                onPointerEnter={(e) => e.pointerType === 'mouse' && setAct(i)}
                onPointerLeave={(e) => e.pointerType === 'mouse' && setAct(null)}
                onFocus={() => setAct(i)}
                onBlur={() => setAct(null)}
                onClick={() => setAct(i)}
                // палец больше значка: зона нажатия — на 6px шире со всех сторон
                className={`absolute flex h-5 -translate-x-1/2 after:absolute after:-inset-1.5 ${m.side === 'home' ? 'items-end' : 'items-start'} ${
                  act === i ? 'z-10 scale-110' : ''
                } transition-transform`}
                style={{
                  left: `clamp(${hw}px, ${pct(m.at)}%, calc(100% - ${hw}px))`,
                  ...(m.side === 'home' ? { bottom: height - half + off(tiers[i]) } : { top: half + off(tiers[i]) }),
                }}
              >
                <Mark m={m} />
              </button>
            )
          })}
          {/* подсказка — от черты наружу (над значком хозяев, под значком гостей), у краёв — прижата к краю полосы */}
          {tipAt && act != null ? (
            <div
              role="tooltip"
              className={`pointer-events-none absolute z-20 w-max max-w-[240px] rounded-ctl border border-edge bg-panel-2 px-3 py-2 text-[13px] leading-snug shadow-[0_8px_24px_rgb(0_0_0/0.3)] ${
                center(tipAt) > w / 3 && center(tipAt) < (w * 2) / 3 ? '-translate-x-1/2' : ''
              }`}
              style={{
                ...(center(tipAt) <= w / 3
                  ? { left: Math.max(0, center(tipAt) - 14) }
                  : center(tipAt) >= (w * 2) / 3
                    ? { right: Math.max(0, w - center(tipAt) - 14) }
                    : { left: center(tipAt) }),
                ...(tipAt.side === 'home'
                  ? { bottom: height - half + off(tiers[act]) + H + 6 }
                  : { top: half + off(tiers[act]) + H + 6 }),
              }}
            >
              <div className="num font-semibold text-fg">{tipAt.head}</div>
              {tipAt.sub ? <div className="text-dim">{tipAt.sub}</div> : null}
            </div>
          ) : null}
        </div>
        <div className="relative mt-1.5 h-4 text-[13px] text-mute">
          <span className="absolute left-0">0′</span>
          <span className="absolute -translate-x-1/2" style={{ left: `${pct(45)}%` }}>
            45′
          </span>
          <span className="absolute right-0">{end}′</span>
        </div>
      </div>
    </div>
  )
}
