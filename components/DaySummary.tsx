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

type Tone = 'plain' | 'lime'

/** Рамка виджета: подпись и иконка сверху, цифра и график — ниже. */
function Tile({ tone = 'plain', label, icon, children }: { tone?: Tone; label: React.ReactNode; icon: keyof typeof ICONS; children: React.ReactNode }) {
  const lime = tone === 'lime'
  return (
    <article
      className={`relative flex h-full min-h-[168px] min-w-0 flex-col rounded-[24px] border p-4 transition-[border-color,filter] duration-300 sm:min-h-[180px] sm:p-5 ${
        lime
          ? 'border-acid bg-acid text-acid-ink hover:brightness-[1.04]'
          : 'border-edge bg-panel shadow-[inset_0_1px_0_rgb(255_255_255/0.035)] hover:border-edge-2'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`flex min-w-0 items-center gap-1.5 truncate text-[13.5px] font-medium ${lime ? 'text-acid-ink/70' : 'text-chalk'}`}>{label}</span>
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${lime ? 'bg-acid-ink/10 text-acid-ink' : 'bg-white/[0.05] text-dim'}`}>
          <Icon name={icon} />
        </span>
      </div>
      <div className="mt-auto min-w-0 pt-3">{children}</div>
    </article>
  )
}

/** Крупная цифра: не жирная, а плотная и спокойная — как в системных виджетах. */
function Big({ children, unit, className = '' }: { children: React.ReactNode; unit?: React.ReactNode; className?: string }) {
  return (
    <div className="flex min-w-0 items-baseline gap-1.5">
      <span className={`num text-[34px] font-semibold leading-none tracking-[-0.05em] sm:text-[40px] ${className}`}>{children}</span>
      {unit ? <span className="truncate text-[13.5px] font-medium opacity-60">{unit}</span> : null}
    </div>
  )
}

function MatchLink({ it, className = '' }: { it: FeedItem; className?: string }) {
  return (
    <StoryLink id={it.match.id} href={matchHref(it.match)} className={`mt-2 block truncate text-[14px] font-semibold ${COVER} ${className}`}>
      {names(it.match)}
    </StoryLink>
  )
}

// ─── Мини-графики ────────────────────────────────────────────────────────────

/**
 * Value: одна полоска длиной в кэф букмекера; светлая часть — честная цена,
 * тёмный хвост — то, сколько платят сверх неё, то есть перевес.
 */
function EdgeBar({ label, odd, fair }: { label: string; odd: number; fair: number }) {
  const share = Math.min(1, fair / odd)
  return (
    <div className="mt-3" aria-hidden>
      <div className="num flex items-baseline justify-between text-[12px]">
        <span className="text-acid-ink/65">честно {fair.toFixed(2)}</span>
        <span className="font-semibold">
          {label} {odd.toFixed(2)}
        </span>
      </div>
      <div className="mt-1.5 flex h-2 gap-0.5">
        <span className="rounded-l-full bg-acid-ink/25" style={{ width: `${share * 100}%` }} />
        <span className="flex-1 rounded-r-full bg-acid-ink" />
      </div>
    </div>
  )
}

/** Прогруз: наклон от кэфа на открытии к нынешнему — две точки и прямая между ними, цифры по краям. */
function Slope({ side, from, to }: { side: string; from: number; to: number }) {
  // верхняя точка — открытие, нижняя — нынешний кэф; падение рисуем в масштабе
  const drop = 1 - to / from
  const y1 = 5
  const y2 = Math.min(31, 5 + Math.max(0.3, drop / 0.3) * 26)
  return (
    <div className="num mt-3 flex items-center gap-2.5 text-[12px]" aria-hidden>
      <span className="shrink-0 text-dim">
        {side} {from.toFixed(2)}
      </span>
      <div className="relative h-9 min-w-0 flex-1">
        <svg viewBox="0 0 100 36" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
          <defs>
            <linearGradient id="ds-slope" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--color-hot)" stopOpacity="0.26" />
              <stop offset="1" stopColor="var(--color-hot)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`M3 ${y1} L97 ${y2} L97 36 L3 36 Z`} fill="url(#ds-slope)" />
          <path d={`M3 ${y1} L97 ${y2}`} fill="none" stroke="var(--color-hot)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        </svg>
        <span className="absolute left-[3%] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-chalk ring-2 ring-panel" style={{ top: `${(y1 / 36) * 100}%` }} />
        <span className="absolute left-[97%] h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-hot ring-2 ring-panel" style={{ top: `${(y2 / 36) * 100}%` }} />
      </div>
      <span className="shrink-0 font-semibold text-hot">{to.toFixed(2)}</span>
    </div>
  )
}

