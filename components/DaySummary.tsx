import { featuredInfo } from '@/config/leagues'
import type { FeedItem } from '@/lib/data'
import { summaryCards, type CardKind, type DaySummary as Summary } from '@/lib/day-summary'
import { formatTime, plural } from '@/lib/format'
import { matchHref } from '@/lib/links'
import { fair1x2 } from '@/lib/odds'
import { isLive } from '@/lib/rank'
import type { Match } from '@/lib/types'
import { buildVerdict, outcomeText, outOf10 } from '@/lib/verdict'
import { StoryLink } from './story/StoryLink'
import { TeamLogo } from './TeamLogo'

const edge = (ev: number) => `${ev >= 0 ? '+' : '−'}${Math.abs(ev * 100).toFixed(1).replace('.', ',')}%`
const names = (m: Match) => `${m.home.name} — ${m.away.name}`
/** Ссылка-накладка: вся карточка кликабельна, а текст ссылки — понятное название. */
const COVER = "after:absolute after:inset-0 after:rounded-[22px] after:content-['']"

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

// ─── Рамка: одна схема на все плитки ─────────────────────────────────────────
//
// Подпись → крупная цифра → матч → одна строка пояснения. Никаких подписей мельче 13px,
// осей и легенд: плитку читают за секунду, подробности — в сторис по клику.

function Tile({ tone = 'plain', label, icon, children }: { tone?: Tone; label: React.ReactNode; icon: keyof typeof ICONS; children: React.ReactNode }) {
  const t = TONES[tone]
  return (
    <article
      style={t.vars as React.CSSProperties}
      className={`relative flex h-full min-h-[146px] min-w-0 flex-col rounded-[22px] border p-4 text-[var(--t-fg)] transition-[border-color,filter] duration-300 sm:px-5 sm:py-[18px] ${t.cls}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 truncate text-[13px] font-medium text-[var(--t-label)]">{label}</span>
        <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-[var(--t-chip)]">
          <Icon name={icon} />
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-end pt-2">{children}</div>
    </article>
  )
}

/** Крупная цифра; подпись к ней — обычным размером, на телефоне её можно спрятать. */
function Big({ children, unit, className = '' }: { children: React.ReactNode; unit?: React.ReactNode; className?: string }) {
  return (
    <div className="flex min-w-0 items-baseline gap-1.5">
      <span className={`num whitespace-nowrap text-[30px] font-semibold leading-none tracking-[-0.045em] sm:text-[34px] ${className}`}>{children}</span>
      {unit ? <span className="truncate text-[14px] font-medium text-[var(--t-sub)]">{unit}</span> : null}
    </div>
  )
}

/** Матч плитки: вся плитка — ссылка (открывает сторис). */
function MatchLink({ it, children }: { it: FeedItem; children?: React.ReactNode }) {
  return (
    <StoryLink id={it.match.id} href={matchHref(it.match)} className={`mt-2.5 block truncate text-[14px] font-semibold ${COVER}`}>
      {children ?? names(it.match)}
    </StoryLink>
  )
}

/** Одна строка пояснения под матчем. */
const Note = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <p className={`mt-0.5 line-clamp-2 text-[13px] leading-snug text-[var(--t-sub)] sm:line-clamp-1 ${className}`}>{children}</p>
)

/** Подпись короче на телефоне: узкая плитка не обрезает слова. */
const Short = ({ phone, full }: { phone: string; full: string }) => (
  <>
    <span className="sm:hidden">{phone}</span>
    <span className="hidden sm:inline">{full}</span>
  </>
)

/** Кольцо одного значения: доля круга = шанс. */
function Ring({ p, size = 40 }: { p: number; size?: number }) {
  const r = 22
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 52 52" width={size} height={size} className="shrink-0 -rotate-90" aria-hidden>
      <circle cx="26" cy="26" r={r} fill="none" stroke="var(--t-mut)" strokeWidth="6" />
      <circle cx="26" cy="26" r={r} fill="none" stroke="var(--t-fg)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${c * p} ${c}`} />
    </svg>
  )
}

/** «через 40 мин», «через 3 ч» — коротко, чтобы влезало в плитку на телефоне. */
const until = (ts: number) => {
  const min = Math.round((ts - Date.now()) / 60_000)
  if (min <= 0) return 'вот-вот начнётся'
  if (min < 60) return `через ${min} мин`
  return `через ${Math.round(min / 60)} ч`
}

const sideName = (m: Match, side: 'home' | 'away') => (side === 'home' ? m.home.name : m.away.name)

// ─── Виджеты ─────────────────────────────────────────────────────────────────

