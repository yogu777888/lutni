import Link from 'next/link'
import { featuredInfo } from '@/config/leagues'
import type { FeedItem } from '@/lib/data'
import { goalsChance, navExamples, parseProgruz, type DaySummary as Summary, type ProgruzInfo } from '@/lib/day-summary'
import { appNow, formatDayMonth, formatTime, pct, pluralN, todayYmd, ymdInTz } from '@/lib/format'
import { matchHref } from '@/lib/links'
import { fair1x2 } from '@/lib/odds'
import { isLive } from '@/lib/rank'
import type { Res } from '@/lib/stats'
import { artFor, type ArtIcon as IconName } from '@/lib/story-art'
import type { League, Match } from '@/lib/types'
import { buildVerdict, split100, type Verdict } from '@/lib/verdict'
import { CHIP, StoryChipFace, ValueChip } from './Chips'
import { ArtIcon } from './story/ArtIcon'
import { StoryLink } from './story/StoryLink'
import { TeamLogo } from './TeamLogo'
import { TopCarousel, type MainSlide } from './TopCarousel'

/** Ссылка-накладка: вся карточка кликабельна, а текст ссылки — понятное название. */
const COVER = "after:absolute after:inset-0 after:rounded-[22px] after:content-['']"
const CARD = 'rounded-[22px] border border-edge bg-panel shadow-[inset_0_1px_0_rgb(255_255_255/0.035)]'

const MATCHES = ['матч', 'матча', 'матчей'] as const
const TOURNEYS = ['турнир', 'турнира', 'турниров'] as const
const leagueShort = (l: League) => featuredInfo(l)?.short || l.name
const team = (m: Match, side: 'home' | 'away') => `«${side === 'home' ? m.home.name : m.away.name}»`

/** Стрелка «перейти» — квадрат 32px, как остальные кнопки внутри карточек. */
function Go() {
  return (
    <span
      aria-hidden
      className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-white/[0.07] text-chalk transition-colors duration-300 group-hover:bg-white/[0.11] group-hover:text-fg"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </svg>
    </span>
  )
}

/** Когда начнётся: сегодня — «через 40 мин», «через 3 ч»; в другой день — дата («6 октября»), а не «через 66 ч». */
const until = (ts: number) => {
  if (ymdInTz(ts) !== todayYmd()) return formatDayMonth(ts)
  const min = Math.round((ts - appNow()) / 60_000)
  if (min <= 0) return 'вот-вот начнётся'
  if (min < 60) return `через ${min} мин`
  return `через ${Math.round(min / 60)} ч`
}

// ─── Главные матчи ───────────────────────────────────────────────────────────

/**
 * Шансы трёх исходов одной полосой: слева хозяева, в середине ничья, справа гости; проценты (в сумме 100)
 * внутри. Под полосой — подписи исходов прямо по местам и кэфы (по линии перед матчем): полоса не под
 * табло, поэтому без подписей непонятно, где кто. Без своих цветов: светлая часть — фаворит.
 */
