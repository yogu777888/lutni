import { featuredInfo } from '@/config/leagues'
import type { FeedItem } from '@/lib/data'
import { summaryCards, type CardKind, type DaySummary as Summary } from '@/lib/day-summary'
import { formatDayMonth, formatTime, pct, plural, todayYmd, ymdInTz } from '@/lib/format'
import { matchHref } from '@/lib/links'
import { fair1x2 } from '@/lib/odds'
import { bestTag, isLive } from '@/lib/rank'
import type { Match } from '@/lib/types'
import { buildVerdict, outcomeShort, split100 } from '@/lib/verdict'
import { StoryLink } from './story/StoryLink'
import { TeamLogo } from './TeamLogo'

const edge = (ev: number) => `${ev >= 0 ? '+' : '−'}${Math.abs(ev * 100).toFixed(1).replace('.', ',')}%`
const names = (m: Match) => `${m.home.name} — ${m.away.name}`
/** Ссылка-накладка: вся карточка кликабельна, а текст ссылки — понятное название. */
const COVER = "after:absolute after:inset-0 after:rounded-[22px] after:content-['']"

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

/** Акцент плитки — цвет значка: лайм — выгодно, янтарь — деньги, красный — live. Фон у всех тёмный. */
const ACCENT = {
  none: 'bg-white/[0.06] text-chalk',
  acid: 'bg-acid/[0.14] text-acid',
  hot: 'bg-hot/[0.14] text-hot',
  live: 'bg-live/[0.14] text-live',
} as const

function Tile({ accent = 'none', label, icon, children }: { accent?: keyof typeof ACCENT; label: React.ReactNode; icon: keyof typeof ICONS; children: React.ReactNode }) {
  return (
    <article className="relative flex h-full min-h-[150px] min-w-0 flex-col rounded-[22px] border border-edge bg-panel p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.035)] transition-colors duration-300 hover:border-edge-2 sm:px-5 sm:py-[18px]">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 truncate text-[13px] font-medium text-chalk">{label}</span>
        <span className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full ${ACCENT[accent]}`}>
          <Icon name={icon} />
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-end pt-2">{children}</div>
    </article>
  )
}

/** Крупная цифра и подпись к ней обычным размером: в узкой плитке подпись встаёт под цифру. */
function Big({ children, unit, className = '' }: { children: React.ReactNode; unit?: React.ReactNode; className?: string }) {
  return (
    // подпись встаёт рядом с цифрой, а если места нет — переносится под неё целиком, не обрезаясь
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-1">
      <span className={`num whitespace-nowrap text-[30px] font-semibold leading-none tracking-[-0.045em] sm:text-[34px] lg:text-[clamp(34px,5.6vh,52px)] ${className}`}>{children}</span>
      {unit ? <span className="whitespace-nowrap text-[14px] font-medium text-dim">{unit}</span> : null}
    </div>
  )
}

/** Матч плитки: вся плитка — ссылка (открывает сторис). */
function MatchLink({ it, children }: { it: FeedItem; children?: React.ReactNode }) {
  return (
    <StoryLink id={it.match.id} href={matchHref(it.match)} className={`mt-2.5 line-clamp-2 text-[14px] font-semibold leading-snug ${COVER}`}>
      {children ?? names(it.match)}
    </StoryLink>
  )
}

/** Одна строка пояснения под матчем. */
const Note = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <p className={`mt-0.5 line-clamp-2 text-[13px] leading-snug text-dim sm:line-clamp-1 ${className}`}>{children}</p>
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
      <circle cx="26" cy="26" r={r} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="6" />
      <circle cx="26" cy="26" r={r} fill="none" stroke="var(--color-fg)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${c * p} ${c}`} />
    </svg>
  )
}

/** Когда начнётся: сегодня — «через 40 мин», «через 3 ч»; в другой день — дата («6 октября»), а не «через 66 ч». */
const until = (ts: number) => {
  if (ymdInTz(ts) !== todayYmd()) return formatDayMonth(ts)
  const min = Math.round((ts - Date.now()) / 60_000)
  if (min <= 0) return 'вот-вот начнётся'
  if (min < 60) return `через ${min} мин`
  return `через ${Math.round(min / 60)} ч`
}

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
/** Порог тега «много голов»: в подборку попадают матчи, где шанс 3+ голов не ниже этого. */
const GOALS_FROM = '57%'

