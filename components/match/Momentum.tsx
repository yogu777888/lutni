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

/**
 * «Кто давил» (заголовок — у раздела) — давление по минутам из `/Ls/GameMomentum` (владелец: «виджет давление команд
 * некрасивый и не информативный и в плане текста какаято бурмалда написана»). Сверху — строки, как в статистике:
 * «Перевес» (минут), «Лучший отрезок», «Последние 10 минут» (`momentumSummary`), у каждой команды своё число.
 * Ниже график по настоящей шкале: тайм — 45 минут (по ходу второй тайм дорисован пустым до 90′, «сейчас» — чертой),
 * столбик вверх — давит хозяин, вниз — гость, цветом клуба (`ClubVars` → `.club-bar-h/-a`); гол — мяч с минутой у края;
 * при наведении или касании — минута и кто давит.
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
  const goals = new Map<string, { side: 'home' | 'away'; label: string }>()
  for (const e of events) {
    if (e.kind !== 'goal' && e.kind !== 'penalty' && e.kind !== 'own-goal') continue
    const part = e.minute <= 45 ? 1 : e.minute <= 90 ? 2 : 3
    goals.set(`${part}:${e.minute + (e.extra ?? 0)}`, { side: e.side, label: `${e.minute}${e.extra ? `+${e.extra}` : ''}′` })
  }
  const byKey = new Map(points.map((p) => [`${p.part}:${p.minute}`, p]))
  const cur = act ? byKey.get(act) : null
  const who = (p: MomentumPoint) => (p.v >= 0.1 ? `давит «${home.name}»` : p.v <= -0.1 ? `давит «${away.name}»` : 'на равных')
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
        <span className="min-w-0 truncate text-center text-[14px] text-dim">{label}</span>
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

  return (
    <div>
      <div className="flex items-center justify-between gap-4 border-b border-edge pb-3.5">
        {team(home, false)}
        {team(away, true)}
      </div>
      <ul className="mb-4">
        {row('Перевес', mins(sum.minutes.home), mins(sum.minutes.away), sum.minutes.home, sum.minutes.away, true)}
        {sp.home || sp.away ? row('Лучший отрезок', sp.home ?? '—', sp.away ?? '—', sp.home ? 1 : 0, sp.away ? 1 : 0) : null}
        {sum.late
          ? row(live ? 'Последние 10 минут' : 'Концовка, 10 минут', mins(sum.late.home), mins(sum.late.away), sum.late.home, sum.late.away)
          : null}
      </ul>

      <div
        className="relative touch-pan-y select-none pt-7"
        onPointerMove={pick}
        onPointerDown={pick}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setAct(null)}
        role="img"
        aria-label={`Давление по минутам: вверх — «${home.name}», вниз — «${away.name}». Перевес: «${home.name}» — ${sum.minutes.home} ${plural(sum.minutes.home, 'минута', 'минуты', 'минут')}, «${away.name}» — ${sum.minutes.away}.`}
      >
        <div className="flex gap-2">
          {parts.map((pt, i) => {
            const last = pt.pts[pt.pts.length - 1]
            const filled = pt.pts.length / pt.slots
            const end = pt.base + (pt.part === 3 ? 30 : 45)
            const ticks = [15, 30].map((d) => pt.base + d).filter((m) => m < end)
            return (
              <div key={pt.part} className="relative min-w-0" style={{ flex: pt.slots }}>
                <div className="relative flex h-[120px] items-stretch gap-px lg:h-[150px]">
                  <span className="absolute inset-x-0 top-1/2 h-px bg-white/15" aria-hidden />
                  {/* ещё не сыгранное — тихой дорожкой, «сейчас» — чертой */}
                  {live && filled < 1 && pt === parts[parts.length - 1] ? (
                    <>
                      <span aria-hidden className="absolute inset-y-0 right-0 rounded-sm bg-white/[0.03]" style={{ left: `${filled * 100}%` }} />
                      <span aria-hidden className="absolute inset-y-0 w-px bg-live" style={{ left: `${filled * 100}%` }} />
                      <span className="absolute -top-6 -translate-x-1/2 whitespace-nowrap text-[13px] font-semibold text-live" style={{ left: `${filled * 100}%` }}>
                        {minuteLabel(last)}
                      </span>
                    </>
                  ) : null}
                  {pt.pts.map((x) => {
                    const k = `${x.part}:${x.minute}`
                    const g = goals.get(k)
                    const on = act === k
                    return (
                      <span key={k} data-k={k} className="relative flex-1">
                        {on ? <span aria-hidden className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/35" /> : null}
                        {x.v > 0 ? (
                          <span className="club-bar-h absolute inset-x-0 bottom-1/2 rounded-t-[2px]" style={{ height: `${Math.max(x.v * 50, 1.5)}%` }} />
                        ) : (
                          <span className="club-bar-a absolute inset-x-0 top-1/2 rounded-b-[2px]" style={{ height: `${Math.max(-x.v * 50, 1.5)}%` }} />
                        )}
                        {g ? (
                          <span aria-hidden className={`absolute left-1/2 z-[1] -translate-x-1/2 ${g.side === 'home' ? 'top-0 -translate-y-1/2' : 'bottom-0 translate-y-1/2'}`}>
                            <Ball />
                          </span>
                        ) : null}
                      </span>
                    )
                  })}
                  {Array.from({ length: pt.slots - pt.pts.length }, (_, j) => (
                    <span key={`e${j}`} className="flex-1" />
                  ))}
                </div>
                {/* шкала: 15′ и 30′ внутри тайма — ниже sm прячем, концы тайма — всегда */}
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
        {/* подсказка: минута и кто давит — над графиком, у краёв прижата */}
        {cur ? (
          <span
            className="pointer-events-none absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-ctl bg-panel-3 px-2 py-0.5 text-[13px] font-semibold"
            style={{ left: `clamp(80px, ${tipLeft(parts, cur)}%, calc(100% - 80px))` }}
          >
            {minuteLabel(cur)} · {goals.get(`${cur.part}:${cur.minute}`) ? `гол «${goals.get(`${cur.part}:${cur.minute}`)!.side === 'home' ? home.name : away.name}»` : who(cur)}
          </span>
        ) : null}
      </div>
    </div>
  )
}

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

function Ball() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" className="block rounded-full ring-2 ring-panel">
      <circle cx="8" cy="8" r="8" fill="#fff" />
      <path d="M8 4.6l3 2.2-1.1 3.6H6.1L5 6.8z" fill="#0B0F14" />
    </svg>
  )
}