function Card({ kind, s, tone }: { kind: CardKind; s: Summary; tone?: Tone }) {
  switch (kind) {
    case 'value': {
      const it = s.value!
      const p = it.summary!.pick!
      return (
        <Tile tone={tone} label={<Short phone="Выгодно" full="Выгодная ставка" />} icon="percent">
          <Big unit={<span className="hidden sm:inline">выгоды</span>}>{edge(p.ev ?? 0)}</Big>
          <MatchLink it={it} />
          <Note className="first-letter:uppercase">
            {outcomeText(p.key, it.match)}
            {p.odd ? ` · ${p.odd.toFixed(2)}` : ''}
          </Note>
        </Tile>
      )
    }
    case 'progruz': {
      const g = s.progruz!
      return (
        <Tile tone={tone} label={<Short phone="Сюда ставят" full="Куда идут деньги" />} icon="down">
          <Big className={tone === 'amber' ? '' : 'text-hot'} unit={<span className="hidden sm:inline">кэф</span>}>
            −{Math.round(g.drop * 100)}%
          </Big>
          <MatchLink it={g.item} />
          <Note>Ставят на «{sideName(g.item.match, g.side)}»</Note>
        </Tile>
      )
    }
    case 'live': {
      // матч дня уже крупно слева — здесь показываем другой из идущих
      const top = s.live.find((x) => x.match.id !== s.top?.match.id) ?? s.live[0]
      const m = top?.match
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
          <Big unit={plural(s.liveCount, ['матч', 'матча', 'матчей'])}>{s.liveCount}</Big>
          {m ? (
            <>
              <MatchLink it={top}>
                {m.home.name} <span className="num">{m.score ? `${m.score.home}:${m.score.away}` : '–'}</span> {m.away.name}
              </MatchLink>
              <Note>
                <span className="text-live">{m.statusCode === 4 ? 'перерыв' : m.elapsed ? `${m.elapsed}-я минута` : 'идёт'}</span>
                {s.liveCount > 1 ? <span className="hidden sm:inline"> · все — ниже</span> : null}
              </Note>
            </>
          ) : null}
        </Tile>
      )
    }
    case 'next': {
      const it = s.next!
      return (
        <Tile tone={tone} label={s.liveCount ? 'Следующий матч' : 'Первый матч'} icon="clock">
          <Big unit={<span className="hidden sm:inline">{until(it.match.ts)}</span>}>{formatTime(it.match.ts)}</Big>
          <MatchLink it={it} />
          <Note>{featuredInfo(it.match.league)?.short || it.match.league.name}</Note>
        </Tile>
      )
    }
    case 'goals': {
      const g = s.goals!
      return (
        <Tile tone={tone} label="Ждём голов" icon="ball">
          <Big unit={plural(g.count, ['матч', 'матча', 'матчей'])}>{g.count}</Big>
          <MatchLink it={g.item} />
          <Note>3 гола и больше — шанс {outOf10(g.p)}</Note>
        </Tile>
      )
    }
    case 'favorite': {
      const f = s.favorite!
      return (
        <Tile tone={tone} label="Фаворит дня" icon="star">
          <div className="flex items-end justify-between gap-3">
            <Big unit="из 10">{outOf10(f.p).split(' ')[0]}</Big>
            <Ring p={f.p} />
          </div>
          <MatchLink it={f.item} />
          <Note>Шанс на победу «{sideName(f.item.match, f.side)}»</Note>
        </Tile>
      )
    }
    case 'count':
      return (
        <Tile tone={tone} label="Всего за день" icon="calendar">
          <a href="#matches" className={`block ${COVER}`}>
            <Big unit={plural(s.total, ['матч', 'матча', 'матчей'])}>{s.total}</Big>
          </a>
          <p className="mt-2.5 truncate text-[14px] font-semibold">{s.topLeagues.map((l) => featuredInfo(l)?.short || l.name).join(', ')}</p>
          <Note>
            {s.leagues} {plural(s.leagues, ['турнир', 'турнира', 'турниров'])}
          </Note>
        </Tile>
      )
  }
}

const SEG = { home: 'bg-home text-ink', draw: 'bg-tie text-fg', away: 'bg-away text-ink' } as const

/**
 * Шансы одной полосой: хозяева · ничья · гости — доли ширины, «из 10» прямо в полосе.
 * Слева первая команда, справа вторая — как в названии матча.
 */
function ChanceBar({ m }: { m: Match }) {
  const f = fair1x2(m.odds?.x12)
  if (!f) return null
  const cells = (['home', 'draw', 'away'] as const).map((k) => ({ k, p: f[k], n: outOf10(f[k]) }))
  return (
    <div
      className="flex h-7 gap-0.5 overflow-hidden rounded-full"
      role="img"
      aria-label={`Шансы: «${m.home.name}» — ${cells[0].n}, ничья — ${cells[1].n}, «${m.away.name}» — ${cells[2].n}`}
    >
      {cells.map((c) => (
        <span key={c.k} className={`num grid min-w-0 place-items-center text-[12.5px] font-semibold ${SEG[c.k]}`} style={{ width: `${c.p * 100}%` }}>
          <span className="truncate px-1.5">{c.p >= 0.17 ? c.n : c.n.split(' ')[0]}</span>
        </span>
      ))}
    </div>
  )
}

