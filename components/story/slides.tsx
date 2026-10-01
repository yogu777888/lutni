'use client'

import { Fragment, useEffect, useState } from 'react'
import type { CompareRow, FormSide, Side, StoryData, StorySlide, StoryTeam } from '@/lib/story'
import type { Res } from '@/lib/stats'
import { tagChipClass, tagHashClass } from '../tag-chip'
import { TeamLogo } from '../TeamLogo'

/**
 * Слайды сторис. Графики — обычные div/SVG с CSS-анимациями из globals.css
 * (st-*): анимация стартует, когда слайд монтируется. Цвета: хозяева — bg-home,
 * гости — bg-away, ничья — нейтральный bg-tie; подписи и числа — цветом текста.
 */

type S<K extends StorySlide['kind']> = Extract<StorySlide, { kind: K }>

/** Сколько показывать слайд, мс (на прогноз — дольше: там решение и кнопка). */
export const SLIDE_MS: Record<StorySlide['kind'], number> = {
  cover: 4500,
  odds: 7500,
  goals: 7500,
  scores: 7000,
  form: 8500,
  compare: 8500,
  h2h: 8000,
  movement: 7500,
  stats: 8500,
  goalsTimeline: 7500,
  pick: 11000,
}

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function useCountUp(target: number, duration: number, delay: number) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (reducedMotion()) {
      setV(target)
      return
    }
    let raf = 0
    const start = performance.now() + delay
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration))
      setV(target * (1 - (1 - t) ** 3))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, delay])
  return v
}