const DOT: Record<DayState, string> = {
  done: 'bg-panel-3',
  live: 'bg-live',
  next: 'border border-edge-2',
}

/** Точки дня: по точке на матч в порядке начала — сыгран, идёт, впереди. */
function DayDots({ timeline }: { timeline: DayState[] }) {
  const n = (k: DayState) => timeline.filter((s) => s === k).length
  const legend: [DayState, string][] = [
    ['done', `${n('done')} ${plural(n('done'), ['сыгран', 'сыграно', 'сыграно'])}`],
    ['live', `${n('live')} ${plural(n('live'), ['идёт', 'идут', 'идут'])}`],
    ['next', `${n('next')} впереди`],
  ]
  return (
    <div className="mt-2.5">
      <div className="flex flex-wrap gap-1" aria-hidden>
        {timeline.map((s, i) => (
          <span key={i} className={`h-2 w-2 rounded-full ${DOT[s]}`} />
        ))}
      </div>
      <p className="mt-2.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-dim">
        {legend
          .filter(([k]) => n(k))
          .map(([k, t]) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${DOT[k]}`} />
              {t}
            </span>
          ))}
      </p>
    </div>
  )
}

/** Турниры дня — горизонтальные полоски с числом матчей. */
function LeagueBars({ leagues }: { leagues: Summary['topLeagues'] }) {
  const most = Math.max(...leagues.map((l) => l.count))
  return (
    <ul className="space-y-2">
      {leagues.slice(0, 3).map((l) => (
        <li key={l.id}>
          <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
            <span className="min-w-0 truncate text-chalk">{l.name}</span>
            <span className="num shrink-0 font-semibold">{l.count}</span>
          </div>
          <div className="mt-1 h-1 rounded-full bg-white/[0.04]" aria-hidden>
            <div className="h-full rounded-full bg-chalk/45" style={{ width: `${(l.count / most) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Голы: столбик на каждый матч с ТБ 2.5 (высота — шанс), самый голевой — светлый. */
function GoalBars({ list, best }: { list: { id: number; p: number }[]; best: number }) {
  return (
    <div className="mt-2.5 flex h-8 items-end gap-1" aria-hidden>
      {list.map((g) => (
        <span
          key={g.id}
          className={`min-w-0 flex-1 rounded-[4px] ${g.id === best ? 'bg-fg' : 'bg-panel-3'}`}
          style={{ height: `${Math.max(18, Math.min(100, ((g.p - 0.5) / 0.3) * 100))}%` }}
        />
      ))}
    </div>
  )
}

/** Кольцо: доля круга = шанс исхода. */
function Ring({ p, size = 52 }: { p: number; size?: number }) {
  const r = 22
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 52 52" width={size} height={size} className="shrink-0 -rotate-90" aria-hidden>
      <circle cx="26" cy="26" r={r} fill="none" stroke="var(--color-panel-3)" strokeWidth="6" />
      <circle cx="26" cy="26" r={r} fill="none" stroke="var(--color-fg)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${c * p} ${c}`} />
    </svg>
  )
}

const until = (ts: number) => {
  const min = Math.round((ts - Date.now()) / 60_000)
  if (min <= 0) return 'вот-вот начнётся'
  if (min < 60) return `через ${min} мин`
  const h = Math.floor(min / 60)
  const m = min % 60
  return `через ${h} ч${m ? ` ${m} мин` : ''}`
}

// ─── Виджеты ─────────────────────────────────────────────────────────────────

function Card({ kind, s, wide = false }: { kind: CardKind; s: Summary; wide?: boolean }) {
  switch (kind) {
    case 'value': {
      const it = s.value!
      const p = it.summary!.pick!
      return (
        <Tile tone="lime" label="Value дня" icon="percent">
          <Big>{edge(p.ev ?? 0)}</Big>
          <MatchLink it={it} />
          {p.odd ? <EdgeBar label={p.label} odd={p.odd} fair={1 / p.prob} /> : null}
        </Tile>
      )
    }
    case 'progruz': {
      const g = s.progruz!
      return (
        <Tile label="Прогруз дня" icon="down">
          <Big className="text-hot">−{Math.round(g.drop * 100)}%</Big>
          <MatchLink it={g.item} />
          <Slope side={SIDE[g.side]} from={g.from} to={g.to} />
        </Tile>
      )
    }
    case 'live':
      return (
        <Tile
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
          <ul className="mt-2.5 space-y-2">
            {s.live.slice(0, 2).map(({ match: m }) => (
              <li key={m.id} className="min-w-0 text-[12.5px]">
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className="num w-7 shrink-0 text-live">{m.statusCode === 4 ? 'Пер' : m.elapsed ? `${m.elapsed}′` : ''}</span>
                  <span className="min-w-0 truncate text-chalk">
                    {m.home.name} <span className="num font-semibold text-fg">{m.score ? `${m.score.home}:${m.score.away}` : '–'}</span> {m.away.name}
                  </span>
                </div>
                {/* сколько матча уже сыграно */}
                <div className="ml-9 mt-1 h-[3px] rounded-full bg-white/[0.05]" aria-hidden>
                  <div className="h-full rounded-full bg-live/70" style={{ width: `${Math.min(100, ((m.elapsed ?? 45) / 90) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Tile>
      )
    case 'next': {
      const it = s.next!
      return (
        <Tile label={s.liveCount ? 'Следующий матч' : 'Первый матч'} icon="clock">
          <Big>{formatTime(it.match.ts)}</Big>
          <MatchLink it={it} />
          <p className="mt-0.5 truncate text-[12.5px] text-dim">
            {until(it.match.ts)} · {it.match.league.name}
          </p>
        </Tile>
      )
    }
    case 'goals': {
      const g = s.goals!
      return (
        <Tile label="Ждём голов" icon="ball">
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
          <GoalBars list={g.list} best={g.item.match.id} />
          <StoryLink
            id={g.item.match.id}
            href={matchHref(g.item.match)}
            className="relative z-10 mt-2.5 flex min-w-0 items-baseline gap-1.5 text-[12.5px] text-chalk transition-colors hover:text-fg"
          >
            <span className="truncate">{names(g.item.match)}</span>
            <span className="num shrink-0 font-semibold text-fg">{Math.round(g.p * 100)}%</span>
          </StoryLink>
        </Tile>
      )
    }
    case 'favorite': {
      const f = s.favorite!
      return (
        <Tile label="Фаворит дня" icon="star">
          <div className="flex items-center justify-between gap-3">
            <Big unit="%">{Math.round(f.p * 100)}</Big>
            <Ring p={f.p} />
          </div>
          <MatchLink it={f.item} />
          <p className="mt-0.5 truncate text-[12.5px] text-dim">
            {SIDE[f.side]} · победа: {f.side === 'home' ? f.item.match.home.name : f.item.match.away.name}
          </p>
        </Tile>
      )
    }
    case 'count':
      return (
        <Tile label="Всего за день" icon="calendar">
          <div className={wide ? 'grid gap-x-10 gap-y-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] sm:items-end' : ''}>
            <div className="min-w-0">
              <a href="#matches" className={`block ${COVER}`}>
                <Big unit={`${plural(s.total, ['матч', 'матча', 'матчей'])} · ${s.leagues} ${plural(s.leagues, ['турнир', 'турнира', 'турниров'])}`}>{s.total}</Big>
              </a>
              <DayDots timeline={s.timeline} />
            </div>
            {wide && s.topLeagues.length ? (
              <div className="hidden min-w-0 sm:block">
                <LeagueBars leagues={s.topLeagues} />
              </div>
            ) : null}
          </div>
        </Tile>
      )
  }
}

/** Главный виджет: матч дня — команды, почему он главный, шансы столбиками и кэфы. */
function TopCard({ it }: { it: FeedItem }) {
  const m = it.match
  const live = isLive(m)
  const played = Boolean(m.score) && (live || m.status === 'finished')
  const f = fair1x2(m.odds?.x12)
  const pick = m.status === 'scheduled' ? it.summary?.pick : null
  const hotKey = pick?.kind === 'value' ? pick.key : null
  const cells = f ? (['home', 'draw', 'away'] as const).map((k) => ({ k, p: f[k], odd: m.odds?.x12?.[k]?.value ?? null })) : null
  const top = cells ? Math.max(...cells.map((c) => c.p)) : 0
  // почему это матч дня — самый весомый тег и его объяснение
  const best = bestTag(it.tags)
  const def = best ? TAG_BY_SLUG.get(best.slug) : undefined
  const team = (t: Match['home'], goals: number | undefined, dim = false) => (
    <span className={`flex min-w-0 items-center gap-3 ${dim ? 'text-chalk' : ''}`}>
      <TeamLogo name={t.name} src={t.logo} size={28} />
      <span className="min-w-0 flex-1 truncate">{t.name}</span>
      {played ? <span className={`num shrink-0 text-[28px] font-semibold ${live ? 'text-live' : 'text-fg'}`}>{goals}</span> : null}
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
            live ? 'bg-live/10 text-live' : 'bg-white/[0.05] text-chalk'
          }`}
        >
          {live ? <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-live" /> : null}
          {live ? (m.statusCode === 4 ? 'перерыв' : m.elapsed ? `${m.elapsed}′` : 'идёт') : m.status === 'finished' ? 'итог' : formatTime(m.ts)}
        </span>
      </div>

      <StoryLink id={m.id} href={matchHref(m)} className={`mt-4 block space-y-1.5 text-[21px] font-semibold leading-tight tracking-[-0.025em] sm:text-[23px] ${COVER}`}>
        {team(m.home, m.score?.home)}
        {team(m.away, m.score?.away, true)}
      </StoryLink>

      {best && def ? (
        <p className="mt-3 line-clamp-2 max-w-[52ch] text-[13.5px] leading-snug text-dim">
          <span className={WHY_TONE[def.kind]}>{def.label}</span> · {best.reason}
        </p>
      ) : null}

      {cells ? (
        <div className="mt-auto pt-4" aria-label="Шансы на исход без маржи">
          {/* столбики шансов: высота — шанс, подпись сверху, кэф снизу */}
          <div className="grid h-[84px] grid-cols-3 items-end gap-3">
            {cells.map((c) => {
              const hot = c.k === hotKey
              const fav = c.p === top
              return (
                <div key={c.k} className="flex h-full min-w-0 flex-col items-center justify-end">
                  <span
                    className={`num mb-1.5 rounded-full px-2 py-0.5 text-[12.5px] font-semibold ${
                      fav || hot ? 'bg-white/[0.08] text-fg' : 'text-dim'
                    }`}
                  >
                    {Math.round(c.p * 100)}%
                  </span>
                  <span
                    className={`w-[62%] rounded-[8px] ${hot ? 'bg-acid' : fav ? 'bg-chalk' : 'bg-panel-3'}`}
                    style={{ height: `${Math.max(10, (c.p / top) * 54)}px` }}
                    aria-hidden
                  />
                </div>
              )
            })}
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-3 text-center text-[12.5px] text-dim">
            {cells.map((c) => (
              <span key={c.k}>
                {SIDE[c.k]}
                {c.odd ? <span className={`num ml-1.5 font-semibold ${c.k === hotKey ? 'text-acid' : 'text-fg/90'}`}>{c.odd.toFixed(2)}</span> : null}
              </span>
            ))}
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
 * «Сводка дня» — виджеты под кружками историй: большой «Матч дня» и до четырёх
 * маленьких (value — лаймовый, прогруз, live, голы…), у каждого — свой мини-график.
 * Каждый открывает сторис матча или нужный блок страницы.
 */
export function DaySummary({ s, className = '' }: { s: Summary; className?: string }) {
  if (!s.top) return null
  const cards = summaryCards(s)
  return (
    <section aria-label="Сводка дня" className={`grid grid-cols-2 gap-3 lg:grid-cols-4 ${className}`}>
      <TopCard it={s.top} />
      {cards.map((k, i) => {
        // карточек меньше четырёх — последние растягиваем, чтобы в сетке не было дыр
        const wide = cards.length <= 2 || (cards.length === 3 && i === 2)
        return (
          <div key={k} className={`min-w-0 ${wide ? 'col-span-2' : ''} ${cards.length === 2 ? 'lg:col-span-2' : ''}`}>
            <Card kind={k} s={s} wide={wide} />
          </div>
        )
      })}
    </section>
  )
}