function ChanceBar({ m }: { m: Match }) {
  const f = fair1x2(m.odds?.x12)
  if (!f) return null
  const n = split100(f)
  const fav = f.home >= f.away ? 'home' : 'away'
  const x = m.odds?.x12
  const cells = (['home', 'draw', 'away'] as const).map((k) => ({
    k,
    p: f[k],
    n: n[k],
    odd: x?.[k]?.value ?? null,
    name: k === 'draw' ? 'ничья' : k === 'home' ? m.home.name : m.away.name,
  }))
  const tone = (k: (typeof cells)[number]['k']) => (k === fav ? 'bg-chalk text-ink' : k === 'draw' ? 'bg-[#26251f] text-dim' : 'bg-[#3a3931] text-chalk')
  const label = `Шансы по коэффициентам букмекеров: ${cells.map((c) => `${c.k === 'draw' ? c.name : `«${c.name}»`} — ${c.n}% (кэф ${c.odd?.toFixed(2) ?? '—'})`).join(', ')}`
  // на телефоне кэф — строкой ниже названия: иначе у длинных названий он обрезается
  const cell = (c: (typeof cells)[number], align: string) => (
    <span className={`min-w-0 sm:truncate ${align} ${c.k === fav ? 'text-chalk' : ''}`}>
      <span className="max-sm:block max-sm:truncate">{c.name}</span>
      {c.odd ? <span className="num text-mute max-sm:block sm:ml-1.5">{c.odd.toFixed(2)}</span> : null}
    </span>
  )
  return (
    <div role="img" aria-label={label} title={label}>
      <div className="flex h-7 gap-0.5 overflow-hidden rounded-[9px] lg:h-[clamp(28px,3.4vh,34px)]">
        {cells.map((c) => (
          <span key={c.k} className={`num grid min-w-0 place-items-center text-[13px] font-semibold ${tone(c.k)}`} style={{ width: `${c.p * 100}%` }}>
            <span className="truncate px-1">{c.n}%</span>
          </span>
        ))}
      </div>
      <p className="mt-1.5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-3 text-[13px] text-dim" aria-hidden>
        {cell(cells[0], 'text-left')}
        {cell(cells[1], 'text-center')}
        {cell(cells[2], 'text-right')}
      </p>
    </div>
  )
}

type Reason = { text: string; icon: IconName; hot: boolean }

/**
 * Два факта о встрече — с цифрами и выборкой из тегов: о движении линии («Кэф на «X» снизился: 2.40 → 1.97»)
 * и о командах (серии, дом, потери, личные встречи). «Выгодно» — на кнопке, «фаворит» и «50 на 50» —
 * в главной фразе (и до матча, и во время игры), их не повторяем. Фактов нет — панели нет, ничего не выдумываем.
 */
function reasonsFor(it: FeedItem, v: Verdict | null): Reason[] {
  const out: Reason[] = []
  // падение кэфа — первым; во время игры вывода нет, но падение до начала — всё равно факт
  const p = v ? null : parseProgruz(it)
  const drop = v?.drop ?? (p ? `Кэф на ${team(it.match, p.side)} снизился: ${p.from.toFixed(2)} → ${p.to.toFixed(2)}` : null)
  if (drop) out.push({ text: drop, icon: 'down', hot: true })
  const skip = new Set(['value', 'favorit', 'ravnye', 'progruz'])
  for (const t of [...it.tags].sort((a, b) => b.score - a.score)) {
    if (!skip.has(t.slug)) out.push({ text: t.reason, icon: artFor(t.slug).icon, hot: false })
  }
  if (v?.goals && !it.tags.some((t) => t.slug === 'tb-2-5' || t.slug === 'tm-2-5')) out.push({ text: v.goals, icon: 'ball', hot: false })
  return out.slice(0, 2)
}

/**
 * Идущий или сыгранный матч глазами шансов до него — только счёт и кэфы перед матчем, без прогнозов:
 * в игре — «Фаворит «Бетис» (65%) ведёт», «Пока ничья, фаворит — «Бетис» (65%)», «Ведёт «Хетафе», хотя
 * фаворит — «Бетис» (65%)»; после матча — «Фаворит … выиграл», «Ничья: фаворит … не выиграл», «Сенсация: …».
 */
function playedLine(m: Match): string | null {
  const f = fair1x2(m.odds?.x12)
  const finished = m.status === 'finished'
  const s = finished ? (m.scoreFT ?? m.score) : m.score
  if (!f || !s) return null
  if (Math.abs(f.home - f.away) < 0.1) return finished ? 'Шансы были почти равны' : 'Шансы до матча были почти равны'
  const side = f.home >= f.away ? 'home' : 'away'
  const diff = side === 'home' ? s.home - s.away : s.away - s.home
  const fav = `${team(m, side)} (${pct(f[side])})`
  if (finished) return diff > 0 ? `Фаворит ${fav} выиграл` : diff === 0 ? `Ничья: фаворит ${fav} не выиграл` : `Сенсация: фаворит ${fav} проиграл`
  return diff > 0 ? `Фаворит ${fav} ведёт` : diff === 0 ? `Пока ничья, фаворит — ${fav}` : `Ведёт ${team(m, side === 'home' ? 'away' : 'home')}, хотя фаворит — ${fav}`
}

