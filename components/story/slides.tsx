'use client'

import { useEffect, useState } from 'react'
import { SPONSORED_REL } from '@/lib/affiliate'
import { valueThreshold } from '@/lib/model'
import type { CompareRow, FormSide, Side, StoryData, StorySlide, StoryTeam } from '@/lib/story'
import type { StoryFocus } from '@/lib/story-groups'
import type { Res } from '@/lib/stats'
import { split100 } from '@/lib/verdict'
import { TeamLogo } from '../TeamLogo'

/**
 * Слайды сторис. Графики — обычные div/SVG с CSS-анимациями из globals.css
 * (st-*): анимация стартует, когда слайд монтируется. Цвета — как на странице матча:
 * без цветов команд и светофора — у кого больше, тот ярче; лайм — только «выгодно»
 * и переход к букмекеру, красный — только «идёт».
 */

type S<K extends StorySlide['kind']> = Extract<StorySlide, { kind: K }>

/** Сколько показывать слайд, мс (на прогноз — дольше: там решение и кнопка). */
export const SLIDE_MS: Record<StorySlide['kind'], number> = {
  cover: 4500,
  odds: 7000,
  goals: 7500,
  form: 8000,
  stats: 8500,
  goalsTimeline: 7500,
  pick: 10000,
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

function Frame({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full flex-col px-5 pb-2 pt-3">{children}</div>
}

function Head({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="shrink-0">
      <div className="st-rise text-[11px] font-bold uppercase tracking-[0.14em] text-dim">{eyebrow}</div>
      <h2 className="st-rise mt-2 text-[23px] font-bold leading-[1.15] tracking-tight" style={wait(80)}>
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

/** Над колонками — названия команд: хозяева слева, гости справа (без цветов команд — цвет у нас значит «выгодно» и «идёт»). */
function Legend({ story, delay = 200 }: { story: StoryData; delay?: number }) {
  return (
    <div className="st-fade flex items-center justify-between gap-3 text-[13px] font-semibold" style={wait(delay)}>
      <span className="flex min-w-0 items-center gap-2">
        <TeamLogo name={story.home.name} src={story.home.logo} size={20} />
        <span className="truncate">{story.home.name}</span>
      </span>
      <span className="flex min-w-0 items-center justify-end gap-2">
        <span className="truncate">{story.away.name}</span>
        <TeamLogo name={story.away.name} src={story.away.logo} size={20} />
      </span>
    </div>
  )
}

// ─── Обложка ─────────────────────────────────────────────────────────────────

function TeamBig({ team, cls }: { team: StoryTeam; cls: string }) {
  return (
    <div className={`${cls} flex min-w-0 flex-col items-center gap-3`} style={wait(120)}>
      <div className="rounded-full bg-white/[0.08] p-3">
        <TeamLogo name={team.name} src={team.logo} size={64} />
      </div>
      <span className="line-clamp-2 text-[17px] font-bold leading-tight">{team.name}</span>
    </div>
  )
}

function Cover({ s, story, focus }: { s: S<'cover'>; story: StoryData; focus: StoryFocus | null }) {
  const live = story.status === 'live' || story.status === 'suspended'
  const score = story.score && (live || story.status === 'finished') ? story.score : null
  // подборки строками «название — факт»; та, из которой открыли, — первой
  const tags = [...s.tags].sort((a, b) => Number(b.slug === focus?.slug) - Number(a.slug === focus?.slug)).slice(0, 3)
  const time = story.when.match(/\d{1,2}:\d{2}/)?.[0] ?? null
  const day = story.when.split(',')[0]
  const b = s.before
  return (
    <div className="flex h-full flex-col items-center px-6 pb-4 pt-5 text-center">
      <div className="st-fade text-[12.5px] text-dim">
        {story.league}
        {story.round ? ` · ${story.round}` : ''}
      </div>
      <div className="my-auto w-full">
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
          <TeamBig team={story.home} cls="st-slide-l" />
          <div className="st-pop flex h-[90px] flex-col items-center justify-center px-1" style={wait(350)}>
            {score ? (
              <span className="num display-num text-[46px] leading-none">
                {score.home}
                <span className="mx-1 text-dim">:</span>
                {score.away}
              </span>
            ) : (
              <span className="num display-num text-[36px] leading-none">{time ?? '—'}</span>
            )}
            <span className={`mt-1.5 text-[13px] font-semibold ${live ? 'text-live' : 'text-dim'}`}>
              {live ? `${story.elapsed ?? ''}′` : story.status === 'finished' ? 'итог' : day}
            </span>
          </div>
          <TeamBig team={story.away} cls="st-slide-r" />
        </div>
        {s.verdict ? (
          <p className="st-rise mx-auto mt-6 max-w-[20rem] text-[20px] font-bold leading-snug" style={wait(500)}>
            {s.verdict}
          </p>
        ) : null}
        {b ? (
          <p className="st-rise mx-auto mt-6 max-w-[21rem] text-[13.5px] leading-relaxed text-dim" style={wait(500)}>
            До матча: <span className="whitespace-nowrap">«{story.home.name}» {b.home}% ·</span> <span className="whitespace-nowrap">ничья {b.draw}% ·</span>{' '}
            <span className="whitespace-nowrap">«{story.away.name}» {b.away}%</span>
          </p>
        ) : null}
        {tags.length ? (
          <ul className="st-rise mx-auto mt-5 max-w-[21rem] divide-y divide-white/10 rounded-tile bg-white/[0.05] text-left" style={wait(650)}>
            {tags.map((t) => (
              <li key={t.slug} className="px-3.5 py-2.5 text-[13.5px] leading-snug">
                <span className="font-semibold">{t.title}</span>
                <span className="text-fg/75"> — {t.short}</span>
              </li>
            ))}
          </ul>
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

// ─── Кто фаворит: оценка tag.bet и кэфы партнёра ─────────────────────────────

function Odds({ s, story }: { s: S<'odds'>; story: StoryData }) {
  // проценты исходов — в сумме ровно 100; ярче — самый вероятный, как полосы на странице матча
  const n = split100(s.probs)
  const keys = ['home', 'draw', 'away'] as const
  const name = { home: story.home.name, draw: 'Ничья', away: story.away.name }
  const team = { home: story.home, draw: null, away: story.away }
  const max = Math.max(s.probs.home, s.probs.draw, s.probs.away)
  return (
    <Frame>
      <Head eyebrow="Кто фаворит" title={s.title} sub={s.sub} />
      <div className="my-auto py-4">
        <div className="grid h-[min(26dvh,200px)] grid-cols-3 items-end gap-3 border-b border-white/15">
          {keys.map((k, i) => (
            <div key={k} className="flex h-full flex-col items-center justify-end">
              <Num value={n[k] / 100} format={pctFmt} delay={300 + i * 120} className="mb-1.5 text-[26px] font-bold" />
              <div
                className={`st-grow-y w-full rounded-t-[6px] ${s.probs[k] === max ? 'bg-fg/85' : 'bg-white/25'}`}
                style={{ height: `${Math.max(3, (s.probs[k] / max) * 80)}%`, ...wait(300 + i * 120) }}
              />
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          {keys.map((k) => {
            const odd = s.line?.odds[k] ?? null
            const value = odd != null && odd / s.fair[k] - 1 >= valueThreshold(odd)
            return (
              <div key={k} className="min-w-0">
                {/* название до двух строк: «Райо Валье…» не читалось */}
                <div className="flex min-h-[36px] flex-col items-center justify-start gap-1 text-[13.5px] font-bold leading-tight">
                  <span className="line-clamp-2 break-words">{name[k]}</span>
                </div>
                <div className="num mt-1 text-[12px] text-dim">честная {s.fair[k].toFixed(2)}</div>
                {s.line && odd ? (
                  <a
                    href={s.line.href}
                    target="_blank"
                    rel={SPONSORED_REL}
                    title={`${name[k]}: ${odd.toFixed(2)} в ${s.line.partner} · Реклама 18+`}
                    className={`num mt-2 flex h-10 items-center justify-center rounded-ctl text-[16px] font-bold transition-colors ${
                      value ? 'bg-acid text-acid-ink hover:bg-acid/90' : 'bg-white/[0.08] hover:bg-white/[0.14]'
                    }`}
                  >
                    {odd.toFixed(2)}
                  </a>
                ) : null}
              </div>
            )
          })}
        </div>
        {s.line ? <p className="mt-2.5 text-center text-[11.5px] text-dim">Кэфы {s.line.partner} · Реклама · 18+</p> : null}
      </div>
    </Frame>
  )
}

// ─── Голы и вероятный счёт ───────────────────────────────────────────────────

/** Шанс строкой с полосой от края до края — как «Голы и счёт» на странице матча (кольца похожи на значок загрузки). */
function ChanceLine({ p, label, delay }: { p: number; label: string; delay: number }) {
  return (
    <div className="st-rise" style={wait(delay)}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[15px] font-semibold">{label}</span>
        <Num value={p} format={pctFmt} delay={delay} className="text-[20px] font-bold" />
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.09]">
        <div className="st-grow-x h-full rounded-full bg-fg/85" style={{ width: `${p * 100}%`, ...wait(delay + 100) }} />
      </div>
    </div>
  )
}

function Goals({ s, story }: { s: S<'goals'>; story: StoryData }) {
  return (
    <Frame>
      <Head eyebrow="Голы" title={s.title} sub={s.sub} />
      <div className="my-auto space-y-5 py-4">
        {s.over25 != null ? <ChanceLine p={s.over25} label="3 гола и больше" delay={300} /> : null}
        {s.btts != null ? <ChanceLine p={s.btts} label="Обе забьют" delay={450} /> : null}
        {s.scores.length ? (
          <div className="st-rise pt-2" style={wait(650)}>
            <div className="text-[13px] font-semibold text-dim">Вероятный счёт</div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {s.scores.map((x, i) => (
                <div key={i} className={`rounded-tile px-2 py-2.5 text-center ${i === 0 ? 'bg-white/[0.1]' : 'bg-white/[0.05]'}`}>
                  <div className="num display-num text-[24px] leading-none">
                    {x.home}:{x.away}
                  </div>
                  <div className="num mt-1 text-[12px] text-dim">{Math.round(x.p * 100)}%</div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[12px] text-mute">
              Слева — голы «{story.home.name}». Даже самый вероятный счёт сбывается редко.
            </p>
          </div>
        ) : null}
      </div>
    </Frame>
  )
}

// ─── Форма ───────────────────────────────────────────────────────────────────

// результат — яркостью, как «Форма команд» на странице матча: «В» — белая, «Н» — серая, «П» — контур
const RES: Record<Res, { letter: string; cls: string; title: string }> = {
  W: { letter: 'В', cls: 'bg-fg text-ink', title: 'победа' },
  D: { letter: 'Н', cls: 'bg-white/[0.14] text-fg', title: 'ничья' },
  L: { letter: 'П', cls: 'ring-1 ring-inset ring-white/30 text-dim', title: 'поражение' },
}

function FormTeam({ team, f, base }: { team: StoryTeam; f: FormSide | null; base: number }) {
  if (!f) {
    return <div className="rounded-tile bg-white/[0.05] p-3.5 text-[13px] text-dim">Нет свежих матчей: {team.name}</div>
  }
  // в данных свежие первыми, на экране — слева направо по времени
  const last = [...f.last5].reverse()
  const scores = f.scores.slice(0, last.length).reverse()
  return (
    <div className="st-rise rounded-tile bg-white/[0.05] p-3.5" style={wait(base)}>
      <div className="flex items-center gap-2">
        <TeamLogo name={team.name} src={team.logo} size={22} />
        <span className="min-w-0 truncate text-[15px] font-bold">{team.name}</span>
        {f.note ? <span className="ml-auto shrink-0 rounded-full bg-white/[0.08] px-2 py-0.5 text-[11px] font-semibold text-fg/85">{f.note}</span> : null}
      </div>
      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {last.map((r, i) => (
          <div key={i} className="st-pop flex flex-col items-center" style={wait(base + 150 + i * 90)}>
            <span className={`flex h-10 w-full items-center justify-center rounded-ctl text-[15px] font-semibold ${RES[r].cls}`} title={RES[r].title}>
              {RES[r].letter}
            </span>
            <span className="num mt-1 text-[11px] text-dim">{scores[i]}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-3 text-[13px]">
        <span>
          <Num value={f.points5} format={intFmt} delay={base + 500} className="font-bold" /> <span className="text-dim">из 15 очков</span>
        </span>
        <span className="text-dim">
          забивает {dec(f.gfAvg)} · пропускает {dec(f.gaAvg)} <span className="whitespace-nowrap">за игру</span>
        </span>
      </div>
    </div>
  )
}

function Form({ s, story }: { s: S<'form'>; story: StoryData }) {
  return (
    <Frame>
      <Head eyebrow="Форма" title={s.title} sub={s.sub} />
      <div className="my-auto space-y-3 py-4">
        <FormTeam team={story.home} f={s.home} base={250} />
        <FormTeam team={story.away} f={s.away} base={450} />
        <p className="st-fade text-center text-[11px] text-mute" style={wait(900)}>
          В — победа · Н — ничья · П — поражение · последний матч справа
        </p>
      </div>
    </Frame>
  )
}

// ─── Статистика: строки «бабочкой», у кого больше — ярче ─────────────────────

function Butterfly({ rows }: { rows: CompareRow[] }) {
  return (
    <div className="space-y-3">
      {rows.map((r, i) => {
        const max = Math.max(r.home, r.away) || 1
        const d = 250 + i * 110
        const tone = (side: Side) => {
          const mine = side === 'home' ? r.home : r.away
          const other = side === 'home' ? r.away : r.home
          return mine > other ? 'bg-fg/85' : mine < other ? 'bg-white/30' : 'bg-white/55'
        }
        return (
          <div key={r.label} className="st-rise" style={wait(d)}>
            <div className="mb-1 grid grid-cols-[1fr_auto_1fr] items-baseline gap-2">
              <span className={`num text-[17px] font-bold ${r.home < r.away ? 'text-fg/60' : ''}`}>{r.text[0]}</span>
              <span className="text-center text-[12px] font-semibold text-dim">{r.label}</span>
              <span className={`num text-right text-[17px] font-bold ${r.away < r.home ? 'text-fg/60' : ''}`}>{r.text[1]}</span>
            </div>
            <div className="grid grid-cols-2 gap-0.5">
              <div className="flex justify-end rounded-l-full bg-white/[0.09]">
                <div className={`st-grow-x-rev h-2 rounded-l-full ${tone('home')}`} style={{ width: `${(r.home / max) * 100}%`, ...wait(d + 100) }} />
              </div>
              <div className="flex rounded-r-full bg-white/[0.09]">
                <div className={`st-grow-x h-2 rounded-r-full ${tone('away')}`} style={{ width: `${(r.away / max) * 100}%`, ...wait(d + 100) }} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Stats({ s, story }: { s: S<'stats'>; story: StoryData }) {
  return (
    <Frame>
      <Head eyebrow="Статистика" title={s.title} sub={s.sub} />
      <div className="my-auto space-y-4 py-4">
        <Legend story={story} />
        <Butterfly rows={s.rows} />
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
      <span className="truncate">{g.player || (g.kind === 'own-goal' ? 'Автогол' : 'Гол')}</span>
      {g.kind === 'penalty' ? <span className="shrink-0 text-[11px] text-dim">пен.</span> : g.kind === 'own-goal' && g.player ? <span className="shrink-0 text-[11px] text-dim">автогол</span> : null}
    </span>
  )
  return (
    <Frame>
      <Head eyebrow="Голы" title={s.title} sub={s.sub} />
      <div className="my-auto py-4">
        <Legend story={story} />
        <div className="relative mt-4">
          <div className="st-grow-y absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2 bg-white/15" style={{ transformOrigin: 'top' }} />
          <ul className="relative space-y-2.5">
            {shown.map((g, i) => (
              <li key={i} className="st-rise grid grid-cols-[1fr_auto_1fr] items-center gap-2.5" style={wait(300 + i * 160)}>
                <span className="flex min-w-0 justify-end">{g.side === 'home' ? label(g) : null}</span>
                <span className="num flex h-10 w-14 flex-col items-center justify-center rounded-ctl bg-white/[0.1]">
                  <span className="text-[11px] text-dim">{g.label}</span>
                  <span className="text-[14px] font-bold leading-none">{g.score}</span>
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

function PickSlide({ s }: { s: S<'pick'> }) {
  // у выгодной ставки — суть перевеса: наш шанс выше того, что заложен в кэф
  const bars = [
    { key: 'model', label: 'Шанс по оценке tag.bet', p: s.prob, cls: s.value ? 'bg-acid' : 'bg-fg/85' },
    ...(s.odd ? [{ key: 'book', label: `Шанс, заложенный в кэф ${s.odd.toFixed(2)}`, p: 1 / s.odd, cls: 'bg-white/30' }] : []),
  ]
  const tiles = [
    { k: 'Честная цена', v: s.fairOdd.toFixed(2), cls: '' },
    ...(s.odd ? [{ k: s.bookmaker ? `Кэф ${s.bookmaker}` : 'Кэф', v: s.odd.toFixed(2), cls: '' }] : []),
    ...(s.value && s.ev != null ? [{ k: 'Выгода', v: `+${dec(s.ev * 100)}%`, cls: 'text-good' }] : []),
  ]
  return (
    <Frame>
      <div className="st-rise text-[11px] font-bold uppercase tracking-[0.14em] text-dim">{s.value ? 'Выгодная ставка' : 'Наш выбор'}</div>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className={`st-pop max-w-[20rem] text-[32px] font-bold leading-[1.1] tracking-tight ${s.value ? 'text-good' : ''}`} style={wait(150)}>
          {s.label}
        </div>
        <p className="st-rise mt-2 max-w-[19rem] text-[16px] font-semibold leading-snug text-fg/90" style={wait(300)}>
          {s.desc}
        </p>
        <div className="mt-6 w-full space-y-3 text-left">
          {bars.map((b, i) => (
            <div key={b.key} className="st-rise" style={wait(450 + i * 150)}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-[13px]">
                <span className="font-semibold text-fg/90">{b.label}</span>
                <Num value={b.p} format={(v) => `${Math.round(v * 100)}%`} delay={450 + i * 150} className="text-[16px] font-bold" />
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.09]">
                <div className={`st-grow-x h-full rounded-full ${b.cls}`} style={{ width: `${b.p * 100}%`, ...wait(450 + i * 150) }} />
              </div>
            </div>
          ))}
        </div>
        <dl className="st-rise mt-5 grid w-full gap-2" style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))`, ...wait(750) }}>
          {tiles.map((t) => (
            <div key={t.k} className="rounded-tile bg-white/[0.06] px-1 py-2">
              <dt className="truncate text-[11px] text-dim">{t.k}</dt>
              <dd className={`num text-[17px] font-bold ${t.cls}`}>{t.v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[11px] text-mute">Оценка, а не гарантия результата · 18+</p>
      </div>
    </Frame>
  )
}

export function Slide({ slide, story, focus = null }: { slide: StorySlide; story: StoryData; focus?: StoryFocus | null }) {
  switch (slide.kind) {
    case 'cover':
      return <Cover s={slide} story={story} focus={focus} />
    case 'odds':
      return <Odds s={slide} story={story} />
    case 'goals':
      return <Goals s={slide} story={story} />
    case 'form':
      return <Form s={slide} story={story} />
    case 'stats':
      return <Stats s={slide} story={story} />
    case 'goalsTimeline':
      return <GoalsTimeline s={slide} story={story} />
    case 'pick':
      return <PickSlide s={slide} />
  }
}
