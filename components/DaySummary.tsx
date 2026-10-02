import Link from 'next/link'
import type { FeedItem } from '@/lib/data'
import { summaryCards, type CardKind, type DayState, type DaySummary as Summary } from '@/lib/day-summary'
import { formatTime, plural } from '@/lib/format'
import { matchHref } from '@/lib/links'
import { fair1x2 } from '@/lib/odds'
import { bestTag, isLive } from '@/lib/rank'
import { TAG_BY_SLUG } from '@/lib/tags'
import type { Match } from '@/lib/types'
import { StoryLink } from './story/StoryLink'
import { TeamLogo } from './TeamLogo'

const edge = (ev: number) => `${ev >= 0 ? '+' : '−'}${Math.abs(ev * 100).toFixed(1).replace('.', ',')}%`
const SIDE = { home: 'П1', draw: 'Х', away: 'П2' } as const
const WHY_TONE = { accent: 'text-acid', hot: 'text-hot', neutral: 'text-chalk' } as const
const names = (m: Match) => `${m.home.name} — ${m.away.name}`
/** Ссылка-накладка: вся карточка кликабельна, а текст ссылки — понятное название. */
const COVER = "after:absolute after:inset-0 after:rounded-[24px] after:content-['']"

/**
 * Вид сводки: «спокойный» — тёмные плитки и одна лаймовая; «цветной» — ещё янтарная.
 * Цвет плитки — только со смыслом (лайм — value, янтарь — прогруз): белых плиток на тёмной теме нет.
 */
export type SummaryLook = 'calm' | 'blocks'

// ─── Тон плитки: цвета текста и графиков задаются переменными ────────────────

type Tone = 'plain' | 'lime' | 'amber'

const TONES: Record<Tone, { cls: string; vars: Record<string, string> }> = {
  plain: {
    cls: 'border-edge bg-panel shadow-[inset_0_1px_0_rgb(255_255_255/0.035)] hover:border-edge-2',
    vars: { '--t-fg': 'var(--color-fg)', '--t-label': 'var(--color-chalk)', '--t-sub': 'var(--color-dim)', '--t-mut': 'rgb(255 255 255 / 0.08)', '--t-chip': 'rgb(255 255 255 / 0.06)' },
  },
  lime: {
    cls: 'border-acid bg-acid hover:brightness-[1.04]',
    vars: { '--t-fg': '#141a00', '--t-label': 'rgb(20 26 0 / 0.75)', '--t-sub': 'rgb(20 26 0 / 0.62)', '--t-mut': 'rgb(20 26 0 / 0.14)', '--t-chip': 'rgb(20 26 0 / 0.09)' },
  },
  amber: {
    cls: 'border-hot bg-hot hover:brightness-[1.04]',
    vars: { '--t-fg': '#1d1300', '--t-label': 'rgb(29 19 0 / 0.75)', '--t-sub': 'rgb(29 19 0 / 0.62)', '--t-mut': 'rgb(29 19 0 / 0.15)', '--t-chip': 'rgb(29 19 0 / 0.09)' },
  },
}

/** Какие плитки цветные в каждом виде. */
const LOOK_TONES: Record<SummaryLook, Partial<Record<CardKind, Tone>>> = {
  calm: { value: 'lime' },
  blocks: { value: 'lime', progruz: 'amber' },
}

// ─── Иконки (как в системных виджетах: тонкая линия, 16px) ──────────────────

const ICONS = {
  percent: (
    <>
      <path d="M19 5 5 19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </>
  ),
  down: (
    <>
      <path d="m22 17-8.5-8.5-5 5L2 7" />
      <path d="M16 17h6v-6" />
    </>
  ),
  pulse: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  ball: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m12 7 4.3 3.1-1.6 5H9.3l-1.6-5z" />
    </>
  ),
  star: <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </>
  ),
} as const

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[name]}
    </svg>
  )
}

// ─── Рамка и крупная цифра ───────────────────────────────────────────────────