// ─── Мини-графики справа в «Главных матчах» ──────────────────────────────────

/** Результат матча квадратом: монохромно, без светофора — победа светлая, ничья серая, поражение пустое. */
const RES: Record<Res, { l: string; cls: string; word: string }> = {
  W: { l: 'В', cls: 'bg-chalk text-ink', word: 'победа' },
  D: { l: 'Н', cls: 'bg-white/[0.14] text-chalk', word: 'ничья' },
  L: { l: 'П', cls: 'text-mute ring-1 ring-inset ring-white/[0.16]', word: 'поражение' },
}

/** Мини-панель: подпись сверху, график под ней; одна в ряду — во всю ширину (на телефоне — всегда столбиком). */
function Panel({ title, wide = false, children }: { title: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={`min-w-0 rounded-[14px] bg-white/[0.035] px-3.5 py-3 lg:[@media(max-height:799px)]:py-2.5 ${wide ? 'sm:col-span-2' : ''}`}>
      <p className="truncate text-[13px] text-dim">{title}</p>
      <div className="mt-2 lg:[@media(max-height:799px)]:mt-1.5">{children}</div>
    </div>
  )
}

/** Форма — последние 5 матчей каждой команды, свежий справа; команда — эмблемой, как в табло слева. */
function FormChart({ m, form }: { m: Match; form: { home: Res[]; away: Res[] } }) {
  const row = (t: Match['home'], rs: Res[]) => (
    <div className="flex items-center gap-2.5" role="img" aria-label={`«${t.name}»: ${[...rs].reverse().map((r) => RES[r].word).join(', ')}`}>
      <span aria-hidden className="flex shrink-0">
        <TeamLogo name={t.name} src={t.logo} size={22} />
      </span>
      <span className="flex shrink-0 gap-1" aria-hidden>
        {[...rs].reverse().map((r, i) => (
          <span key={i} className={`grid h-[22px] w-[22px] place-items-center rounded-[6px] text-[13px] font-semibold lg:[@media(max-height:799px)]:h-5 lg:[@media(max-height:799px)]:w-5 ${RES[r].cls}`}>
            {RES[r].l}
          </span>
        ))}
      </span>
    </div>
  )
  return (
    <div className="space-y-1.5 lg:[@media(max-height:799px)]:space-y-1">
      {row(m.home, form.home)}
      {row(m.away, form.away)}
    </div>
  )
}

/** Голы — шанс 3+ голов крупной цифрой и полоской «сколько из 100». */
function GoalsChart({ p }: { p: number }) {
  return (
    <div>
      <p className="flex items-baseline gap-2">
        <span className="num text-[22px] font-semibold leading-none text-fg">{pct(p)}</span>
        <span className="truncate text-[13px] text-dim">шанс 3+ голов</span>
      </p>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/[0.08]" aria-hidden>
        <div className="h-full rounded-full bg-chalk" style={{ width: `${Math.round(p * 100)}%` }} />
      </div>
    </div>
  )
}

/**
 * Кэф упал — «было → стало» с открытия линии: процент янтарём, под ним наклонная линия из двух точек во всю
 * ширину (как у плитки «Кэф упал»; круче — сильнее падение). Та же схема, что у «Голов»: цифра, под ней линия.
 */
