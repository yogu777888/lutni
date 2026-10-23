'use client'

import { useState } from 'react'
import { momentumSummary } from '@/lib/match-notes'
import { minuteLabel, type MomentumPoint } from '@/lib/sstats/ls'
import type { MatchEvent } from '@/lib/types'
import { TeamLogo } from '../TeamLogo'

type Side = { name: string; logo?: string | null }

const plural = (n: number, one: string, few: string, many: string) => {
  const a = n % 10
  const b = n % 100
  return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many
}
const mins = (n: number) => `${n} мин`
/** «15–19′» → «с 15-й по 19-ю минуту»; с добавленным временем — «на 45+1′–45+5′» */
const spanText = (x: string) => {
  const [a, b] = x.replace('′', '').split('–')
  return a.includes('+') || b.includes('+') ? `на ${a}′–${b}′` : `с ${a}-й по ${b}-ю минуту`
}

/**
 * «Давление команд» (было «Кто давил»; заголовок — у раздела) — давление по минутам из `/Ls/GameMomentum` (владелец: «виджет давление команд
 * некрасивый и не информативный и в плане текста какаято бурмалда написана»). Сверху — строки, как в статистике:
 * «Сколько минут давила команда» с полосой и «ещё 8 мин — на равных», ниже фразами — самый сильный натиск и последние 10 минут (`momentumSummary`).
 * Ниже график по настоящей шкале: тайм — 45 минут (по ходу второй тайм дорисован пустым до 90′, «сейчас» — чертой),
 * столбик вверх — давит хозяин, вниз — гость, цветом клуба (`ClubVars` → `.club-bar-h/-a`); слева шкала силы давления
 * (100% — самый сильный натиск; владелец: «почему слева шкалы в процентах нет?»); гол — метка «эмблема 17′» над графиком
 * и пунктир через него (мяч у края столбика владелец не понял); при наведении или касании — минута, кто давит и с какой силой.
 */