/**
 * Матч дня: команды крупно, одна фраза — кто скорее выиграет, полоса шансов и две кнопки.
 * Подробности (форма, личные встречи, кэфы) — в сторис по клику.
 */
function TopCard({ it }: { it: FeedItem }) {
  const m = it.match
  const live = isLive(m)
  const played = Boolean(m.score) && (live || m.status === 'finished')
  const pick = m.status === 'scheduled' ? it.summary?.pick : null
  // только выгодная ставка: обычный прогноз модели бывает «против» главной фразы и путает
  const v = m.status === 'scheduled' ? buildVerdict({ match: m, tags: it.tags, pick: pick?.kind === 'value' ? pick : null }) : null
  const bet = v?.bet
  const betLabel = bet && pick ? (pick.key === v.side ? 'Выгодно' : `Выгодно: ${bet.text}`) : null
  const team = (t: Match['home'], goals: number | undefined, dim = false) => (
    <span className={`flex min-w-0 items-center gap-3 ${dim ? 'text-chalk' : ''}`}>
      <TeamLogo name={t.name} src={t.logo} size={30} />
      <span className="min-w-0 flex-1 truncate">{t.name}</span>
      {played ? <span className={`num shrink-0 text-[28px] font-semibold ${live ? 'text-live' : 'text-fg'}`}>{goals}</span> : null}
    </span>
  )
  return (
    <article className="relative col-span-2 flex min-w-0 flex-col rounded-[22px] border border-edge bg-panel p-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.035)] transition-colors duration-300 hover:border-edge-2 sm:p-6 lg:row-span-2">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-[13px] font-medium text-chalk">
          Матч дня <span className="text-mute">· {featuredInfo(m.league)?.short || m.league.name}</span>
        </p>
        <span
          className={`num inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ${
            live ? 'bg-live/10 text-live' : 'bg-white/[0.06] text-chalk'
          }`}
        >
          {live ? <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-live" /> : null}
          {live ? (m.statusCode === 4 ? 'перерыв' : m.elapsed ? `${m.elapsed}′` : 'идёт') : m.status === 'finished' ? 'итог' : formatTime(m.ts)}
        </span>
      </div>

      <StoryLink id={m.id} href={matchHref(m)} className={`mt-4 block space-y-2 text-[22px] font-semibold leading-tight tracking-[-0.025em] sm:text-[24px] ${COVER}`}>
        {team(m.home, m.score?.home)}
        {team(m.away, m.score?.away, true)}
      </StoryLink>

      <div className="mt-auto pt-5">
        {v ? <p className="mb-3 text-[17px] font-semibold leading-snug tracking-[-0.01em]">{v.headline}</p> : null}
        {played ? (
          <>
            <p className="mb-3 text-[17px] font-semibold leading-snug tracking-[-0.01em]">
              {live ? (m.statusCode === 4 ? 'Перерыв' : m.elapsed ? `Идёт ${m.elapsed}-я минута` : 'Идёт матч') : 'Матч завершён'}
            </p>
            {live ? (
              <div className="h-1.5 rounded-full bg-white/[0.08]" aria-hidden>
                <div className="h-full rounded-full bg-live" style={{ width: `${Math.min(100, ((m.elapsed ?? 45) / 90) * 100)}%` }} />
              </div>
            ) : null}
          </>
        ) : (
          <ChanceBar m={m} />
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-[13px]">
          <span aria-hidden className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-white/[0.06] py-1.5 pl-1.5 pr-3.5 font-medium text-fg">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-acid text-acid-ink">
              <svg viewBox="0 0 12 12" className="ml-px h-2.5 w-2.5" fill="currentColor">
                <path d="M3 1.5v9l7.5-4.5z" />
              </svg>
            </span>
            Матч в слайдах
          </span>
          {bet && betLabel ? (
            <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-acid/[0.12] px-3.5 py-1.5 font-semibold text-acid">
              <span className="truncate">{betLabel}</span>
              {bet.odd ? <span className="num shrink-0">· {bet.odd.toFixed(2)}</span> : null}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  )
}

/**
 * Порядок плиток на экране: value — первой, прогруз — последним (наискосок от value,
 * чтобы цветные плитки не стояли рядом).
 */
function arrange(cards: CardKind[]): CardKind[] {
  const order: CardKind[] = ['value', 'live', 'goals', 'next', 'favorite', 'progruz', 'count']
  return [...cards].sort((a, b) => order.indexOf(a) - order.indexOf(b))
}

/**
 * «Сводка дня» — первый экран главной: «Матч дня» слева и до четырёх плиток справа (2×2).
 * Всё влезает в экран ноутбука без прокрутки; каждый виджет открывает сторис матча или нужный блок.
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
            <Card kind={k} s={s} tone={tones[k]} />
          </div>
        )
      })}
    </section>
  )
}
