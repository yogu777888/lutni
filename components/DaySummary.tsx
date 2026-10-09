import Link from 'next/link'
import { featuredInfo } from '@/config/leagues'
import { goHref, SPONSORED_REL } from '@/lib/affiliate'
import type { FeedItem } from '@/lib/data'
import { GOALS_PICK, type DayCounts, type GoalsPick, type MovePick } from '@/lib/day-summary'
import { formatDayMonth, formatTime, pct, pluralN, todayYmd, ymdInTz } from '@/lib/format'
import { moveOutcome, periodText, x12Line, type OddsSnap, type X12Line } from '@/lib/lines'
import { matchHref } from '@/lib/links'
import { isLive } from '@/lib/rank'
import type { League, Match } from '@/lib/types'
import { StoryLink } from './story/StoryLink'
import { discBackground, StorySymbol, symbolColor } from './story/StorySymbol'
import { TeamLogo } from './TeamLogo'
import type { HandNotes } from '@/lib/hand-notes'
import { TopCarousel, type DayLink, type MainSlide } from './TopCarousel'

/** Ссылка-накладка: вся карточка кликабельна, а текст ссылки — понятное название. */
const COVER = "after:absolute after:inset-0 after:rounded-[22px] after:content-['']"
/** Карточки сводки без обводки: фон светлее страницы; прозрачная рамка видна только в режиме высокой контрастности. */
const SURFACE = 'surface rounded-[22px] border bg-panel-2'

const MATCHES = ['матч', 'матча', 'матчей'] as const
const leagueShort = (l: League) => featuredInfo(l)?.short || l.name
const pair = (m: Match) => `${m.home.name} — ${m.away.name}`

/** Время снимка линии: сегодня — «19:25», в другой день — «3 октября, 19:25». */
const snapTime = (at: number) => (ymdInTz(at) === todayYmd() ? formatTime(at) : `${formatDayMonth(at)}, ${formatTime(at)}`)

// ─── Главные матчи ───────────────────────────────────────────────────────────

/** Матч главного блока и линия одного букмекера — для строки кэфов до начала. */
export type MainItem = {
  it: FeedItem
  snap: OddsSnap | null
  /** цвета клубов (lib/team-colors) — мягкая подкраска половин карточки; нет — без неё */
  tint?: { home: string; away: string } | null
  /** приписки «от руки» над командами (lib/hand-notes.ts): «лидер», «4 победы подряд»… */
  notes?: HandNotes | null
}

/**
 * Приписка над эмблемой, как от руки: красным рукописным шрифтом (Caveat), чуть наискось, и кривая стрелка вниз
 * к эмблеме. Текст уходит от края карточки к центру: у хозяев — вправо, у гостей — влево (зеркально). Поверх —
 * на высоту табло не влияет.
 */
function HandNote({ text, side }: { text: string; side: 'home' | 'away' }) {
  const away = side === 'away'
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute bottom-[calc(100%-4px)] flex flex-col text-live ${away ? 'right-[18%] items-end' : 'left-[18%] items-start'}`}
    >
      {/* на телефоне длинная приписка — в две строки (иначе заходит на счёт), на компьютере — в одну */}
      <span
        className={`font-hand block w-max max-w-[7.5rem] text-balance text-[21px] leading-[0.9] sm:max-w-none sm:whitespace-nowrap lg:text-[clamp(20px,3vh,28px)] ${away ? 'mr-3.5 rotate-[6deg] text-right' : 'ml-3.5 -rotate-[6deg]'}`}
      >
        {text}
      </span>
      <svg
        viewBox="0 0 24 28"
        className={`-mt-0.5 h-[17px] w-[15px] sm:h-[22px] sm:w-[19px] lg:h-[clamp(18px,2.6vh,26px)] lg:w-auto ${away ? '-scale-x-100' : ''}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 2.5c-4.5 3.5-1.5 8.5-4.2 13.4-1 1.9-2.4 4.4-3.3 8.1" />
        <path d="M3.4 19.6l4 5.1 3.6-5" />
      </svg>
    </span>
  )
}