const sideName = (m: Match, side: 'home' | 'away') => (side === 'home' ? m.home.name : m.away.name)

// ─── Виджеты ─────────────────────────────────────────────────────────────────

function Card({ kind, s }: { kind: CardKind; s: Summary }) {
  switch (kind) {
    case 'value': {
      const it = s.value!
      const p = it.summary!.pick!
      return (
        <Tile accent="acid" label={<Short phone="Выгодно" full="Выгодная ставка" />} icon="percent">
          <Big className="text-acid" unit="к честной цене">
            {edge(p.ev ?? 0)}
          </Big>
          <MatchLink it={it} />
          {/* что ставить и откуда процент: платят столько-то, а исход стоит столько-то */}
          <Note>
            {cap(outcomeShort(p.key))}
            {p.odd ? ` · ${p.odd.toFixed(2)} вместо ${(1 / p.prob).toFixed(2)}` : ''}
          </Note>
        </Tile>
      )
    }
    case 'progruz': {
      // только то, что видно по линии: кэф снизился. Сколько на исход ставят — мы не знаем
      const g = s.progruz!
      return (
        <Tile accent="hot" label={<Short phone="Кэф упал" full="Падение кэфа" />} icon="down">
          <Big className="text-hot" unit="с открытия линии">
            −{Math.round(g.drop * 100)}%
          </Big>
          <MatchLink it={g.item} />
          <Note>
            Кэф на {g.side === 'home' ? 'хозяев' : 'гостей'}: {g.from.toFixed(2)} → {g.to.toFixed(2)}
          </Note>
        </Tile>
      )
    }
    case 'live': {
      // матч дня уже крупно слева — здесь показываем другой из идущих
      const top = s.live.find((x) => x.match.id !== s.top?.match.id) ?? s.live[0]
      const m = top?.match
      return (
        <Tile
          accent="live"
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
                <span className="text-live">{m.statusCode === 4 ? 'перерыв' : m.elapsed ? `${m.elapsed}-я минута` : 'идёт'}</span> ·{' '}
                {featuredInfo(m.league)?.short || m.league.name}
              </Note>
            </>
          ) : null}
        </Tile>
      )
    }
    case 'next': {
      const it = s.next!
      return (
        <Tile label={s.liveCount ? 'Следующий матч' : 'Первый матч'} icon="clock">
          <Big unit={until(it.match.ts)}>{formatTime(it.match.ts)}</Big>
          <MatchLink it={it} />
          <Note>{featuredInfo(it.match.league)?.short || it.match.league.name}</Note>
        </Tile>
      )
    }
    case 'goals': {
      // это прогноз на будущие матчи: крупно — шанс 3+ голов у самого голевого, ниже — по какому порогу отбор
      const g = s.goals!
      const more = g.count - 1
      return (
        <Tile label="Ждём голов" icon="ball">
          <Big unit={<Short phone="3+ гола" full="шанс 3+ голов" />}>{pct(g.p)}</Big>
          <MatchLink it={g.item} />
          <Note>
            {more > 0 ? `Ещё ${more} ${plural(more, ['матч', 'матча', 'матчей'])} с шансом от ${GOALS_FROM}` : `В подборке — шанс от ${GOALS_FROM}`}
          </Note>
        </Tile>
      )
    }
    case 'favorite': {
      const f = s.favorite!
      return (
        <Tile label="Фаворит дня" icon="star">
          <div className="flex items-end justify-between gap-3">
            <Big unit={<Short phone="победа" full="шанс победы" />}>{pct(f.p)}</Big>
            <Ring p={f.p} />
          </div>
          <MatchLink it={f.item} />
          <Note>Фаворит по кэфам — «{sideName(f.item.match, f.side)}»</Note>
        </Tile>
      )
    }
    case 'count':
      return (
        <Tile label="Всего за день" icon="calendar">
          <a href="#matches" className={`block ${COVER}`}>
            <Big unit={plural(s.total, ['матч', 'матча', 'матчей'])}>{s.total}</Big>
          </a>
          <p className="mt-2.5 line-clamp-2 text-[14px] font-semibold leading-snug">{s.topLeagues.map((l) => featuredInfo(l)?.short || l.name).join(', ')}</p>
          <Note>
            {s.leagues} {plural(s.leagues, ['турнир', 'турнира', 'турниров'])}
          </Note>
        </Tile>
      )
  }
}