/** Число, которое «набегает» от нуля. Для скринридеров — сразу итоговое значение. */
function Num({
  value,
  format,
  delay = 0,
  duration = 1100,
  className = '',
}: {
  value: number
  format: (v: number) => string
  delay?: number
  duration?: number
  className?: string
}) {
  const v = useCountUp(value, duration, delay)
  return (
    <span className={`num ${className}`}>
      <span aria-hidden>{format(v)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  )
}

const pctFmt = (v: number) => `${Math.round(v * 100)}%`
const dec = (v: number, d = 1) => v.toFixed(d).replace('.', ',')
const intFmt = (v: number) => String(Math.round(v))
const wait = (ms: number) => ({ animationDelay: `${ms}ms` })

const SIDE_BG: Record<Side, string> = { home: 'bg-home', away: 'bg-away' }

function Swatch({ side }: { side: Side }) {
  return <span className={`h-2.5 w-2.5 shrink-0 rounded-[3px] ${SIDE_BG[side]}`} aria-hidden />
}

function Frame({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full flex-col px-5 pb-2 pt-3">{children}</div>
}

function Head({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="shrink-0">
      <div className="st-rise text-[11px] font-extrabold uppercase tracking-[0.14em] text-acid">{eyebrow}</div>
      <h2 className="st-rise mt-2 text-[23px] font-extrabold leading-[1.15] tracking-tight" style={wait(80)}>
        {title}
      </h2>
      {sub ? (
        <p className="st-rise mt-2 text-[14px] leading-snug text-dim" style={wait(160)}>
          {sub}
        </p>
      ) : null}
    </div>
  )
}

/** Легенда «хозяева слева — гости справа»: цвет + логотип + название. */
function Legend({ story, delay = 200 }: { story: StoryData; delay?: number }) {
  return (
    <div className="st-fade flex items-center justify-between gap-3 text-[13px] font-semibold" style={wait(delay)}>
      <span className="flex min-w-0 items-center gap-2">
        <Swatch side="home" />
        <TeamLogo name={story.home.name} src={story.home.logo} size={20} />
        <span className="truncate">{story.home.name}</span>
      </span>
      <span className="flex min-w-0 items-center justify-end gap-2">
        <span className="truncate">{story.away.name}</span>
        <TeamLogo name={story.away.name} src={story.away.logo} size={20} />
        <Swatch side="away" />
      </span>
    </div>
  )
}

// ─── Обложка ─────────────────────────────────────────────────────────────────

function TeamBig({ team, cls }: { team: StoryTeam; cls: string }) {
  return (
    <div className={`${cls} flex min-w-0 flex-col items-center gap-3`} style={wait(120)}>
      <div className="rounded-full bg-panel-2 p-3 ring-1 ring-inset ring-edge-2">
        <TeamLogo name={team.name} src={team.logo} size={64} />
      </div>
      <span className="line-clamp-2 text-[17px] font-extrabold leading-tight">{team.name}</span>
    </div>
  )
}

function Cover({ s, story }: { s: S<'cover'>; story: StoryData }) {
  const live = story.status === 'live' || story.status === 'suspended'
  const score = story.score && (live || story.status === 'finished') ? story.score : null
  return (
    <div className="flex h-full flex-col items-center px-6 pb-4 pt-6 text-center">
      <div className="st-fade text-[12px] font-bold uppercase tracking-[0.12em] text-dim">{story.league}</div>
      {story.round ? (
        <div className="st-fade mt-1 text-[12px] text-mute" style={wait(60)}>
          {story.round}
        </div>
      ) : null}
      <div className="my-auto w-full">
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
          <TeamBig team={story.home} cls="st-slide-l" />
          <div className="st-pop flex h-[90px] items-center px-1" style={wait(350)}>
            {score ? (
              <span className={`num text-[44px] font-black leading-none ${live ? 'text-live' : ''}`}>
                {score.home}
                <span className="mx-1 text-dim">:</span>
                {score.away}
              </span>
            ) : (
              <span className="text-[22px] font-black italic text-acid">VS</span>
            )}
          </div>
          <TeamBig team={story.away} cls="st-slide-r" />
        </div>
        <div
          className="st-rise mt-7 inline-flex items-center gap-2 rounded-full bg-panel-2 px-3.5 py-1.5 text-[13px] font-semibold ring-1 ring-inset ring-edge-2"
          style={wait(500)}
        >
          {live ? (
            <>
              <span className="h-2 w-2 animate-pulse-live rounded-full bg-live" />
              <span className="text-live">LIVE{story.elapsed ? ` · ${story.elapsed}′` : ''}</span>
            </>
          ) : (
            story.when
          )}
        </div>
        {s.tags.length ? (
          <div className="mt-5 flex flex-wrap justify-center gap-1.5">
            {s.tags.map((t, i) => (
              <span key={t.slug} className={`st-pop ${tagChipClass(t.kind, 'md')}`} style={wait(650 + i * 90)}>
                <span className={tagHashClass(t.kind)}>#</span>
                {t.label.replace(/^#/, '')}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <p className="st-fade flex items-center gap-1.5 text-[13px] text-dim" style={wait(1000)}>
        {s.teaser}
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 animate-pulse fill-none stroke-current" strokeWidth="2" aria-hidden>
          <path d="m6 3 5 5-5 5" />
        </svg>
      </p>
    </div>
  )
}

// ─── Кто фаворит: 1X2 ────────────────────────────────────────────────────────

function Odds({ s, story }: { s: S<'odds'>; story: StoryData }) {
  const items = [
    { key: 'home', label: 'П1', name: story.home.name, team: story.home, p: s.probs.home, best: s.best.home, fair: s.fair.home, bar: 'bg-home' },
    { key: 'draw', label: 'Х', name: 'ничья', team: null, p: s.probs.draw, best: s.best.draw, fair: s.fair.draw, bar: 'bg-tie' },
    { key: 'away', label: 'П2', name: story.away.name, team: story.away, p: s.probs.away, best: s.best.away, fair: s.fair.away, bar: 'bg-away' },
  ]
  const max = Math.max(...items.map((i) => i.p))
  return (
    <Frame>
      <Head eyebrow="Кто фаворит" title={s.title} sub={s.sub} />
      <div className="my-auto py-4">
        <div className="grid h-[min(30dvh,230px)] grid-cols-3 items-end gap-3 border-b border-edge-2">
          {items.map((it, i) => (
            <div key={it.key} className="flex h-full flex-col items-center justify-end">
              <Num value={it.p} format={pctFmt} delay={300 + i * 120} className="mb-1.5 text-[26px] font-extrabold" />
              <div
                className={`st-grow-y w-full rounded-t-[6px] ${it.bar}`}
                style={{ height: `${Math.max(3, (it.p / max) * 80)}%`, ...wait(300 + i * 120) }}
                title={`${it.label} (${it.name}): ${(it.p * 100).toFixed(1)}%`}
              />
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          {items.map((it) => (
            <div key={it.key} className="min-w-0">
              <div className="flex items-center justify-center gap-1.5 text-[15px] font-extrabold">
                {it.team ? <TeamLogo name={it.team.name} src={it.team.logo} size={18} /> : null}
                {it.label}
              </div>
              <div className="truncate text-[12px] text-dim">{it.name}</div>
              <div className="mt-2 rounded-lg bg-panel-2 px-1 py-1.5 ring-1 ring-inset ring-edge">
                <div className="num text-[15px] font-bold">{it.best ? it.best.toFixed(2) : '—'}</div>
                <div className="text-[10px] text-mute">лучший кэф</div>
              </div>
              <div className="num mt-1 text-[11px] text-dim">без маржи {it.fair.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  )
}

// ─── Голы: xG и тоталы ───────────────────────────────────────────────────────

/** Кольцо-индикатор одной доли: дорожка — тот же цвет, приглушённый. */
function Meter({ p, label, alt, delay }: { p: number; label: string; alt: string; delay: number }) {
  const r = 50
  const c = 2 * Math.PI * r
  return (
    <div className="st-rise flex flex-col items-center rounded-2xl bg-panel/70 px-2 py-3 ring-1 ring-inset ring-edge" style={wait(delay)}>
      <div className="relative h-[min(15dvh,120px)] w-[min(15dvh,120px)]">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgb(200 255 46 / 0.14)" strokeWidth="11" />
          <circle
            className="st-ring"
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="var(--color-acid)"
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={c}
            style={{ strokeDashoffset: c * (1 - p), ['--len' as string]: c, ...wait(delay + 100) }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Num value={p} format={pctFmt} delay={delay + 100} className="text-[26px] font-extrabold" />
        </div>
      </div>
      <div className="mt-2 text-[14px] font-bold">{label}</div>
      <div className="text-[12px] text-dim">{alt}</div>
    </div>
  )
}

function Goals({ s, story }: { s: S<'goals'>; story: StoryData }) {
  const max = Math.max(2.5, s.xg.home, s.xg.away)
  return (
    <Frame>
      <Head eyebrow="Голы" title={s.title} sub={s.sub} />
      <div className="my-auto space-y-5 py-4">
        <div>
          <Legend story={story} />
          <div className="mt-3 grid grid-cols-2 gap-0.5">
            <div className="flex justify-end">
              <div className="st-grow-x-rev h-3 rounded-l-full bg-home" style={{ width: `${(s.xg.home / max) * 100}%`, ...wait(250) }} />
            </div>
            <div className="flex">
              <div className="st-grow-x h-3 rounded-r-full bg-away" style={{ width: `${(s.xg.away / max) * 100}%`, ...wait(250) }} />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <Num value={s.xg.home} format={(v) => dec(v, 2)} delay={250} className="text-[32px] font-extrabold" />
            <span className="text-[12px] font-semibold text-dim">ожидаемые голы (xG)</span>
            <Num value={s.xg.away} format={(v) => dec(v, 2)} delay={250} className="text-[32px] font-extrabold" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {s.over25 != null ? <Meter p={s.over25} label="Тотал больше 2.5" alt={`меньше 2.5 — ${pctFmt(1 - s.over25)}`} delay={450} /> : null}
          {s.btts != null ? <Meter p={s.btts} label="Обе забьют" alt={`не забьёт хотя бы одна — ${pctFmt(1 - s.btts)}`} delay={600} /> : null}
        </div>
      </div>
    </Frame>
  )
}

// ─── Точный счёт: тепловая карта ─────────────────────────────────────────────

function Scores({ s, story }: { s: S<'scores'>; story: StoryData }) {
  const max = Math.max(...s.grid.flat())
  const n = s.grid.length
  return (
    <Frame>
      <Head eyebrow="Точный счёт" title={s.title} sub={s.sub} />
      <div className="mx-auto my-auto w-full max-w-[22rem] pt-3">
        <div className="mb-1 flex items-center justify-end gap-1.5 text-[12px] font-semibold text-dim">
          <Swatch side="away" />
          <span className="truncate">голы: {story.away.name} →</span>
        </div>
        <div className="grid gap-0.5" style={{ gridTemplateColumns: `20px repeat(${n}, minmax(0, 1fr))` }}>
          <span />
          {s.grid[0].map((_, j) => (
            <span key={j} className="num pb-0.5 text-center text-[12px] font-bold text-dim">
              {j}
            </span>
          ))}
          {s.grid.map((row, i) => (
            <Fragment key={i}>
              <span className="num flex items-center justify-center text-[12px] font-bold text-dim">{i}</span>
              {row.map((p, j) => {
                const a = 0.05 + 0.9 * (p / max)
                const top = i === s.top.home && j === s.top.away
                return (
                  <div
                    key={j}
                    className={`st-pop flex aspect-square flex-col items-center justify-center rounded-md ${top ? 'ring-2 ring-fg' : ''}`}
                    style={{ background: `rgb(200 255 46 / ${a})`, color: a > 0.5 ? 'var(--color-acid-ink)' : 'var(--color-fg)', ...wait(200 + (i + j) * 70) }}
                    title={`${story.home.name} ${i}:${j} ${story.away.name} — ${(p * 100).toFixed(1)}%`}
                  >
                    <span className="num text-[13px] font-extrabold leading-none">
                      {i}:{j}
                    </span>
                    {p >= 0.015 ? <span className="num mt-0.5 text-[10px] font-semibold opacity-80">{Math.round(p * 100)}%</span> : null}
                  </div>
                )
              })}
            </Fragment>
          ))}
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-dim">
          <Swatch side="home" />
          <span className="truncate">↓ голы: {story.home.name}</span>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-mute">
          реже
          <span className="h-1.5 flex-1 rounded-full" style={{ background: 'linear-gradient(90deg, rgb(200 255 46 / 0.05), rgb(200 255 46 / 0.95))' }} />
          чаще
        </div>
      </div>
    </Frame>
  )
}

// ─── Форма ───────────────────────────────────────────────────────────────────

const RES: Record<Res, { letter: string; cls: string; title: string }> = {
  W: { letter: 'В', cls: 'bg-win', title: 'победа' },
  D: { letter: 'Н', cls: 'bg-draw', title: 'ничья' },
  L: { letter: 'П', cls: 'bg-loss', title: 'поражение' },
}

function FormTeam({ team, side, f, base }: { team: StoryTeam; side: Side; f: FormSide | null; base: number }) {
  if (!f) {
    return <div className="rounded-2xl bg-panel/70 p-3.5 text-[13px] text-dim ring-1 ring-inset ring-edge">Нет свежих матчей: {team.name}</div>
  }
  // в данных свежие первыми, на экране — слева направо по времени
  const last = [...f.last5].reverse()
  const scores = f.scores.slice(0, last.length).reverse()
  return (
    <div className="st-rise rounded-2xl bg-panel/70 p-3.5 ring-1 ring-inset ring-edge" style={wait(base)}>
      <div className="flex items-center gap-2">
        <Swatch side={side} />
        <TeamLogo name={team.name} src={team.logo} size={22} />
        <span className="min-w-0 truncate text-[15px] font-bold">{team.name}</span>
        {f.note ? <span className="ml-auto shrink-0 rounded-full bg-panel-3 px-2 py-0.5 text-[11px] font-semibold text-fg/85">{f.note}</span> : null}
      </div>
      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {last.map((r, i) => (
          <div key={i} className="st-pop flex flex-col items-center" style={wait(base + 150 + i * 90)}>
            <span className={`flex h-10 w-full items-center justify-center rounded-lg text-[15px] font-extrabold text-black ${RES[r].cls}`} title={RES[r].title}>
              {RES[r].letter}
            </span>
            <span className="num mt-1 text-[11px] text-dim">{scores[i]}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-panel-3">
          <div className={`st-grow-x h-full rounded-full ${SIDE_BG[side]}`} style={{ width: `${(f.points5 / 15) * 100}%`, ...wait(base + 500) }} />
        </div>
        <span className="shrink-0 text-[13px] font-bold">
          <Num value={f.points5} format={intFmt} delay={base + 500} /> <span className="font-semibold text-dim">из 15 очков</span>
        </span>
      </div>
      <div className="mt-1.5 text-[12px] text-dim">
        забивает {dec(f.gfAvg)} · пропускает {dec(f.gaAvg)} за игру
      </div>
    </div>
  )
}

function Form({ s, story }: { s: S<'form'>; story: StoryData }) {
  return (
    <Frame>
      <Head eyebrow="Форма" title={s.title} sub={s.sub} />
      <div className="my-auto space-y-3 py-4">
        <FormTeam team={story.home} side="home" f={s.home} base={250} />
        <FormTeam team={story.away} side="away" f={s.away} base={450} />
        <p className="st-fade text-center text-[11px] text-mute" style={wait(900)}>
          В — победа · Н — ничья · П — поражение · последний матч справа
        </p>
      </div>
    </Frame>
  )
}

// ─── Сравнение «бабочкой» ────────────────────────────────────────────────────

function Check() {
  return (
    <svg viewBox="0 0 12 12" className="inline h-3 w-3 fill-none stroke-acid" strokeWidth="2.2" aria-label="лучше">
      <path d="m2.5 6.5 2.3 2.3 4.7-5" />
    </svg>
  )
}

function Butterfly({ rows }: { rows: CompareRow[] }) {
  return (
    <div className="space-y-3">
      {rows.map((r, i) => {
        const max = Math.max(r.home, r.away) || 1
        const d = 250 + i * 110
        const valCls = (side: Side) =>
          r.better === side ? 'font-extrabold text-fg' : r.better ? 'font-semibold text-dim' : 'font-bold text-fg'
        return (
          <div key={r.label} className="st-rise" style={wait(d)}>
            <div className="mb-1 grid grid-cols-[1fr_auto_1fr] items-baseline gap-2">
              <span className={`num flex items-center gap-1 text-[17px] ${valCls('home')}`}>
                {r.text[0]}
                {r.better === 'home' ? <Check /> : null}
              </span>
              <span className="text-center text-[12px] font-semibold text-dim">{r.label}</span>
              <span className={`num flex items-center justify-end gap-1 text-[17px] ${valCls('away')}`}>
                {r.better === 'away' ? <Check /> : null}
                {r.text[1]}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-0.5">
              <div className="flex justify-end">
                <div
                  className={`st-grow-x-rev h-2 rounded-l-full bg-home ${r.better === 'away' ? 'opacity-40' : ''}`}
                  style={{ width: `${(r.home / max) * 100}%`, ...wait(d + 100) }}
                />
              </div>
              <div className="flex">
                <div
                  className={`st-grow-x h-2 rounded-r-full bg-away ${r.better === 'home' ? 'opacity-40' : ''}`}
                  style={{ width: `${(r.away / max) * 100}%`, ...wait(d + 100) }}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Compare({ s, story, eyebrow }: { s: S<'compare'> | S<'stats'>; story: StoryData; eyebrow: string }) {
  return (
    <Frame>
      <Head eyebrow={eyebrow} title={s.title} sub={s.sub} />
      <div className="my-auto space-y-4 py-4">
        <Legend story={story} />
        <Butterfly rows={s.rows} />
      </div>
    </Frame>
  )
}

// ─── Личные встречи ──────────────────────────────────────────────────────────

function H2H({ s, story }: { s: S<'h2h'>; story: StoryData }) {
  const segs = [
    { key: 'home', v: s.wins.home, cls: 'bg-home', name: story.home.name },
    { key: 'draw', v: s.wins.draws, cls: 'bg-tie', name: 'ничьи' },
    { key: 'away', v: s.wins.away, cls: 'bg-away', name: story.away.name },
  ]
  const border = { home: 'border-home', away: 'border-away', draw: 'border-tie' } as const
  return (
    <Frame>
      <Head eyebrow="Личные встречи" title={s.title} sub={s.sub} />
      <div className="my-auto py-4">
        <div className="st-grow-x flex h-10 gap-0.5 overflow-hidden rounded-xl" style={wait(250)}>
          {segs
            .filter((x) => x.v > 0)
            .map((x) => (
              <div key={x.key} className={x.cls} style={{ flexGrow: x.v, flexBasis: 0 }} title={`${x.name}: ${x.v}`} />
            ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {segs.map((x) => (
            <div key={x.key} className="min-w-0">
              <div className="flex items-center justify-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-[3px] ${x.cls}`} aria-hidden />
                <Num value={x.v} format={intFmt} delay={300} className="text-[24px] font-extrabold" />
              </div>
              <div className="truncate text-[12px] text-dim">{x.key === 'draw' ? 'ничьи' : `победы: ${x.name}`}</div>
            </div>
          ))}
        </div>
        <ul className="mt-4 space-y-1.5">
          {s.games.map((g, i) => {
            const [a, b] = g.score.split(':').map(Number)
            return (
              <li
                key={i}
                className={`st-rise grid grid-cols-[4.6rem_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-lg border-l-[3px] bg-panel/70 py-1.5 pl-2 pr-2.5 text-[13px] ${border[g.winner]}`}
                style={wait(500 + i * 80)}
              >
                <span className="num text-[11px] text-mute">{g.date}</span>
                <span className={`truncate text-right ${a > b ? 'font-bold' : 'text-fg/70'}`}>{g.home}</span>
                <span className="num rounded-md bg-panel-3 px-1.5 py-0.5 text-[13px] font-extrabold">{g.score}</span>
                <span className={`truncate ${b > a ? 'font-bold' : 'text-fg/70'}`}>{g.away}</span>
              </li>
            )
          })}
        </ul>
      </div>
    </Frame>
  )
}

// ─── Движение линии: «гантели» открытие → сейчас ─────────────────────────────

function Movement({ s, story }: { s: S<'movement'>; story: StoryData }) {
  const vals = s.rows.flatMap((r) => [r.opening, r.current])
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const pad = (hi - lo) * 0.1 || 0.1
  const x = (v: number) => ((v - (lo - pad)) / (hi - lo + 2 * pad)) * 100
  const names = { home: story.home.name, draw: 'ничья', away: story.away.name }
  return (
    <Frame>
      <Head eyebrow="Движение линии" title={s.title} sub={s.sub} />
      <div className="my-auto space-y-5 py-4">
        {s.rows.map((r, i) => {
          const d = 300 + i * 150
          const a = x(r.opening)
          const b = x(r.current)
          return (
            <div key={r.outcome} className="st-rise" style={wait(d)}>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-[14px] font-bold">
                  {r.label} <span className="font-medium text-dim">· {names[r.outcome]}</span>
                </span>
                <span className="num shrink-0 text-[14px] font-bold">
                  {r.opening.toFixed(2)} → {r.current.toFixed(2)}{' '}
                  <span className="font-semibold text-dim">
                    {r.change <= -0.03 ? <span className="text-hot">▼</span> : r.change >= 0.03 ? '▲' : ''}
                    {r.change > 0 ? '+' : r.change < 0 ? '−' : ''}
                    {Math.abs(Math.round(r.change * 100))}%
                  </span>
                </span>
              </div>
              <div className="relative h-5">
                <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-edge-2" />
                <div
                  className="st-fade absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-hot/40"
                  style={{ left: `${Math.min(a, b)}%`, width: `${Math.abs(a - b)}%`, ...wait(d + 700) }}
                />
                <span
                  className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-hot/55 bg-ink"
                  style={{ left: `${a}%` }}
                  title={`Открытие: ${r.opening.toFixed(2)}`}
                />
                <span
                  className="st-move absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-hot ring-2 ring-ink"
                  style={{ left: `${b}%`, ['--from' as string]: `${a}%`, ...wait(d + 250) }}
                  title={`Сейчас: ${r.current.toFixed(2)}`}
                />
              </div>
            </div>
          )
        })}
        <div className="st-fade flex items-center gap-4 text-[12px] text-dim" style={wait(900)}>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-hot/55" />
            открытие
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-hot" />
            сейчас
          </span>
          <span className="ml-auto">коэффициент →</span>
        </div>
      </div>
    </Frame>
  )
}

// ─── Голы по ходу матча ──────────────────────────────────────────────────────

function GoalsTimeline({ s, story }: { s: S<'goalsTimeline'>; story: StoryData }) {
  let h = 0
  let a = 0
  const rows = s.goals.map((g) => {
    if (g.side === 'home') h++
    else a++
    return { ...g, score: `${h}:${a}` }
  })
  const shown = rows.slice(0, 7)
  const label = (g: (typeof rows)[number]) => (
    <span className={`inline-flex max-w-full items-center gap-1.5 text-[14px] font-semibold ${g.side === 'home' ? 'flex-row-reverse' : ''}`}>
      <Swatch side={g.side} />
      <span className="truncate">{g.player || (g.side === 'home' ? story.home.name : story.away.name)}</span>
      {g.kind === 'penalty' ? <span className="shrink-0 text-[11px] text-dim">пен.</span> : g.kind === 'own-goal' ? <span className="shrink-0 text-[11px] text-dim">автогол</span> : null}
    </span>
  )
  return (
    <Frame>
      <Head eyebrow="Голы" title={s.title} sub={s.sub} />
      <div className="my-auto py-4">
        <Legend story={story} />
        <div className="relative mt-4">
          <div className="st-grow-y absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2 bg-edge-2" style={{ transformOrigin: 'top' }} />
          <ul className="relative space-y-2.5">
            {shown.map((g, i) => (
              <li key={i} className="st-rise grid grid-cols-[1fr_auto_1fr] items-center gap-2.5" style={wait(300 + i * 160)}>
                <span className="flex min-w-0 justify-end">{g.side === 'home' ? label(g) : null}</span>
                <span className="num flex h-10 w-14 flex-col items-center justify-center rounded-lg bg-panel-2 ring-1 ring-inset ring-edge-2">
                  <span className="text-[11px] text-dim">{g.label}</span>
                  <span className="text-[14px] font-extrabold leading-none">{g.score}</span>
                </span>
                <span className="flex min-w-0">{g.side === 'away' ? label(g) : null}</span>
              </li>
            ))}
          </ul>
          {rows.length > shown.length ? <p className="mt-2 text-center text-[12px] text-dim">и ещё {rows.length - shown.length} — в разборе матча</p> : null}
        </div>
      </div>
    </Frame>
  )
}

// ─── Прогноз ─────────────────────────────────────────────────────────────────

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`Уверенность ${value} из 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 20 20" className={`h-4 w-4 ${i <= value ? 'fill-acid' : 'fill-panel-3'}`} aria-hidden>
          <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L10 14.8l-5.2 2.8 1-5.8L1.5 7.7l5.9-.8z" />
        </svg>
      ))}
    </span>
  )
}

function PickSlide({ s }: { s: S<'pick'> }) {
  // для value-прогноза показываем саму суть перевеса: наш шанс выше того, что заложен в коэффициент
  const bars = [
    { key: 'model', label: 'Шанс по расчёту tag.bet', p: s.prob, cls: 'bg-acid' },
    ...(s.value && s.odd ? [{ key: 'book', label: `Шанс, заложенный в кэф ${s.odd.toFixed(2)}`, p: 1 / s.odd, cls: 'bg-tie' }] : []),
  ]
  return (
    <Frame>
      <div className="st-rise flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-acid">
        Прогноз tag.bet
        {s.value ? <span className="rounded-full bg-acid px-2 py-0.5 text-[10px] tracking-normal text-acid-ink">value</span> : null}
      </div>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="st-pop text-[68px] font-black leading-none tracking-tight text-acid" style={wait(150)}>
          {s.label}
        </div>
        <p className="st-rise mt-2 max-w-[19rem] text-[17px] font-semibold leading-snug first-letter:uppercase" style={wait(300)}>
          {s.desc}
        </p>
        <div className="st-fade mt-2 flex items-center gap-2 text-[12px] text-dim" style={wait(400)}>
          уверенность <Stars value={s.confidence} />
        </div>

        <div className="mt-6 w-full space-y-3 text-left">
          {bars.map((b, i) => (
            <div key={b.key} className="st-rise" style={wait(500 + i * 150)}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-[13px]">
                <span className="font-semibold text-fg/90">{b.label}</span>
                <Num value={b.p} format={(v) => `${dec(v * 100)}%`} delay={500 + i * 150} className="text-[16px] font-extrabold" />
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-panel-3">
                <div className={`st-grow-x h-full rounded-full ${b.cls}`} style={{ width: `${b.p * 100}%`, ...wait(500 + i * 150) }} />
              </div>
            </div>
          ))}
        </div>

        <dl className="st-rise mt-5 grid w-full grid-cols-3 gap-2" style={wait(800)}>
          <div className="rounded-xl bg-panel-2 px-1 py-2 ring-1 ring-inset ring-edge">
            <dt className="text-[10px] text-dim">Без маржи</dt>
            <dd className="num text-[17px] font-bold">{s.fairOdd.toFixed(2)}</dd>
          </div>
          <div className="rounded-xl bg-panel-2 px-1 py-2 ring-1 ring-inset ring-edge">
            <dt className="truncate text-[10px] text-dim">{s.bookmaker ? `Кэф · ${s.bookmaker}` : 'Лучший кэф'}</dt>
            <dd className="num text-[17px] font-bold">{s.odd ? s.odd.toFixed(2) : '—'}</dd>
          </div>
          <div className="rounded-xl bg-panel-2 px-1 py-2 ring-1 ring-inset ring-edge">
            <dt className="text-[10px] text-dim">Перевес</dt>
            <dd className={`num text-[17px] font-bold ${s.ev != null && s.ev > 0 ? 'text-acid' : ''}`}>
              {s.ev != null ? `${s.ev >= 0 ? '+' : '−'}${dec(Math.abs(s.ev) * 100)}%` : '—'}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-[11px] text-mute">Расчёт модели, а не гарантия результата. 18+</p>
      </div>
    </Frame>
  )
}

export function Slide({ slide, story }: { slide: StorySlide; story: StoryData }) {
  switch (slide.kind) {
    case 'cover':
      return <Cover s={slide} story={story} />
    case 'odds':
      return <Odds s={slide} story={story} />
    case 'goals':
      return <Goals s={slide} story={story} />
    case 'scores':
      return <Scores s={slide} story={story} />
    case 'form':
      return <Form s={slide} story={story} />
    case 'compare':
      return <Compare s={slide} story={story} eyebrow="Кто сильнее" />
    case 'stats':
      return <Compare s={slide} story={story} eyebrow="Статистика" />
    case 'h2h':
      return <H2H s={slide} story={story} />
    case 'movement':
      return <Movement s={slide} story={story} />
    case 'goalsTimeline':
      return <GoalsTimeline s={slide} story={story} />
    case 'pick':
      return <PickSlide s={slide} />
  }
}