export function Momentum({ points, events, home, away, live }: { points: MomentumPoint[]; events: MatchEvent[]; home: Side; away: Side; live: boolean }) {
  const [act, setAct] = useState<string | null>(null)
  const sum = momentumSummary(points)
  const parts = ([1, 2, 3] as const)
    .map((p) => {
      const pts = points.filter((x) => x.part === p)
      const base = p === 1 ? 0 : p === 2 ? 45 : 90
      const len = p === 3 ? 30 : 45
      // слотов — не меньше длины тайма: по ходу второй тайм дорисован пустым до 90′
      return { part: p, pts, base, slots: Math.max(len, pts.length) }
    })
    .filter((x) => x.pts.length)
  // голы — по таймам; ярус выше, если рядом (ближе 6 минут) уже стоит метка — иначе налезут
  const goalMarks: { key: string; part: number; slot: number; side: 'home' | 'away'; label: string; level: number }[] = []
  for (const e of events) {
    if (e.kind !== 'goal' && e.kind !== 'penalty' && e.kind !== 'own-goal') continue
    const part = e.minute <= 45 ? 1 : e.minute <= 90 ? 2 : 3
    const pt = parts.find((x) => x.part === part)
    if (!pt) continue
    const m = e.minute + (e.extra ?? 0)
    const at = pt.pts.findIndex((x) => x.minute === m)
    const slot = at >= 0 ? at : Math.min(pt.slots - 1, Math.max(0, m - pt.base - 1))
    const near = goalMarks.filter((g) => g.part === part && Math.abs(g.slot - slot) < 6).map((g) => g.level)
    let level = 0
    while (near.includes(level)) level++
    goalMarks.push({ key: `${part}:${m}:${goalMarks.length}`, part, slot, side: e.side, label: `${e.minute}${e.extra ? `+${e.extra}` : ''}′`, level })
  }
  const goalRows = goalMarks.length ? Math.max(...goalMarks.map((g) => g.level)) + 1 : 0
  const byKey = new Map(points.map((p) => [`${p.part}:${p.minute}`, p]))
  const cur = act ? byKey.get(act) : null
  const who = (p: MomentumPoint) =>
    p.v >= 0.1 ? `давит «${home.name}» · ${Math.round(p.v * 100)}%` : p.v <= -0.1 ? `давит «${away.name}» · ${Math.round(-p.v * 100)}%` : 'на равных'
  const pick = (e: React.PointerEvent) => {
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-k]')
    setAct(el?.dataset.k ?? null)
  }

  const team = (t: Side, right: boolean) => (
    <span className={`flex min-w-0 items-center gap-2.5 ${right ? 'flex-row-reverse text-right' : ''}`}>
      <TeamLogo name={t.name} src={t.logo ?? null} size={28} />
      <span className="truncate text-[16px] font-semibold">{t.name}</span>
    </span>
  )
  const row = (label: string, h: string, a: string, hv: number, av: number, bar = false) => (
    <li className="border-t border-edge py-3 first:border-t-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className={`num shrink-0 ${bar ? 'text-[26px] leading-none' : 'text-[16px]'} ${hv >= av ? 'font-bold text-fg' : 'text-dim'}`}>{h}</span>
        <span className="min-w-0 text-balance text-center text-[14px] leading-snug text-dim">{label}</span>
        <span className={`num shrink-0 ${bar ? 'text-[26px] leading-none' : 'text-[16px]'} ${av >= hv ? 'font-bold text-fg' : 'text-dim'}`}>{a}</span>
      </div>
      {bar ? (
        <div aria-hidden className="mt-2 flex h-2 gap-1">
          <div className="flex flex-1 justify-end rounded-full bg-white/[0.06]">
            <div className={`club-bar-h rounded-full ${hv >= av ? '' : 'opacity-45'}`} style={{ width: `${(hv / (hv + av || 1)) * 100}%` }} />
          </div>
          <div className="flex-1 rounded-full bg-white/[0.06]">
            <div className={`club-bar-a h-full rounded-full ${av >= hv ? '' : 'opacity-45'}`} style={{ width: `${(av / (hv + av || 1)) * 100}%` }} />
          </div>
        </div>
      ) : null}
    </li>
  )
  // лучший отрезок: сравниваем силу не словами — у кого он есть, тот и белым
  const sp = sum.spell
  const even = Math.max(0, points.length - sum.minutes.home - sum.minutes.away)
  const spells = [sp.home ? `«${home.name}» — ${spanText(sp.home)}` : null, sp.away ? `«${away.name}» — ${spanText(sp.away)}` : null].filter(Boolean)
  const spellText = spells.length ? `Самый сильный натиск: ${spells.join(', ')}.` : null
  const lateText = sum.late
    ? `${live ? 'Последние 10 минут' : 'Концовка, последние 10 минут'}: «${home.name}» — ${mins(sum.late.home)} с перевесом, «${away.name}» — ${mins(sum.late.away)}.`
    : null

  return (
    <div>
      <div className="flex items-center justify-between gap-4 border-b border-edge pb-3.5">
        {team(home, false)}
        {team(away, true)}
      </div>
      {/* сколько минут давила каждая, сколько — на равных: числа складываются в сыгранное время */}
      <ul>{row('Сколько минут давила команда', mins(sum.minutes.home), mins(sum.minutes.away), sum.minutes.home, sum.minutes.away, true)}</ul>
      {/* «всего N мин» не пишем: с добавленным временем выходило «всего 61» при «сейчас 59′» */}
      {even > 0 ? <p className="-mt-1 text-center text-[13px] text-mute">ещё {mins(even)} — на равных</p> : null}
      {/* остальное — фразами: «15–19′» и «7 из 10» без слов были непонятны */}
      {spellText || lateText ? (
        <ul className="mt-3.5 space-y-1.5 border-t border-edge pt-3.5 text-[14px] leading-snug text-dim">
          {spellText ? <li>{spellText}</li> : null}
          {lateText ? <li>{lateText}</li> : null}
        </ul>
      ) : null}
      <div className="mb-4" />

      <div
        className="relative touch-pan-y select-none"
        style={{ paddingTop: goalRows ? goalRows * 26 + 6 : 8 }}
        onPointerMove={pick}
        onPointerDown={pick}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setAct(null)}
        role="img"
        aria-label={`Давление по минутам: вверх — «${home.name}», вниз — «${away.name}». Перевес: «${home.name}» — ${sum.minutes.home} ${plural(sum.minutes.home, 'минута', 'минуты', 'минут')}, «${away.name}» — ${sum.minutes.away}.`}
      >
        <div className="flex gap-2">
          {/* шкала слева: сила давления, 100% — самый сильный натиск; вверх — хозяева, вниз — гости */}
          <div aria-hidden className="relative h-[120px] w-9 shrink-0 text-right text-[13px] leading-none text-mute lg:h-[150px]">
            {SCALE.map(([top, t]) => (
              <span key={top} className="absolute right-0 -translate-y-1/2" style={{ top: `${top}%` }}>
                {t}
              </span>
            ))}
          </div>
          {parts.map((pt, i) => {
            const last = pt.pts[pt.pts.length - 1]
            const filled = pt.pts.length / pt.slots
            const end = pt.base + (pt.part === 3 ? 30 : 45)
            const ticks = [15, 30].map((d) => pt.base + d).filter((m) => m < end)
            const now = live && filled < 1 && pt === parts[parts.length - 1]
            return (
              <div key={pt.part} className="relative min-w-0" style={{ flex: pt.slots }}>
                {/* голы: метка «эмблема 17′» над графиком и черта через него — чей гол, видно по эмблеме */}
                {goalMarks
                  .filter((g) => g.part === pt.part)
                  .map((g) => {
                    const x = ((g.slot + 0.5) / pt.slots) * 100
                    const t = g.side === 'home' ? home : away
                    const shift = x < 10 ? '' : x > 90 ? '-translate-x-full' : '-translate-x-1/2'
                    return (
                      <span key={g.key}>
                        <span
                          aria-hidden
                          className="absolute bottom-6 w-px border-l border-dashed border-white/45"
                          style={{ left: `${x}%`, top: -(g.level * 26 + 6) }}
                        />
                        <span
                          className={`absolute z-[1] flex items-center gap-1 whitespace-nowrap rounded-full bg-panel-3 py-0.5 pl-0.5 pr-2 text-[13px] font-semibold ${shift}`}
                          style={{ left: `${x}%`, top: -(g.level * 26 + 28) }}
                          title={`Гол «${t.name}», ${g.label}`}
                        >
                          <TeamLogo name={t.name} src={t.logo ?? null} size={18} />
                          {g.label}
                        </span>
                      </span>
                    )
                  })}
                <div className="relative flex h-[120px] items-stretch gap-px lg:h-[150px]">
                  <span className="absolute inset-x-0 top-1/2 h-px bg-white/20" aria-hidden />
                  <span className="absolute inset-x-0 top-1/4 h-px bg-white/[0.05]" aria-hidden />
                  <span className="absolute inset-x-0 top-3/4 h-px bg-white/[0.05]" aria-hidden />
                  {/* ещё не сыгранное — тихой дорожкой, «сейчас» — чертой с подписью в пустой части */}
                  {now ? (
                    <>
                      <span aria-hidden className="absolute inset-y-0 right-0 rounded-sm bg-white/[0.03]" style={{ left: `${filled * 100}%` }} />
                      <span aria-hidden className="absolute inset-y-0 w-px bg-live" style={{ left: `${filled * 100}%` }} />
                      <span className="absolute top-1 whitespace-nowrap pl-1.5 text-[13px] font-semibold text-live" style={{ left: `${filled * 100}%` }}>
                        сейчас {minuteLabel(last)}
                      </span>
                    </>
                  ) : null}
                  {pt.pts.map((x) => {
                    const k = `${x.part}:${x.minute}`
                    const on = act === k
                    return (
                      <span key={k} data-k={k} className="relative flex-1">
                        {on ? <span aria-hidden className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/35" /> : null}
                        {x.v > 0 ? (
                          <span className="club-bar-h absolute inset-x-0 bottom-1/2 rounded-t-[2px]" style={{ height: `${Math.max(x.v * 50, 1.5)}%` }} />
                        ) : (
                          <span className="club-bar-a absolute inset-x-0 top-1/2 rounded-b-[2px]" style={{ height: `${Math.max(-x.v * 50, 1.5)}%` }} />
                        )}
                      </span>
                    )
                  })}
                  {Array.from({ length: pt.slots - pt.pts.length }, (_, j) => (
                    <span key={`e${j}`} className="flex-1" />
                  ))}
                </div>
                {/* минуты матча: 15′ и 30′ внутри тайма — ниже sm прячем, концы тайма — всегда */}
                <div className="relative mt-2 h-4 text-[13px] text-mute">
                  {i === 0 ? <span className="absolute left-0">{pt.base}′</span> : null}
                  {ticks.map((m) => (
                    <span key={m} className="absolute -translate-x-1/2 max-sm:hidden" style={{ left: `${((m - pt.base) / pt.slots) * 100}%` }}>
                      {m}′
                    </span>
                  ))}
                  <span className="absolute -translate-x-full" style={{ left: `${(Math.min(end - pt.base, pt.slots) / pt.slots) * 100}%` }}>
                    {end}′
                  </span>
                </div>
              </div>
            )
          })}
        </div>
        {/* подсказка: минута, кто давит и с какой силой — над графиком, у краёв прижата */}
        {cur ? (
          <span
            className="pointer-events-none absolute top-0 z-[2] -translate-x-1/2 whitespace-nowrap rounded-ctl bg-panel-3 px-2 py-0.5 text-[13px] font-semibold"
            style={{ left: `clamp(110px, calc(44px + (100% - 44px) * ${tipLeft(parts, cur) / 100}), calc(100% - 110px))` }}
          >
            {minuteLabel(cur)} · {who(cur)}
          </span>
        ) : null}
      </div>
    </div>
  )
}

/** Шкала силы давления: вверх — хозяева, вниз — гости. */
const SCALE: [number, string][] = [
  [0, '100%'],
  [25, '50%'],
  [50, '0'],
  [75, '50%'],
  [100, '100%'],
]

/** Где подсказка по ширине всего графика (в процентах): части — по числу слотов, зазор между ними не учитываем. */
function tipLeft(parts: { part: number; pts: MomentumPoint[]; slots: number }[], p: MomentumPoint): number {
  const total = parts.reduce((a, x) => a + x.slots, 0)
  let off = 0
  for (const x of parts) {
    if (x.part === p.part) return ((off + x.pts.indexOf(p) + 0.5) / total) * 100
    off += x.slots
  }
  return 50
}