/**
 * Шансы одной полосой: хозяева · ничья · гости — доли ширины, проценты (в сумме 100) в полосе,
 * под ней — чей это шанс: команда, «ничья», команда. Без своих цветов, чтобы не спорить с лаймом:
 * светлая часть — фаворит, остальные — тёмные.
 */
function ChanceBar({ m }: { m: Match }) {
  const f = fair1x2(m.odds?.x12)
  if (!f) return null
  const n = split100(f)
  const fav = f.home >= f.away ? 'home' : 'away'
  const cells = (['home', 'draw', 'away'] as const).map((k) => ({
    k,
    p: f[k],
    n: n[k],
    name: k === 'draw' ? 'ничья' : k === 'home' ? m.home.name : m.away.name,
  }))
  // «Ничья» под серединой — только если по обе стороны хватает места подписям команд
  const BAR = 560
  const est = (t: string) => t.length * 7 + 10
  const mid = f.home + f.draw / 2
  const drawAt = f.draw >= 0.1 && mid * BAR >= est(m.home.name) + 30 && (1 - mid) * BAR >= est(m.away.name) + 30 ? mid * 100 : null
  const tone = (k: (typeof cells)[number]['k']) => (k === fav ? 'bg-chalk text-ink' : k === 'draw' ? 'bg-[#26251f] text-dim' : 'bg-[#3a3931] text-chalk')
  const label = `Шансы по коэффициентам букмекеров: ${cells.map((c) => `${c.k === 'draw' ? c.name : `«${c.name}»`} — ${c.n}%`).join(', ')}`
  return (
    <div role="img" aria-label={label} title={label}>
      <div className="flex h-7 gap-0.5 overflow-hidden rounded-full">
        {cells.map((c) => (
          <span key={c.k} className={`num grid min-w-0 place-items-center text-[13px] font-semibold ${tone(c.k)}`} style={{ width: `${c.p * 100}%` }}>
            <span className="truncate px-1">{c.n}%</span>
          </span>
        ))}
      </div>
      {/* команды — по краям полосы, не обрезаются узким сегментом; «Ничья» — под серединой,
          если ей хватает места (оценка по ширине полосы ~560 px), на телефоне — только команды */}
      <div className="relative mt-1.5 h-[18px] text-[12.5px] leading-[18px]" aria-hidden>
        <span
          className={`absolute left-0 top-0 max-w-[55%] truncate pl-1 sm:max-w-[var(--hm)] ${fav === 'home' ? 'text-chalk' : 'text-mute'}`}
          style={{ '--hm': drawAt ? `${drawAt - 6}%` : '55%' } as React.CSSProperties}
        >
          {m.home.name}
        </span>
        {drawAt ? (
          <span className="absolute top-0 hidden -translate-x-1/2 text-mute sm:block" style={{ left: `${drawAt}%` }}>
            Ничья
          </span>
        ) : null}
        <span
          className={`absolute right-0 top-0 max-w-[45%] truncate pr-1 text-right sm:max-w-[var(--am)] ${fav === 'away' ? 'text-chalk' : 'text-mute'}`}
          style={{ '--am': drawAt ? `${100 - drawAt - 6}%` : '45%' } as React.CSSProperties}
        >
          {m.away.name}
        </span>
      </div>
    </div>
  )
}

/** Почему этот матч стоит смотреть: падение кэфа, самый весомый тег или голы — одной фразой. */
function whyTop(it: FeedItem, v: ReturnType<typeof buildVerdict>): { text: string; icon: keyof typeof ICONS; accent: 'hot' | 'none' } | null {
  if (v?.drop) return { text: v.drop, icon: 'down', accent: 'hot' }
  // «выгодно» уже на кнопке, «фаворит» и «50 на 50» — в главной фразе
  const t = bestTag(it.tags.filter((x) => !['value', 'favorit', 'ravnye', 'progruz'].includes(x.slug)))
  if (t) return { text: t.reason, icon: t.slug === 'tb-2-5' || t.slug === 'obe-zabyut' ? 'ball' : 'star', accent: 'none' }
  if (v?.goals) return { text: v.goals, icon: 'ball', accent: 'none' }
  return null
}