/** Матч слайда для шапки и кнопки разбора: турнир и разбор — про матч, который сейчас на экране. */
function slideMeta(it: FeedItem): MainSlide {
  const m = it.match
  return { id: m.id, href: matchHref(m), live: isLive(m), caption: `${leagueShort(m.league)}${m.round ? ` · ${m.round}` : ''}`, title: `${m.home.name} — ${m.away.name}` }
}

/**
 * Строка кэфов до начала: «Хозяева 2.10 · Ничья 3.40 · Гости 3.20 · Фонбет · Реклама» — линия одного легального
 * букмекера (x12Line), переход к нему через /go (учёт кликов, rel=sponsored); время снимка — в подсказке. Тихая, под
 * табло: главное в карточке — матч, но без неё с первого экрана к ставке вёл только «Бонус» в углу. Ссылка — поверх
 * накладки сторис (z-index). В игре и после строки нет: LIVE-кэфы не показываем.
 */
function OddsLine({ line, m }: { line: X12Line; m: Match }) {
  const odds = [
    ['Хозяева', line.home],
    ['Ничья', line.draw],
    ['Гости', line.away],
  ] as const
  return (
    <a
      href={goHref(line.slug, 'main-odds', m.id)}
      target="_blank"
      rel={SPONSORED_REL}
      title={`Коэффициенты ${line.bookmaker}, линия на ${snapTime(line.at)}`}
      className="relative z-[2] mx-auto mt-4 flex w-fit max-w-full flex-wrap items-baseline justify-center gap-x-4 gap-y-1 rounded-[12px] px-3 py-1.5 transition-colors hover:bg-white/[0.07] lg:mt-[clamp(6px,1.8vh,16px)]"
    >
      {odds.map(([label, odd]) => (
        <span key={label} className="flex items-baseline gap-1.5">
          <span className="text-[14px] text-fg/70">{label}</span>
          <span className="num text-[16px] font-semibold text-fg">{odd.toFixed(2)}</span>
        </span>
      ))}
      <span className="text-[13px] text-fg/55">{line.bookmaker} · Реклама</span>
    </a>
  )
}

/**
 * Размер названия на телефоне: колонка команды там узкая (около 100px), и длинное слово («Саутгемптон»,
 * «Мёнхенгладбах») не влезает — мельче шрифт, а не перенос по букве. Не мельче 13px.
 */
function phoneSize(name: string): string {
  const longest = Math.max(...name.split(/[\s-]+/).map((w) => w.length))
  return longest >= 12 ? 'text-[13px]' : longest >= 10 ? 'text-[15px]' : 'text-[17px]'
}

/**
 * Главный матч, как в Apple Sports: табло по центру — эмблема на матовом светлом круге и название под ней (хозяева
 * слева, гости справа), в середине «Начало 21:00 мск» / счёт и минута / «итог» и под ними светлая «Разбор матча»;
 * проигравший тусклее. Под табло до начала — строка кэфов одного букмекера. Вся карточка открывает сторис;
 * фон — графит с эмблемами команд крупным тиснением (TopCarousel).
 */