function DropMini({ d }: { d: ProgruzInfo }) {
  const y2 = 2 + Math.min(1, Math.max(0.25, d.drop / 0.35)) * 8
  return (
    <div>
      <p className="flex min-w-0 items-baseline gap-2">
        <span className="num text-[22px] font-semibold leading-none text-hot">−{Math.round(d.drop * 100)}%</span>
        <span className="num truncate text-[13px] text-dim">
          {d.from.toFixed(2)} → {d.to.toFixed(2)}
        </span>
      </p>
      {/* линия тянется во всю ширину панели, точки — отдельными кружками, чтобы не сплющивались */}
      <div className="relative mx-1 mt-2 h-3" aria-hidden>
        <svg viewBox="0 0 100 12" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
          <line x1="0" y1="2" x2="100" y2={y2} stroke="var(--color-hot)" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="absolute -left-1 top-[-2px] h-2 w-2 rounded-full border-[1.5px] border-hot bg-panel" />
        <span className="absolute -right-1 h-2 w-2 rounded-full bg-hot" style={{ top: y2 - 4 }} />
      </div>
    </div>
  )
}

/**
 * Графики справа под полосой шансов: форма, голы, падение кэфа — что есть по данным, не больше двух
 * (форма — только у разобранных матчей). Нет ни одного — остаются факты словами. После матча — ничего.
 */
function chartsFor(it: FeedItem): React.ReactNode[] {
  const m = it.match
  if (m.status === 'finished') return []
  const form = it.summary?.form
  const goals = goalsChance(it)
  const drop = parseProgruz(it)
  const out: { key: string; title: string; node: React.ReactNode }[] = []
  if (form?.home.length && form.away.length) out.push({ key: 'form', title: 'Форма · 5 матчей', node: <FormChart m={m} form={form} /> })
  if (goals !== null) out.push({ key: 'goals', title: 'Голы', node: <GoalsChart p={goals} /> })
  if (drop) out.push({ key: 'drop', title: `Кэф на ${team(m, drop.side)} упал`, node: <DropMini d={drop} /> })
  const shown = out.slice(0, 2)
  return shown.map((c) => (
    <Panel key={c.key} title={c.title} wide={shown.length === 1}>
      {c.node}
    </Panel>
  ))
}

/** Вывод до матча — только с выгодной ставкой: обычный прогноз модели бывает «против» главной фразы и путает. */
const verdictOf = (it: FeedItem) => {
  const m = it.match
  if (m.status !== 'scheduled') return null
  const pick = it.summary?.pick
  return buildVerdict({ match: m, tags: it.tags, pick: pick?.kind === 'value' ? pick : null })
}

/** Матч слайда для шапки и кнопок карточки: турнир, разбор и «Выгодно» — про матч, который сейчас на экране. */
function slideMeta(it: FeedItem): MainSlide {
  const m = it.match
  const v = verdictOf(it)
  const pick = m.status === 'scheduled' ? it.summary?.pick : null
  const bet = v?.bet && pick ? { label: pick.key === v.side ? 'Выгодно' : `Выгодно: ${v.bet.text}`, odd: v.bet.odd } : null
  const caption = `${leagueShort(m.league)}${m.round ? ` · ${m.round}` : ''}`
  return { id: m.id, href: matchHref(m), live: isLive(m), caption, bet }
}

/**
 * Факты «почему» одной панелью; на компьютере второй — от 800px высоты окна: факт бывает в две строки,
 * и на окне 720–800px сводка иначе не влезает целиком.
 */