/**
 * Матч дня: вывод → причина → разбор. Команды, одна фраза — кто скорее выиграет,
 * полоса шансов, одна конкретная причина и кнопка «Разбор за минуту» (сторис).
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
  const why = played ? null : whyTop(it, v)
  const team = (t: Match['home'], goals: number | undefined, dim = false) => (
    <span className={`flex min-w-0 items-center gap-3 ${dim ? 'text-chalk' : ''}`}>
      <TeamLogo name={t.name} src={t.logo} size={28} />
      <span className="min-w-0 flex-1 truncate">{t.name}</span>
      {played ? <span className={`num shrink-0 text-[26px] font-semibold ${live ? 'text-live' : 'text-fg'}`}>{goals}</span> : null}
    </span>
  )
  return (
    // три группы: команды сверху, вывод посередине, кнопки снизу — свободное место делится между ними,
    // а не собирается одной дырой, когда карточка тянется на высоту экрана
    <article className="relative col-span-2 flex min-w-0 flex-col justify-between gap-5 rounded-[22px] border border-edge bg-panel p-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.035)] transition-colors duration-300 hover:border-edge-2 sm:px-6 sm:py-5 lg:row-span-2">
      <div>
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

        <StoryLink
          id={m.id}
          href={matchHref(m)}
          className={`mt-3.5 block space-y-1.5 text-[21px] font-semibold leading-tight tracking-[-0.025em] sm:text-[23px] lg:text-[clamp(23px,3.8vh,34px)] ${COVER}`}
        >
          {team(m.home, m.score?.home)}
          {team(m.away, m.score?.away, true)}
        </StoryLink>
      </div>

      <div>
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
          <>
            {/* вывод → на чём он основан (полоса шансов по кэфам) → причина */}
            {v ? <p className="mb-2.5 text-[17px] font-semibold leading-snug tracking-[-0.01em]">{v.headline}</p> : null}
            <ChanceBar m={m} />
            {why ? (
              <p className="mt-3 flex items-start gap-2.5 text-[14px] leading-snug text-chalk">
                <span className={`mt-px grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full ${ACCENT[why.accent]}`}>
                  <Icon name={why.icon} />
                </span>
                <span className="line-clamp-2 pt-px">{why.text}</span>
              </p>
            ) : null}
          </>
        )}
      </div>
      {/* кнопки — внизу карточки */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-[13px]">
          <span aria-hidden className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-white/[0.06] py-1.5 pl-1.5 pr-3.5 font-medium text-fg">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-acid text-acid-ink">
              <svg viewBox="0 0 12 12" className="ml-px h-2.5 w-2.5" fill="currentColor">
                <path d="M3 1.5v9l7.5-4.5z" />
              </svg>
            </span>
            Разбор за минуту
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
 * Порядок плиток на экране: value — первой, прогруз — последним (наискосок от value).
 */
function arrange(cards: CardKind[]): CardKind[] {
  const order: CardKind[] = ['value', 'live', 'goals', 'next', 'favorite', 'progruz', 'count']
  return [...cards].sort((a, b) => order.indexOf(a) - order.indexOf(b))
}

/**
 * «Сводка дня» — первый экран главной: «Матч дня» слева и до четырёх плиток справа (2×2).
 * Все плитки тёмные, цвет — только на главной цифре и значке, чтобы главным оставался «Матч дня».
 * Всё влезает в экран ноутбука без прокрутки; каждый виджет открывает сторис матча или нужный блок.
 */
export function DaySummary({ s, className = '' }: { s: Summary; className?: string }) {
  if (!s.top) return null
  const cards = arrange(summaryCards(s))
  return (
    <section aria-label="Сводка дня" className={`grid grid-cols-2 gap-3 lg:grid-cols-4 ${className}`}>
      <TopCard it={s.top} />
      {cards.map((k, i) => {
        // карточек меньше четырёх — последние растягиваем, чтобы в сетке не было дыр
        const wide = cards.length <= 2 || (cards.length === 3 && i === 2)
        return (
          <div key={k} className={`min-w-0 ${wide ? 'col-span-2' : ''} ${cards.length === 2 ? 'lg:col-span-2' : ''}`}>
            <Card kind={k} s={s} />
          </div>
        )
      })}
    </section>
  )
}