function MatchSlide({ item }: { item: MainItem }) {
  const notes = item.notes ?? null
  const { it, snap } = item
  const m = it.match
  const line = m.status === 'scheduled' ? x12Line(snap) : null
  const live = isLive(m)
  const finished = m.status === 'finished'
  const score = (live || finished) && m.score ? m.score : null
  const minute = m.statusCode === 4 ? 'перерыв' : m.elapsed ? `${m.elapsed}-я минута` : 'идёт'
  // после свистка проигравший чуть тусклее; до матча и при ничьей — обе одинаково
  const lead = score && score.home !== score.away ? (score.home > score.away ? 'home' : 'away') : null
  const BIG = 'num whitespace-nowrap font-semibold leading-none tracking-[-0.03em] text-fg text-[36px] sm:text-[44px] lg:text-[clamp(28px,calc(14vh_-_62px),68px)]'
  // эмблема на матовом светлом круге, как в Apple Sports: тёмные эмблемы не тонут в цвете фона
  const team = (t: Match['home'], k: 'home' | 'away') => (
    <span className={`flex min-w-0 flex-col items-center gap-3 text-center lg:gap-4 ${lead && lead !== k ? 'opacity-70' : ''}`}>
      <span className="relative grid h-[var(--disc)] w-[var(--disc)] shrink-0 place-items-center rounded-full bg-white/[0.16] ring-1 ring-white/25 backdrop-blur-md">
        {notes?.[k] ? <HandNote text={notes[k]} side={k} /> : null}
        {/* при перелистывании эмблема вздрагивает, как желе: сжимается и разжимается с отскоком; гости — чуть позже */}
        <span className={`jelly grid place-items-center ${k === 'away' ? '[--jelly-delay:0.3s]' : ''}`}>
          <TeamLogo name={t.name} src={t.logo} size="calc(var(--disc) * 0.6)" />
        </span>
      </span>
      <span className={`line-clamp-2 max-w-full hyphens-auto text-balance break-words font-semibold leading-tight tracking-[-0.02em] text-fg sm:text-[20px] lg:text-[clamp(22px,3.1vh,30px)] ${phoneSize(t.name)}`}>{t.name}</span>
    </span>
  )
  return (
    <div className="relative flex min-w-0 flex-1 flex-col justify-center">
      {/* табло по центру: хозяева — на своём цвете слева, гости — справа, между ними время или счёт */}
      <StoryLink
        id={m.id}
        href={matchHref(m)}
        className={`grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-3 py-2 [--disc:64px] sm:gap-x-6 sm:[--disc:80px] lg:gap-x-10 lg:[--disc:clamp(36px,calc(26vh_-_136px),112px)] ${COVER}`}
      >
        {team(m.home, 'home')}
        <span className="flex flex-col items-center text-center">
          {score ? (
            <>
              <span className={BIG}>
                {score.home} : {score.away}
              </span>
              <span className="mt-2 flex items-center gap-1.5 text-[13px] font-medium text-fg/85">
                {live ? <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-live" aria-hidden /> : null}
                {live ? minute : 'итог'}
              </span>
            </>
          ) : (
            <>
              <span className="text-[13px] text-fg/75">Начало</span>
              <span className={`${BIG} mt-1.5`}>{formatTime(m.ts)}</span>
              <span className="mt-1.5 text-[13px] text-fg/75">мск</span>
            </>
          )}
          {/* вся карточка — ссылка на сторис, поэтому это подпись, а не отдельная кнопка; на телефоне — кнопка под лентой */}
          <span aria-hidden className="mt-5 hidden h-11 lg:mt-[clamp(6px,calc(4vh_-_12px),20px)] lg:h-[clamp(32px,calc(8vh_-_20px),44px)] shrink-0 items-center gap-2 whitespace-nowrap rounded-[12px] bg-btn px-5 text-[15px] font-semibold text-btn-ink lg:inline-flex">
            Разбор матча
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17 17 7" />
              <path d="M8 7h9v9" />
            </svg>
          </span>
        </span>
        {team(m.away, 'away')}
      </StoryLink>
      {line ? <OddsLine line={line} m={m} /> : null}
    </div>
  )
}


// ─── Подборки под блоком ─────────────────────────────────────────────────────

/** Тихая стрелка рядом с названием плитки: вся плитка — ссылка, отдельная кнопка не нужна. */
function Chevron() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-dim transition duration-300 group-hover:translate-x-0.5 group-hover:text-fg" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

/**
 * Плитка подборки: знак темы на цветном диске — та же система, что у историй (StorySymbol: белый знак, градиент
 * цвета темы), название с тихой стрелкой и одна строка по делу. `aside` — справа от названия (на телефоне —
 * третьей строкой), строка под названием — на всю ширину.
 */
function IconTile({
  sym,
  title,
  href,
  line,
  aside,
  hint,
}: {
  /** знак — ключ StorySymbol (pick-all, pick-goals, pick-moves) */
  sym: string
  title: string
  href: string
  line: React.ReactNode
  aside?: React.ReactNode
  /** подсказка при наведении — полная фраза, если строка обрезана */
  hint?: string
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      title={hint}
      className={`group grid h-full min-w-0 grid-cols-[40px_minmax(0,1fr)] content-center items-center gap-x-3 p-[18px] transition-colors hover:bg-panel-3 lg:py-[clamp(10px,2.2vh,18px)] ${aside ? 'sm:grid-cols-[40px_minmax(0,1fr)_auto]' : ''} ${SURFACE}`}
    >
      {/* при наведении — чуть крупнее */}
      <span
        aria-hidden
        className={`story-disc col-start-1 grid h-10 w-10 place-items-center rounded-full transition-transform duration-300 group-hover:scale-105 ${aside ? 'row-[1/span_3] sm:row-[1/span_2]' : 'row-[1/span_2]'}`}
        style={{ background: discBackground(symbolColor(sym)) }}
      >
        <StorySymbol k={sym} tone="#ffffff" className="h-[56%] w-[56%]" />
      </span>
      <span className="col-start-2 row-start-1 flex min-w-0 items-center gap-1">
        <span className="truncate text-[15px] font-semibold leading-5 text-fg">{title}</span>
        <Chevron />
      </span>
      {/* начало и размах — одним значением: «sm:col-span-2» перебил бы col-start (grid-column пишется целиком) */}
      <span className={`col-start-2 row-start-2 block min-w-0 truncate text-[14px] leading-5 text-dim ${aside ? 'sm:col-[2/span_2]' : ''}`}>{line}</span>
      {aside ? <span className="col-start-2 row-start-3 mt-1 sm:col-start-3 sm:row-start-1 sm:mt-0 sm:justify-self-end">{aside}</span> : null}
    </Link>
  )
}

/**
 * Подборки — три перехода к страницам дня, без подписи-повтора и графика. У «Движения коэффициентов» —
 * эмблемы матча и исход, справа от названия — «1.28 → 1.51» и метка «+18%» (упал — янтарь, вырос — серый); букмекер
 * и период («с открытия линии до 19:30») — в подсказке.
 */
function IconPicks({ p }: { p: DayPicks }) {
  const c = p.counts
  const g = p.goals
  const total = pluralN(c.total, MATCHES)
  const all: React.ReactNode =
    c.live > 0 ? (
      <>
        {total} · <span className="text-live">{c.live} LIVE</span>
      </>
    ) : p.past || !c.next ? (
      `${total} · ${c.finished ? 'все сыграны' : 'итоги в списке'}`
    ) : (
      `${total} · ${c.finished ? 'следующий' : 'первый'} в ${formatTime(c.next.match.ts)}`
    )
  const goals = g.picks.length
    ? `${pluralN(g.picks.length, MATCHES)} с шансом от ${pct(GOALS_PICK)}`
    : g.covered
      ? `Матчей с шансом от ${pct(GOALS_PICK)} нет`
      : 'Линия ещё загружается'
  const mv = p.move
  let move: React.ReactNode = p.movesCovered ? 'Заметных изменений линии нет' : 'Линия ещё загружается'
  let aside: React.ReactNode = null
  let hint: string | undefined
  if (mv) {
    const m = mv.it.match
    const { from, to, change, bookmaker } = mv.mv
    const down = change < 0
    const outcome = moveOutcome(mv.mv.key, { home: m.home.name, away: m.away.name })
    move = (
      <span className="flex min-w-0 items-center gap-2">
        <span className="flex shrink-0 gap-1">
          <TeamLogo name={m.home.name} src={m.home.logo} size={18} />
          <TeamLogo name={m.away.name} src={m.away.logo} size={18} />
        </span>
        <span className="truncate">
          {pair(m)} · {outcome}
        </span>
      </span>
    )
    aside = (
      <span className="flex items-center gap-2">
        <span className="num whitespace-nowrap text-[15px] leading-5 text-dim">
          {from.toFixed(2)} <span className="text-mute">→</span> <span className={`font-semibold ${down ? 'text-hot' : 'text-fg'}`}>{to.toFixed(2)}</span>
        </span>
        <span className={`num inline-flex h-5 items-center whitespace-nowrap rounded-[6px] px-1.5 text-[13px] font-medium ${down ? 'bg-hot/[0.12] text-hot' : 'bg-white/[0.06] text-chalk'}`}>
          {down ? '−' : '+'}
          {Math.abs(Math.round(change * 100))}%
        </span>
      </span>
    )
    hint = `${pair(m)}, ${outcome}. ${bookmaker}: ${from.toFixed(2)} → ${to.toFixed(2)} ${periodText(mv.mv.at, m.ts)}`
  }
  return (
    // 1 : 1 : 1.6, а не 1 : 1 : 2: строке маленьких плиток нужно место, а у широкой середина пустовала
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.6fr)]">
      <IconTile sym="pick-all" title="Все матчи" href={`${p.dayHref}#matches`} line={all} />
      <IconTile sym="pick-goals" title="Голевые матчи" href={`/matches/${p.ymd}/goals`} line={goals} />
      <div className="min-w-0 sm:col-span-2 lg:col-span-1">
        <IconTile sym="pick-moves" title="Движение коэффициентов" href={`/matches/${p.ymd}/odds`} line={move} aside={aside} hint={hint} />
      </div>
    </div>
  )
}