function Facts({ reasons, className = '' }: { reasons: Reason[]; className?: string }) {
  return (
    <ul className={`rounded-[14px] bg-white/[0.035] px-3.5 ${className}`}>
      {reasons.map((r, i) => (
        <li
          key={i}
          className={`flex items-center gap-3 border-t border-edge py-2 text-[14px] leading-snug text-chalk first:border-t-0 ${i === 1 ? 'lg:[@media(max-height:799px)]:hidden' : ''}`}
        >
          <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-[7px] ${r.hot ? 'bg-hot/[0.14] text-hot' : 'bg-white/[0.06] text-chalk'}`}>
            <ArtIcon name={r.icon} className="h-[13px] w-[13px]" />
          </span>
          <span className="line-clamp-2">{r.text}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Слайд главного матча — как карточка матча в спортивных приложениях. На компьютере в две колонки:
 * слева турнир и табло (названия команд — главный акцент, время скромнее), справа через тонкий
 * разделитель — вывод словами, полоса шансов с подписями и кэфами и два факта; у сыгранного матча —
 * счёт и итог глазами шансов. На телефоне — столбиком. Кнопки и стрелки — у ленты (TopCarousel).
 */
function TopSlide({ it }: { it: FeedItem }) {
  const m = it.match
  const live = isLive(m)
  const finished = m.status === 'finished'
  const played = Boolean(m.score) && (live || finished)
  const v = verdictOf(it)
  const bet = slideMeta(it).bet
  // факты о командах полезны и во время игры; после матча — уже нет
  const reasons = finished ? [] : reasonsFor(it, v)
  // до матча — вывод; в игре и после — счёт глазами шансов до матча: у всех слайдов одна схема «фраза → полоса»
  const headline = v?.headline ?? (played ? playedLine(m) : null)
  const odds = Boolean(fair1x2(m.odds?.x12))
  const charts = chartsFor(it)
  const minute = m.statusCode === 4 ? 'перерыв' : m.elapsed ? `${m.elapsed}-я минута` : 'идёт'
  const wide = odds || charts.length > 0 || reasons.length > 0
  const score = played ? m.score : null
  // ярче — фаворит до матча, в игре и после — кто ведёт или победил; равные силы или ничья — обе команды яркие
  const lead = score ? (score.home === score.away ? null : score.home > score.away ? 'home' : 'away') : (v?.side ?? null)
  const tone = (k: 'home' | 'away') => (lead && lead !== k ? 'text-chalk' : 'text-fg')
  const BIG = 'num whitespace-nowrap font-semibold leading-none tracking-[-0.03em] text-[26px] sm:text-[30px] lg:text-[clamp(28px,4.2vh,46px)]'
  const row = (t: Match['home'], k: 'home' | 'away') => (
    <span className="flex min-w-0 items-center gap-3">
      <TeamLogo name={t.name} src={t.logo} size="var(--logo)" />
      <span className={`line-clamp-2 text-[20px] font-semibold leading-tight tracking-[-0.02em] sm:text-[22px] lg:text-[clamp(22px,3.2vh,32px)] ${tone(k)}`}>{t.name}</span>
    </span>
  )

  return (
    <div className={`relative flex min-w-0 flex-1 flex-col justify-center gap-4 ${wide ? 'lg:grid lg:grid-cols-2 lg:items-center lg:gap-x-10' : ''}`}>
      {/* турнир и тур — в шапке карточки (TopCarousel), напротив стрелок и чипа дня */}
      <div className="flex min-w-0 flex-col gap-4 lg:gap-[clamp(16px,2.4vh,26px)] lg:[@media(max-height:739px)]:gap-3">
        {/* табло строками, как в спортивных приложениях: эмблема и название — хозяева сверху, гости снизу;
            справа время (после свистка — счёт у каждой команды). Вся карточка открывает сторис;
            эмблемы и названия растут с высотой окна, чтобы на большом мониторе карточка не пустела */}
        <StoryLink
          id={m.id}
          href={matchHref(m)}
          className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-3 [--logo:30px] lg:gap-y-[clamp(10px,1.6vh,16px)] lg:[--logo:clamp(30px,4.4vh,42px)] lg:[@media(max-height:739px)]:[--logo:28px] ${COVER}`}
        >
          {row(m.home, 'home')}
          {score ? (
            <span className={`${BIG} text-right ${live ? 'text-live' : tone('home')}`}>{score.home}</span>
          ) : (
            <span className="row-span-2 flex flex-col items-end text-right">
              <span className={BIG}>{formatTime(m.ts)}</span>
              <span className={`mt-2 whitespace-nowrap text-[13px] font-medium ${live ? 'text-live' : 'text-dim'}`}>{live ? minute : until(m.ts)}</span>
            </span>
          )}
          {row(m.away, 'away')}
          {score ? <span className={`${BIG} text-right ${live ? 'text-live' : tone('away')}`}>{score.away}</span> : null}
          {score ? (
            <span className={`col-span-2 -mt-1 text-right text-[13px] font-medium ${live ? 'text-live' : 'text-dim'}`}>{live ? minute : 'итог'}</span>
          ) : null}
        </StoryLink>
        {/* на компьютере «Разбор за минуту» и «Выгодно» — под табло (на телефоне — под лентой, в TopCarousel);
            вся карточка — ссылка на сторис, поэтому здесь это подписи, а не отдельные кнопки */}
        <div aria-hidden className="hidden flex-wrap items-center gap-2 lg:flex">
          <span className={`${CHIP} shrink-0 gap-2 pl-1 pr-3.5`}>
            <StoryChipFace />
          </span>
          {bet ? <ValueChip label={bet.label} odd={bet.odd} /> : null}
        </div>
      </div>

      {wide ? (
        <div className="flex min-w-0 flex-col gap-4 lg:gap-3.5 lg:border-l lg:border-edge lg:pl-10 lg:[@media(max-height:799px)]:gap-3">
          {odds ? (
            // фраза → на чём она основана: шансы по кэфам перед матчем (и у идущего, и у сыгранного)
            <div>
              {headline ? (
                <p className="mb-2.5 text-[17px] font-semibold leading-snug tracking-[-0.01em] lg:text-[clamp(17px,2.5vh,24px)]">{headline}</p>
              ) : null}
              <ChanceBar m={m} />
            </div>
          ) : null}
          {charts.length ? (
            <>
              {/* графики вместо фактов словами: форма, голы, падение кэфа — что есть по данным. На невысоком окне
                  (ниже 740px) на них нет места — там, как раньше, один факт словами */}
              <div className="grid gap-3 sm:grid-cols-2 lg:[@media(max-height:739px)]:hidden">{charts}</div>
              {reasons.length ? <Facts reasons={reasons.slice(0, 1)} className="hidden lg:[@media(max-height:739px)]:block" /> : null}
            </>
          ) : reasons.length ? (
            <Facts reasons={reasons} />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

// ─── Переходы под блоком ─────────────────────────────────────────────────────

/**
 * Компактный переход в раздел: название, строка с цифрой и строка с матчем, стрелка. Списков матчей
 * внутри нет — они ниже, по прокрутке, и на страницах тегов. Все одной высоты; широкий («Кэф упал») — с графиком.
 */
function NavTile({
  title,
  hint,
  lead,
  note,
  href,
  live = false,
  aside,
}: {
  title: string
  hint?: string
  lead: React.ReactNode
  note?: React.ReactNode
  href: string
  live?: boolean
  aside?: React.ReactNode
}) {
  return (
    <Link href={href} prefetch={false} className={`group flex h-full min-w-0 flex-col p-[18px] transition-colors hover:border-edge-2 ${CARD}`}>
      {/* стрелка — в строке названия (в углу: сверху и справа поровну): так строкам с цифрой и матчем достаётся вся ширина */}
      <span className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-1.5 text-[15px] font-semibold text-fg">
          {live ? <span className="h-1.5 w-1.5 shrink-0 animate-pulse-live rounded-full bg-live" aria-hidden /> : null}
          <span className="shrink-0">{title}</span>
          {hint ? <span className="truncate text-[13px] font-normal text-mute">· {hint}</span> : null}
        </span>
        <Go />
      </span>
      <span className="mt-auto flex items-end gap-4 pt-1">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] text-chalk">{lead}</span>
          {note ? <span className="mt-0.5 block truncate text-[13px] text-dim">{note}</span> : null}
        </span>
        {aside}
      </span>
    </Link>
  )
}

/**
 * «Было → стало» одного исхода: две точки — открытие линии и последнее значение. Истории по часам у нас
 * пока нет, поэтому кривой не рисуем: прямая между двумя честными точками, круче — сильнее падение.
 * Янтарь — цвет «кэф упал».
 */
function DropChart({ drop }: { drop: number }) {
  const y2 = 6 + Math.min(1, Math.max(0.25, drop / 0.35)) * 28
  return (
    <span className="-mt-1 hidden shrink-0 items-center gap-3 sm:flex" aria-hidden>
      <svg viewBox="0 0 96 40" className="h-9 w-24 overflow-visible">
        <line x1="5" y1="6" x2="91" y2={y2} stroke="var(--color-hot)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="5" cy="6" r="3.5" fill="var(--color-panel)" stroke="var(--color-hot)" strokeWidth="2" />
        <circle cx="91" cy={y2} r="4" fill="var(--color-hot)" />
      </svg>
      <span className="num text-[22px] font-semibold tracking-[-0.03em] text-hot">−{Math.round(drop * 100)}%</span>
    </span>
  )
}

/**
 * «Сводка дня» — первый экран: сверху «Главные матчи» (до пяти важных встреч, стрелки «1 из 4», чип дня
 * меняет только этот блок), под ним три перехода 1:1:2 — «Все матчи», «Ждём голов» и широкий «Кэф упал».
 * Кнопки и цифры под блоком — про день страницы.
 */
export function DaySummary({
  s,
  days,
  className = '',
}: {
  s: Summary
  /** дни чипа в блоке; `page` — день страницы: с него блок и открывается */
  days: { key: string; label: string; items: FeedItem[]; page?: boolean }[]
  className?: string
}) {
  const shown = days.filter((d) => d.items.length)
  const initial = shown.findIndex((d) => d.page)
  if (initial < 0) return null
  const { goals: g, drop: d } = navExamples(s)
  const when = (it: FeedItem) => (isLive(it.match) ? 'идёт' : it.match.status === 'finished' ? 'сыгран' : formatTime(it.match.ts))
  const pair = (it: FeedItem) => `${it.match.home.name} — ${it.match.away.name}`
  return (
    <section aria-label="Сводка дня" className={`flex flex-col ${className}`}>
      <TopCarousel
        days={shown.map((day) => ({ key: day.key, label: day.label, slides: day.items.map(slideMeta) }))}
        panels={shown.map((day) => day.items.map((it) => <TopSlide key={it.match.id} it={it} />))}
        initial={initial}
        className={`lg:flex-1 ${CARD}`}
      />
      {/* маленькая подпись над рядом — как «Топ-турниры» на странице лиг */}
      <h2 className="mb-2.5 mt-5 text-[13px] font-medium text-mute lg:[@media(min-height:740px)_and_(max-height:799px)]:mt-4 lg:[@media(max-height:739px)]:mt-3">Цифры дня</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <NavTile
          title="Все матчи"
          href="#matches"
          live={s.liveCount > 0}
          lead={s.liveCount > 0 ? `${pluralN(s.liveCount, ['идёт', 'идут', 'идут'])} сейчас` : `${pluralN(s.total, MATCHES)} · ${pluralN(s.leagues, TOURNEYS)}`}
          note={
            s.liveCount > 0
              ? `всего ${pluralN(s.total, MATCHES)} · ${pluralN(s.leagues, TOURNEYS)}`
              : s.next
                ? `ближайший в ${formatTime(s.next.match.ts)}`
                : 'все сыграны — итоги в списке'
          }
        />
        <NavTile
          title="Ждём голов"
          href="/tag/tb-2-5"
          lead={
            g ? (
              <>
                <span className="num font-semibold text-fg">{pct(g.p)}</span> — шанс 3+ голов
              </>
            ) : (
              'Подборка матчей на 3+ гола'
            )
          }
          note={g ? pair(g.item) : undefined}
        />
        <div className="min-w-0 sm:col-span-2">
          <NavTile
            title="Кэф упал"
            hint="с открытия линии"
            href="/tag/progruz"
            lead={
              d ? (
                <>
                  на победу {team(d.item.match, d.side)}: <span className="num">{d.from.toFixed(2)}</span> →{' '}
                  <span className="num font-semibold text-hot">{d.to.toFixed(2)}</span>
                </>
              ) : (
                'Заметных падений кэфа нет'
              )
            }
            note={d ? `${pair(d.item)} · ${when(d.item)}` : undefined}
            aside={d ? <DropChart drop={d.drop} /> : null}
          />
        </div>
      </div>
    </section>
  )
}