/** Плитка: подпись и иконка сверху, цифра — сразу под ними, график — внизу. */
function Tile({ tone = 'plain', label, icon, children }: { tone?: Tone; label: React.ReactNode; icon: keyof typeof ICONS; children: React.ReactNode }) {
  const t = TONES[tone]
  return (
    <article
      style={t.vars as React.CSSProperties}
      className={`relative flex h-full min-h-[168px] min-w-0 flex-col rounded-[24px] border p-4 text-[var(--t-fg)] transition-[border-color,filter] duration-300 sm:min-h-[176px] sm:px-5 sm:py-[18px] ${t.cls}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 truncate text-[13.5px] font-medium text-[var(--t-label)]">{label}</span>
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--t-chip)]">
          <Icon name={icon} />
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col pt-3">{children}</div>
    </article>
  )
}

/** Крупная цифра: полужирная и плотная, как в системных виджетах. */
function Big({ children, unit, className = '' }: { children: React.ReactNode; unit?: React.ReactNode; className?: string }) {
  return (
    <div className="flex min-w-0 items-baseline gap-1.5">
      <span className={`num text-[34px] font-semibold leading-none tracking-[-0.05em] sm:text-[37px] ${className}`}>{children}</span>
      {unit ? <span className="truncate text-[13.5px] font-medium text-[var(--t-sub)]">{unit}</span> : null}
    </div>
  )
}

function MatchLink({ it }: { it: FeedItem }) {
  return (
    <StoryLink id={it.match.id} href={matchHref(it.match)} className={`mt-1.5 block truncate text-[14px] font-semibold ${COVER}`}>
      {names(it.match)}
    </StoryLink>
  )
}

/** Низ плитки: график прижат к нижнему краю. */
const Foot = ({ children }: { children: React.ReactNode }) => <div className="mt-auto pt-3">{children}</div>

// ─── Мини-графики ────────────────────────────────────────────────────────────

/**
 * Value: одна полоска длиной в кэф букмекера; светлая часть — честная цена,
 * тёмный хвост — то, сколько платят сверх неё, то есть перевес.
 */
function EdgeBar({ label, odd, fair }: { label: string; odd: number; fair: number }) {
  const share = Math.min(1, fair / odd)
  return (
    <div aria-hidden>
      <div className="num flex items-baseline justify-between text-[12px]">
        <span className="text-[var(--t-sub)]">честно {fair.toFixed(2)}</span>
        <span className="font-semibold">
          {label} {odd.toFixed(2)}
        </span>
      </div>
      <div className="mt-1.5 flex h-2.5 gap-0.5">
        <span className="rounded-l-full bg-[var(--t-mut)]" style={{ width: `${share * 100}%` }} />
        <span className="flex-1 rounded-r-full bg-[var(--t-fg)]" />
      </div>
    </div>
  )
}

/** Прогруз: наклон от кэфа на открытии к нынешнему — две точки и прямая между ними, цифры по краям. */
function Slope({ side, from, to, color }: { side: string; from: number; to: number; color: string }) {
  const gid = color === 'var(--t-fg)' ? 'ds-slope-ink' : 'ds-slope-hot'
  const drop = 1 - to / from
  const y1 = 6
  const y2 = Math.min(40, 6 + Math.max(0.3, drop / 0.3) * 34)
  return (
    <div className="num flex items-center gap-2.5 text-[12px]" aria-hidden>
      <span className="shrink-0 text-[var(--t-sub)]">
        {side} {from.toFixed(2)}
      </span>
      <div className="relative h-11 min-w-0 flex-1">
        <svg viewBox="0 0 100 44" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity="0.3" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`M3 ${y1} L97 ${y2} L97 44 L3 44 Z`} fill={`url(#${gid})`} />
          <path d={`M3 ${y1} L97 ${y2}`} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        </svg>
        <span className="absolute left-[3%] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--t-sub)]" style={{ top: `${(y1 / 44) * 100}%` }} />
        <span className="absolute left-[97%] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ top: `${(y2 / 44) * 100}%`, background: color }} />
      </div>
      <span className="shrink-0 font-semibold" style={{ color }}>
        {to.toFixed(2)}
      </span>
    </div>
  )
}

const DOT: Record<DayState, string> = {
  done: 'bg-[var(--t-mut)]',
  live: 'bg-live',
  next: 'bg-[var(--t-fg)]',
}

/** Матчи по часам: колонка точек на каждый час — сыгран (бледная), идёт (красная), впереди (яркая). */
function HourDots({ hours }: { hours: Summary['hours'] }) {
  if (!hours.length) return null
  const all = hours.flatMap((h) => h.states)
  const n = (k: DayState) => all.filter((s) => s === k).length
  // точки мельче, только если в какой-то час очень много матчей: ни один матч не теряем
  const rows = Math.ceil(Math.max(...hours.map((h) => h.states.length)) / 2)
  const gap = 2
  const dot = Math.max(3, Math.min(7, Math.floor((36 - (rows - 1) * gap) / rows)))
  const legend: [DayState, string][] = [
    ['live', `${n('live')} ${plural(n('live'), ['идёт', 'идут', 'идут'])}`],
    ['next', `${n('next')} впереди`],
    ['done', `${n('done')} ${plural(n('done'), ['сыгран', 'сыграно', 'сыграно'])}`],
  ]
  return (
    <div>
      <div className="flex h-9 items-end justify-between gap-[3px]" aria-hidden>
        {hours.map((h) => (
          // точки часа — парами снизу вверх: так колонка ниже, а точки крупнее
          <div key={h.hour} className="flex h-full min-w-0 flex-1 justify-center">
            <div className="flex h-full flex-wrap-reverse content-start" style={{ width: dot * 2 + gap, gap }}>
              {h.states.map((st, i) => (
                <span key={i} className={`shrink-0 rounded-full ${DOT[st]}`} style={{ width: dot, height: dot }} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="num mt-1.5 flex justify-between text-[11px] text-[var(--t-sub)]">
        <span>{String(hours[0].hour).padStart(2, '0')}:00</span>
        <span>{String(hours[hours.length - 1].hour).padStart(2, '0')}:00</span>
      </div>
      {/* подпись нужна, только если точки разного вида */}
      {legend.filter(([k]) => n(k)).length > 1 ? (
        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11.5px] text-[var(--t-sub)]">
          {legend
            .filter(([k]) => n(k))
            .map(([k, t]) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${DOT[k]}`} />
                {t}
              </span>
            ))}
        </p>
      ) : null}
    </div>
  )
}

/** Точки-шкала: 10 точек, закрашено — шанс в десятках процентов. */
function DotGauge({ p }: { p: number }) {
  const on = Math.round(p * 10)
  return (
    <span className="inline-flex shrink-0 gap-[2.5px]" aria-hidden>
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < on ? 'bg-[var(--t-fg)]' : 'bg-[var(--t-mut)]'}`} />
      ))}
    </span>
  )
}

/** Турниры дня — полоски в дорожках с числом матчей. */
function LeagueBars({ leagues }: { leagues: Summary['topLeagues'] }) {
  const most = Math.max(...leagues.map((l) => l.count))
  return (
    <ul className="space-y-2">
      {leagues.slice(0, 3).map((l) => (
        <li key={l.id}>
          <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
            <span className="min-w-0 truncate text-[var(--t-label)]">{l.name}</span>
            <span className="num shrink-0 font-semibold">{l.count}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-[var(--t-mut)]" aria-hidden>
            <div className="h-full rounded-full bg-[var(--t-fg)]" style={{ width: `${(l.count / most) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Кольцо одного значения: доля круга = шанс. */
function Ring({ p, size = 52 }: { p: number; size?: number }) {
  const r = 22
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 52 52" width={size} height={size} className="shrink-0 -rotate-90" aria-hidden>
      <circle cx="26" cy="26" r={r} fill="none" stroke="var(--t-mut)" strokeWidth="6" />
      <circle cx="26" cy="26" r={r} fill="none" stroke="var(--t-fg)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${c * p} ${c}`} />
    </svg>
  )
}

const SEG = { home: 'var(--color-home)', draw: 'var(--color-tie)', away: 'var(--color-away)' } as const

/** Кольцо матча дня: П1 / Х / П2 долями круга, в центре — шанс фаворита. */
function ChanceRing({ cells, size }: { cells: { k: keyof typeof SEG; p: number }[]; size: number }) {
  const r = 50
  const c = 2 * Math.PI * r
  const gap = 5
  let start = 0
  const fav = cells.reduce((a, b) => (b.p > a.p ? b : a))
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgb(255 255 255 / 0.05)" strokeWidth="13" />
        {cells.map((cell) => {
          const len = cell.p * c
          const el = (
            <circle
              key={cell.k}
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke={SEG[cell.k]}
              strokeWidth="13"
              strokeDasharray={`${Math.max(0, len - gap)} ${c - len + gap}`}
              strokeDashoffset={-(start + gap / 2)}
            />
          )
          start += len
          return el
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="num text-[30px] font-semibold leading-none tracking-[-0.04em] sm:text-[34px]">
            {Math.round(fav.p * 100)}
            <span className="text-[0.5em] text-dim">%</span>
          </div>
          <div className="mt-1 text-[11.5px] text-dim">шанс {SIDE[fav.k]}</div>
        </div>
      </div>
    </div>
  )
}

/** «через 40 мин», «через 3 ч» — коротко, чтобы влезало в плитку на телефоне. */
const until = (ts: number) => {
  const min = Math.round((ts - Date.now()) / 60_000)
  if (min <= 0) return 'вот-вот начнётся'
  if (min < 60) return `через ${min} мин`
  return `через ${Math.round(min / 60)} ч`
}

// ─── Виджеты ─────────────────────────────────────────────────────────────────

function Card({ kind, s, tone, wide = false }: { kind: CardKind; s: Summary; tone?: Tone; wide?: boolean }) {
  switch (kind) {
    case 'value': {
      const it = s.value!
      const p = it.summary!.pick!
      return (
        <Tile tone={tone} label="Value дня" icon="percent">
          <Big>{edge(p.ev ?? 0)}</Big>
          <MatchLink it={it} />
          <Foot>{p.odd ? <EdgeBar label={p.label} odd={p.odd} fair={1 / p.prob} /> : null}</Foot>
        </Tile>
      )
    }
    case 'progruz': {
      const g = s.progruz!
      const color = tone === 'amber' ? 'var(--t-fg)' : 'var(--color-hot)'
      return (
        <Tile tone={tone} label="Прогруз дня" icon="down">
          <Big className={tone === 'amber' ? '' : 'text-hot'}>−{Math.round(g.drop * 100)}%</Big>
          <MatchLink it={g.item} />
          <Foot>
            <Slope side={SIDE[g.side]} from={g.from} to={g.to} color={color} />
          </Foot>
        </Tile>
      )
    }
    case 'live':
      return (
        <Tile
          tone={tone}
          icon="pulse"
          label={
            <>
              <span className="h-1.5 w-1.5 shrink-0 animate-pulse-live rounded-full bg-live" />
              Сейчас в игре
            </>
          }
        >
          <a href="#live" className={`block ${COVER}`}>
            <Big unit={plural(s.liveCount, ['матч', 'матча', 'матчей'])}>{s.liveCount}</Big>
          </a>
          <Foot>
            <ul className="space-y-2">
              {s.live.slice(0, 2).map(({ match: m }) => (
                <li key={m.id} className="min-w-0 text-[12.5px]">
                  <div className="flex min-w-0 items-baseline gap-2">
                    <span className="num w-7 shrink-0 text-live">{m.statusCode === 4 ? 'Пер' : m.elapsed ? `${m.elapsed}′` : ''}</span>
                    <span className="min-w-0 truncate text-[var(--t-label)]">
                      {m.home.name} <span className="num font-semibold text-[var(--t-fg)]">{m.score ? `${m.score.home}:${m.score.away}` : '–'}</span> {m.away.name}
                    </span>
                  </div>
                  {/* сколько матча уже сыграно */}
                  <div className="ml-9 mt-1 h-1 rounded-full bg-[var(--t-mut)]" aria-hidden>
                    <div className="h-full rounded-full bg-live" style={{ width: `${Math.min(100, ((m.elapsed ?? 45) / 90) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Foot>
        </Tile>
      )
    case 'next': {
      const it = s.next!
      return (
        <Tile tone={tone} label={s.liveCount ? 'Следующий матч' : 'Первый матч'} icon="clock">
          <Big unit={<span className="hidden sm:inline">{until(it.match.ts)}</span>}>{formatTime(it.match.ts)}</Big>
          <MatchLink it={it} />
          <p className="mt-0.5 truncate text-[12.5px] text-[var(--t-sub)] sm:hidden">{until(it.match.ts)}</p>
          <Foot>
            <HourDots hours={s.hours} />
          </Foot>
        </Tile>
      )
    }
    case 'goals': {
      const g = s.goals!
      return (
        <Tile tone={tone} label="Ждём голов" icon="ball">
          <Link href="/tag/tb-2-5" prefetch={false} className={`block ${COVER}`}>
            <Big
              unit={
                <>
                  {plural(g.count, ['матч', 'матча', 'матчей'])} с <span className="opacity-70">#</span>ТБ2.5
                </>
              }
            >
              {g.count}
            </Big>
          </Link>
          <Foot>
            <ul className="space-y-2">
              {g.list.slice(0, 2).map((row, i) => (
                <li key={row.id} className={`${i ? 'hidden sm:flex' : 'flex'} min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[12px] sm:flex-nowrap`}>
                  <span className="min-w-0 basis-full truncate text-[var(--t-label)] sm:basis-auto sm:flex-1">{row.title}</span>
                  <DotGauge p={row.p} />
                  <span className="num w-8 shrink-0 text-right font-semibold">{Math.round(row.p * 100)}%</span>
                </li>
              ))}
            </ul>
          </Foot>
        </Tile>
      )
    }
    case 'favorite': {
      const f = s.favorite!
      return (
        <Tile tone={tone} label="Фаворит дня" icon="star">
          <div className="flex items-center justify-between gap-3">
            <Big unit="%">{Math.round(f.p * 100)}</Big>
            <Ring p={f.p} />
          </div>
          <MatchLink it={f.item} />
          <p className="mt-0.5 truncate text-[12.5px] text-[var(--t-sub)]">
            {SIDE[f.side]} · победа: {f.side === 'home' ? f.item.match.home.name : f.item.match.away.name}
          </p>
        </Tile>
      )
    }
    case 'count':
      return (
        <Tile tone={tone} label="Всего за день" icon="calendar">
          <a href="#matches" className={`block ${COVER}`}>
            <Big unit={`${plural(s.total, ['матч', 'матча', 'матчей'])} · ${s.leagues} ${plural(s.leagues, ['турнир', 'турнира', 'турниров'])}`}>{s.total}</Big>
          </a>
          <Foot>
            <div className={wide ? 'grid gap-x-10 gap-y-4 sm:grid-cols-2 sm:items-end' : ''}>
              <HourDots hours={s.hours} />
              {wide && s.topLeagues.length ? (
                <div className="hidden min-w-0 sm:block">
                  <LeagueBars leagues={s.topLeagues} />
                </div>
              ) : null}
            </div>
          </Foot>
        </Tile>
      )
  }
}

/** Главный виджет: матч дня — команды, почему он главный, кольцо шансов и кэфы. */
function TopCard({ it }: { it: FeedItem }) {
  const m = it.match
  const live = isLive(m)
  const played = Boolean(m.score) && (live || m.status === 'finished')
  const f = fair1x2(m.odds?.x12)
  const pick = m.status === 'scheduled' ? it.summary?.pick : null
  const hotKey = pick?.kind === 'value' ? pick.key : null
  const cells = f ? (['home', 'draw', 'away'] as const).map((k) => ({ k, p: f[k], odd: m.odds?.x12?.[k]?.value ?? null })) : null
  // почему это матч дня — самый весомый тег и его объяснение
  const best = bestTag(it.tags)
  const def = best ? TAG_BY_SLUG.get(best.slug) : undefined
  const team = (t: Match['home'], goals: number | undefined, dim = false) => (
    <span className={`flex min-w-0 items-center gap-3 ${dim ? 'text-chalk' : ''}`}>
      <TeamLogo name={t.name} src={t.logo} size={28} />
      <span className="min-w-0 flex-1 truncate">{t.name}</span>
      {played ? <span className={`num shrink-0 text-[26px] font-semibold ${live ? 'text-live' : 'text-fg'}`}>{goals}</span> : null}
    </span>
  )
  return (
    <article className="relative col-span-2 flex min-w-0 flex-col rounded-[24px] border border-edge bg-panel p-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.035)] transition-colors duration-300 hover:border-edge-2 sm:p-6 lg:row-span-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13.5px] font-medium text-chalk">Матч дня</p>
          <p className="mt-0.5 truncate text-[12.5px] text-mute">{m.league.name}</p>
        </div>
        <span
          className={`num inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ${
            live ? 'bg-live/10 text-live' : 'bg-white/[0.06] text-chalk'
          }`}
        >
          {live ? <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-live" /> : null}
          {live ? (m.statusCode === 4 ? 'перерыв' : m.elapsed ? `${m.elapsed}′` : 'идёт') : m.status === 'finished' ? 'итог' : formatTime(m.ts)}
        </span>
      </div>

      <div className="mt-5 grid items-center gap-5 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <StoryLink id={m.id} href={matchHref(m)} className={`block space-y-2 text-[20px] font-semibold leading-tight tracking-[-0.025em] sm:text-[23px] ${COVER}`}>
            {team(m.home, m.score?.home)}
            {team(m.away, m.score?.away, true)}
          </StoryLink>
          {best && def ? (
            <p className="mt-3.5 line-clamp-3 text-[13px] leading-snug text-dim">
              <span className={WHY_TONE[def.kind]}>{def.label}</span> · {best.reason}
            </p>
          ) : null}
        </div>
        {cells ? (
          <span className="hidden sm:block">
            <ChanceRing cells={cells} size={156} />
          </span>
        ) : null}
      </div>

      {cells ? (
        // на телефоне кольцо — слева от кэфов, на компьютере кэфы — строкой внизу
        <div className="relative z-10 mt-auto grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 pt-5 sm:block">
          <span className="sm:hidden">
            <ChanceRing cells={cells} size={104} />
          </span>
          <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:flex-wrap sm:gap-2" aria-label="Шансы без маржи и кэфы">
            {cells.map((c) => {
              const hot = c.k === hotKey
              return (
                <span
                  key={c.k}
                  className={`num inline-flex h-8 items-center gap-2 rounded-full pl-3 pr-3.5 text-[13px] sm:h-9 ${hot ? 'bg-acid text-acid-ink' : 'bg-white/[0.06] text-fg'}`}
                  title={hot ? 'Кэф выше честного' : undefined}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: SEG[c.k] }} />
                  <span className={hot ? '' : 'text-dim'}>{SIDE[c.k]}</span>
                  <span className="font-semibold">{c.odd ? c.odd.toFixed(2) : '—'}</span>
                  <span className={hot ? 'opacity-60' : 'text-mute'}>{Math.round(c.p * 100)}%</span>
                </span>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="mt-auto" />
      )}

      <div className="mt-4 flex items-center justify-between gap-3 text-[13px]">
        <span aria-hidden className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] py-1.5 pl-1.5 pr-3.5 font-medium text-fg">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-acid text-acid-ink">
            <svg viewBox="0 0 12 12" className="ml-px h-2.5 w-2.5" fill="currentColor">
              <path d="M3 1.5v9l7.5-4.5z" />
            </svg>
          </span>
          Матч в слайдах
        </span>
        {pick ? (
          <span className={`truncate ${pick.kind === 'value' ? 'text-acid' : 'text-dim'}`}>
            Прогноз {pick.label}
            {pick.odd ? <span className="num ml-1 font-semibold">{pick.odd.toFixed(2)}</span> : null}
          </span>
        ) : null}
      </div>
    </article>
  )
}

/**
 * Порядок плиток на экране: value — первой, прогруз — последним (наискосок от value,
 * чтобы цветные плитки не стояли рядом); растянутой в ряд всегда идёт «Всего за день».
 */
function arrange(cards: CardKind[]): CardKind[] {
  const order: CardKind[] = ['value', 'live', 'goals', 'next', 'favorite', 'progruz', 'count']
  return [...cards].sort((a, b) => order.indexOf(a) - order.indexOf(b))
}

/**
 * «Сводка дня» — виджеты под кружками историй: большой «Матч дня» и до четырёх
 * маленьких, у каждого — свой мини-график. Каждый открывает сторис матча или нужный блок.
 */
export function DaySummary({ s, look = 'calm', className = '' }: { s: Summary; look?: SummaryLook; className?: string }) {
  if (!s.top) return null
  const cards = arrange(summaryCards(s))
  const tones = LOOK_TONES[look]
  return (
    <section aria-label="Сводка дня" className={`grid grid-cols-2 gap-3 lg:grid-cols-4 ${className}`}>
      <TopCard it={s.top} />
      {cards.map((k, i) => {
        // карточек меньше четырёх — последние растягиваем, чтобы в сетке не было дыр
        const wide = cards.length <= 2 || (cards.length === 3 && i === 2)
        return (
          <div key={k} className={`min-w-0 ${wide ? 'col-span-2' : ''} ${cards.length === 2 ? 'lg:col-span-2' : ''}`}>
            <Card kind={k} s={s} tone={tones[k]} wide={wide} />
          </div>
        )
      })}
    </section>
  )
}