/** Превью и ссылки подборок — про день страницы. */
export type DayPicks = {
  ymd: string
  /** ссылка на страницу дня (у сегодняшнего — главная) */
  dayHref: string
  past: boolean
  counts: DayCounts
  goals: { picks: GoalsPick[]; covered: number }
  move: MovePick | null
  movesCovered: number
}

/**
 * «Сводка дня» — первый экран: сверху «Главные матчи» (до пяти важных встреч, стрелки, полоски-точки, чип дня —
 * переход на страницу другого дня), под ним «Подборки» — три перехода к страницам дня: «Все матчи», «Голевые
 * матчи» и широкий «Движение коэффициентов». Истории — короткий просмотр матчей, подборки — полные списки дня со
 * сравнением и фильтрами.
 */
export function DaySummary({ mains, days, picks, className = '' }: { mains: MainItem[]; days: DayLink[]; picks: DayPicks; className?: string }) {
  if (!mains.length) return null
  return (
    <section aria-label="Сводка дня" className={`flex flex-col ${className}`}>
      <TopCarousel
        slides={mains.map((x) => slideMeta(x.it))}
        panels={mains.map((x) => <MatchSlide key={x.it.match.id} item={x} />)}
        days={days}
        marks={mains.map(({ it, tint }) => ({ home: it.match.home.logo, away: it.match.away.logo, tint: tint ?? null }))}
        className={`lg:flex-1 ${SURFACE}`}
      />
      {/* маленькая подпись над рядом — как «Топ-турниры» на странице лиг; к плиткам ближе, чем к блоку сверху */}
      <h2 className="mb-2.5 mt-4 text-[13px] font-medium text-mute lg:mb-[clamp(6px,1.2vh,10px)] lg:mt-[clamp(8px,1.8vh,16px)]">
        Подборки
      </h2>
      <IconPicks p={picks} />
    </section>
  )
}
