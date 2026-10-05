import Link from 'next/link'
import { featuredInfo } from '@/config/leagues'
import type { FeedItem } from '@/lib/data'
import { GOALS_PICK, type DayCounts, type GoalsPick, type MovePick } from '@/lib/day-summary'
import { lineFact, pickFacts } from '@/lib/facts'
import { appNow, formatDayMonth, formatTime, pct, plural, pluralN, todayYmd, ymdInTz } from '@/lib/format'
import { biggestMove, lineMoves, moveOutcome, periodEndLabel, x12Line, type LineMove, type OddsSnap } from '@/lib/lines'
import { matchHref } from '@/lib/links'
import { isLive } from '@/lib/rank'
import { posterLike, type Look } from '@/lib/looks'
import type { League, Match, MatchFull, StatPair } from '@/lib/types'
import { CHIP, StoryChipFace } from './Chips'
import { StoryLink } from './story/StoryLink'
import { TeamLogo } from './TeamLogo'
import { TopCarousel, type Backdrop, type DayLink, type MainSlide } from './TopCarousel'

/** Ссылка-накладка: вся карточка кликабельна, а текст ссылки — понятное название. */
const COVER = "after:absolute after:inset-0 after:rounded-[22px] after:content-['']"
const CARD = 'rounded-[22px] border border-edge bg-panel shadow-[inset_0_1px_0_rgb(255_255_255/0.035)]'
/** Поверхность карточек по виду: «Полосы» — панель с рамкой, «Точки» — мягкая плитка без рамки, «Цифры» — только контур. */
const SURFACE: Record<Look, string> = {
  bars: CARD,
  dots: 'rounded-[24px] bg-panel',
  digits: 'rounded-[22px] border border-edge',
  // без обводки: плитки светлее фона страницы; прозрачная рамка видна только в режиме высокой контрастности
  poster: 'rounded-[22px] border border-transparent bg-panel-2',
  crest: 'rounded-[22px] border border-transparent bg-panel-2',
}
const HOVER: Record<Look, string> = { bars: 'hover:border-edge-2', dots: 'hover:bg-panel-2', digits: 'hover:bg-white/[0.02]', poster: 'hover:bg-panel-3', crest: 'hover:bg-panel-3' }

const MATCHES = ['матч', 'матча', 'матчей'] as const
const TOURNEYS = ['турнир', 'турнира', 'турниров'] as const
const leagueShort = (l: League) => featuredInfo(l)?.short || l.name
const pair = (m: Match) => `${m.home.name} — ${m.away.name}`

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

/** Время снимка линии: сегодня — «19:25», в другой день — «3 октября, 19:25». */
const snapTime = (at: number) => (ymdInTz(at) === todayYmd() ? formatTime(at) : `${formatDayMonth(at)}, ${formatTime(at)}`)

// ─── Главные матчи ───────────────────────────────────────────────────────────

/** Матч главного блока: линия одного букмекера (до начала) и статистика (в игре и после) — что успели получить. */
/** Фон «Афиши»: цвета клубов; в «Эмблемах» — ещё и эмблемы команд для крупного тиснения за ними. */
function backdropOf(x: MainItem, marks: boolean): Backdrop | null {
  if (!marks) return x.colors ?? null
  const m = x.it.match
  return { ...(x.colors ?? {}), marks: { home: m.home.logo, away: m.away.logo } }
}

export type MainItem = {
  it: FeedItem
  snap: OddsSnap | null
  full: MatchFull | null
  /** «Афиша»: цвета клубов из эмблем (lib/team-colors.ts) — только для этого вида */
  colors?: { home: string; away: string } | null
}

/**
 * До начала: строка кэфов одного букмекера с временем снимка («Фонбет, линия на 19:25») и два факта с выборкой
 * — о командах или движении линии. Вероятностей и выводов здесь нет: они — в подробностях матча.
 */
function PreMatch({ m, snap, facts, look }: { m: Match; snap: OddsSnap | null; facts: string[]; look: Look }) {
  const line = x12Line(snap)
  const odds = line
    ? ([
        ['Хозяева', line.home],
        ['Ничья', line.draw],
        ['Гости', line.away],
      ] as const)
    : []
  const ODD = 'num font-semibold tracking-[-0.02em] text-fg'
  return (
    <div className="flex min-w-0 flex-col gap-5 lg:gap-[clamp(16px,2.4vh,24px)]">
      {line ? (
        <div>
          <p className="text-[13px] text-dim">
            Коэффициенты · {line.bookmaker}, линия на {snapTime(line.at)}
          </p>
          {look === 'dots' ? (
            // «Точки»: три мягкие кнопки, как в линии букмекера — исход сверху, кэф под ним
            <p className="mt-2 grid grid-cols-3 gap-2">
              {odds.map(([label, odd]) => (
                <span key={label} className="flex min-w-0 flex-col rounded-[12px] bg-white/[0.05] px-3 py-2">
                  <span className="truncate text-[13px] text-dim">{label}</span>
                  <span className={`${ODD} text-[19px] leading-tight`}>{odd.toFixed(2)}</span>
                </span>
              ))}
            </p>
          ) : look === 'digits' ? (
            // «Цифры»: три колонки, подпись над кэфом, без подложек
            <p className="mt-2 grid grid-cols-3 gap-4">
              {odds.map(([label, odd]) => (
                <span key={label} className="flex min-w-0 flex-col">
                  <span className="truncate text-[13px] text-mute">{label}</span>
                  <span className={`${ODD} text-[22px] leading-tight lg:text-[clamp(22px,2.8vh,26px)]`}>{odd.toFixed(2)}</span>
                </span>
              ))}
            </p>
          ) : (
            <p className="mt-1.5 flex flex-wrap items-baseline gap-x-6 gap-y-1">
              {odds.map(([label, odd]) => (
                <span key={label} className="flex items-baseline gap-2">
                  <span className="text-[14px] text-dim">{label}</span>
                  <span className={`${ODD} text-[20px] lg:text-[clamp(20px,2.6vh,24px)]`}>{odd.toFixed(2)}</span>
                </span>
              ))}
            </p>
          )}
        </div>
      ) : (
        <p className="text-[14px] text-dim">Линии легального букмекера на матч пока нет</p>
      )}
      {facts.length ? (
        <ul className={look === 'digits' ? 'divide-y divide-edge' : 'space-y-2.5'} aria-label={`Факты о матче ${pair(m)}`}>
          {facts.map((f, k) => (
            // второй факт — от 740px высоты окна: на невысоком окне сводка иначе не влезает
            <li
              key={f}
              className={`flex gap-3 text-[15px] leading-snug text-chalk ${look === 'digits' ? 'py-2 first:pt-0 last:pb-0' : ''} ${look === 'dots' ? 'border-l-2 border-white/[0.12] pl-3' : ''} ${k ? 'lg:[@media(max-height:739px)]:hidden' : ''}`}
            >
              {look === 'bars' ? <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-mute" aria-hidden /> : null}
              <span className="line-clamp-2">{f}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/** Сколько точек показываем в «Точках»: больше — уже не счёт глазами, а рябь; там — только цифры. */
const MAX_DOTS = 12

/**
 * Строка сравнения: значения команд по краям, показатель посередине. Под ними — по виду: «Полосы» — две
 * полосы от центра к краям (у кого больше — полная и светлая), «Точки» — столько точек, сколько ударов или
 * угловых (дробные значения — только цифрами), «Цифры» — без графики, строки через тонкую линию.
 */
function StatRow({ s, look, className = '' }: { s: StatPair; look: Look; className?: string }) {
  const fmt = (v: number) => `${Number.isInteger(v) ? v : v.toFixed(2)}${s.suffix ?? ''}`
  const lead = s.home === s.away ? null : s.home > s.away ? 'home' : 'away'
  const label = s.key === 'expectedGoals' ? 'xG — ожидаемые голы' : s.label
  const max = Math.max(s.home, s.away) || 1
  // у кого больше — светлая, у соперника — приглушённая; поровну — обе одинаковые
  const fill = (k: 'home' | 'away') => (lead === k ? 'bg-chalk' : lead ? 'bg-white/[0.28]' : 'bg-chalk/70')
  const big = look === 'digits' ? 'text-[22px]' : 'text-[20px]'
  const dots = look === 'dots' && Number.isInteger(s.home) && Number.isInteger(s.away) && max <= MAX_DOTS
  return (
    <li role="group" aria-label={`${label}: ${fmt(s.home)} — ${fmt(s.away)}`} className={`${look === 'digits' ? 'py-2.5 first:pt-0 last:pb-0' : ''} ${className}`}>
      <div className="grid grid-cols-[minmax(3rem,auto)_minmax(0,1fr)_minmax(3rem,auto)] items-baseline gap-3" aria-hidden>
        <span className={`num ${big} font-semibold leading-none ${lead === 'away' ? 'text-dim' : 'text-fg'}`}>{fmt(s.home)}</span>
        <span className="truncate text-center text-[13px] text-dim">{label}</span>
        <span className={`num text-right ${big} font-semibold leading-none ${lead === 'home' ? 'text-dim' : 'text-fg'}`}>{fmt(s.away)}</span>
      </div>
      {look === 'bars' ? (
        <div className="mt-2.5 grid grid-cols-2 gap-1.5" aria-hidden>
          <span className="flex h-1.5 justify-end overflow-hidden rounded-full bg-white/[0.06]">
            <span className={`h-full rounded-full ${fill('home')}`} style={{ width: `${(s.home / max) * 100}%` }} />
          </span>
          <span className="flex h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <span className={`h-full rounded-full ${fill('away')}`} style={{ width: `${(s.away / max) * 100}%` }} />
          </span>
        </div>
      ) : dots ? (
        <div className="mt-2.5 grid grid-cols-2 gap-6" aria-hidden>
          <span className="flex h-[7px] gap-[5px]">
            {Array.from({ length: s.home }, (_, i) => (
              <span key={i} className={`h-[7px] w-[7px] rounded-full ${fill('home')}`} />
            ))}
          </span>
          <span className="flex h-[7px] justify-end gap-[5px]">
            {Array.from({ length: s.away }, (_, i) => (
              <span key={i} className={`h-[7px] w-[7px] rounded-full ${fill('away')}`} />
            ))}
          </span>
        </div>
      ) : null}
    </li>
  )
}

const LIVE_KEYS = ['shotsOnGoal', 'cornerKicks']

/**
 * В игре — «Сейчас в матче»: удары в створ и угловые, подписи команд над значениями; после матча — те же
 * показатели и xG (если он настоящий, из статистики матча) и переход к подробностям. Нет данных — так и
 * пишем, нулями не заменяем. Доматчевых цифр здесь нет: при счёте на табло они путают.
 */
function PlayStats({ m, full, look }: { m: Match; full: MatchFull | null; look: Look }) {
  const live = isLive(m)
  const by = (k: string) => full?.stats.find((s) => s.key === k)
  const done = by('expectedGoals') ? [...LIVE_KEYS, 'expectedGoals'] : [...LIVE_KEYS, 'ballPossession']
  const rows = (live ? LIVE_KEYS : done).map(by).filter((s): s is StatPair => Boolean(s))
  return (
    <div className="flex min-w-0 flex-col">
      {/* минута — под счётом слева, здесь её не повторяем */}
      <p className="text-[16px] font-semibold tracking-[-0.01em] text-fg lg:text-[clamp(16px,2.2vh,19px)]">{live ? 'Сейчас в матче' : 'Статистика матча'}</p>
      {rows.length ? (
        <>
          <p className="mt-3 flex justify-between gap-4 text-[13px] font-medium text-chalk lg:[@media(max-height:739px)]:mt-2">
            <span className="truncate">{m.home.name}</span>
            <span className="truncate text-right">{m.away.name}</span>
          </p>
          <ul className={look === 'digits' ? 'mt-2.5 divide-y divide-edge' : 'mt-2.5 space-y-3 lg:[@media(max-height:799px)]:space-y-2.5'}>
            {rows.map((s, k) => (
              // третья строка — от 740px высоты окна: на невысоком окне сводка иначе не влезает
              <StatRow key={s.key} s={s} look={look} className={k >= 2 ? 'lg:[@media(max-height:739px)]:hidden' : ''} />
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-3 text-[14px] text-dim">{live ? 'Статистика по ходу игры пока не пришла' : 'Статистики матча нет'}</p>
      )}
      {live ? null : (
        <Link href={matchHref(m)} prefetch={false} className="relative z-[2] mt-4 inline-flex w-fit items-center gap-1.5 text-[14px] font-medium text-fg transition-colors hover:text-acid">
          Подробности матча
          <span aria-hidden>→</span>
        </Link>
      )}
    </div>
  )
}

/** Матч слайда для шапки и кнопки разбора: турнир и разбор — про матч, который сейчас на экране. */
function slideMeta(it: FeedItem): MainSlide {
  const m = it.match
  return { id: m.id, href: matchHref(m), live: isLive(m), caption: `${leagueShort(m.league)}${m.round ? ` · ${m.round}` : ''}`, title: `${m.home.name} — ${m.away.name}` }
}

/** Два факта до матча: сильнейший о командах (из разбора матча) и движение линии того же букмекера, что в строке кэфов. */
function factsFor(it: FeedItem, snap: OddsSnap | null): string[] {
  const mv: LineMove | null = biggestMove(lineMoves(snap))
  return pickFacts(it.summary?.facts ?? [], lineFact(mv, it.match.ts))
}

/**
 * «Афиша» — главный матч без статистики, как баннер в App Store: фон — цвета клубов (TopCarousel), внизу слева
 * эмблемы и названия крупно, справа время начала (в игре — счёт и минута, после — счёт и «итог») и лаймовая
 * «Разбор матча». Цифры и факты — в разборе и на странице матча. Вся карточка открывает сторис.
 */
/**
 * Размер названия в «Афише» на телефоне: колонка команды там узкая (около 100px), и длинное слово («Саутгемптон»,
 * «Мёнхенгладбах») не влезает — мельче шрифт, а не перенос по букве. Не мельче 13px.
 */
function phoneSize(name: string): string {
  const longest = Math.max(...name.split(/[\s-]+/).map((w) => w.length))
  return longest >= 12 ? 'text-[13px]' : longest >= 10 ? 'text-[15px]' : 'text-[17px]'
}

function PosterSlide({ it }: { it: FeedItem }) {
  const m = it.match
  const live = isLive(m)
  const finished = m.status === 'finished'
  const score = (live || finished) && m.score ? m.score : null
  const minute = m.statusCode === 4 ? 'перерыв' : m.elapsed ? `${m.elapsed}-я минута` : 'идёт'
  // после свистка проигравший чуть тусклее; до матча и при ничьей — обе одинаково
  const lead = score && score.home !== score.away ? (score.home > score.away ? 'home' : 'away') : null
  const BIG = 'num whitespace-nowrap font-semibold leading-none tracking-[-0.03em] text-fg text-[36px] sm:text-[44px] lg:text-[clamp(44px,6.4vh,68px)] lg:[@media(max-height:739px)]:text-[40px]'
  // эмблема на матовом светлом круге, как в Apple Sports: тёмные эмблемы не тонут в цвете фона
  const team = (t: Match['home'], k: 'home' | 'away') => (
    <span className={`flex min-w-0 flex-col items-center gap-3 text-center lg:gap-4 ${lead && lead !== k ? 'opacity-70' : ''}`}>
      <span className="grid h-[var(--disc)] w-[var(--disc)] shrink-0 place-items-center rounded-full bg-white/[0.16] ring-1 ring-white/25 backdrop-blur-md">
        <TeamLogo name={t.name} src={t.logo} size="calc(var(--disc) * 0.6)" />
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
        className={`grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-3 py-2 [--disc:64px] sm:gap-x-6 sm:[--disc:80px] lg:gap-x-10 lg:[--disc:clamp(76px,11vh,112px)] lg:[@media(max-height:739px)]:[--disc:60px] ${COVER}`}
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
          <span aria-hidden className="mt-5 hidden h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-[12px] bg-acid px-5 text-[15px] font-semibold text-acid-ink lg:inline-flex lg:[@media(max-height:739px)]:mt-3">
            Разбор матча
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17 17 7" />
              <path d="M8 7h9v9" />
            </svg>
          </span>
        </span>
        {team(m.away, 'away')}
      </StoryLink>
    </div>
  )
}

/**
 * Слайд главного матча. Слева — эмблемы, полные названия, время или счёт и минута LIVE, под табло — «Разбор
 * за минуту». Справа — одна открытая область без внутренних карточек: до начала — кэфы одного букмекера и два
 * факта, в игре — «Сейчас в матче», после — статистика и подробности. На телефоне — столбиком.
 */
function TopSlide({ item, look }: { item: MainItem; look: Look }) {
  const { it, snap, full } = item
  if (posterLike(look)) return <PosterSlide it={it} />
  const m = it.match
  const live = isLive(m)
  const finished = m.status === 'finished'
  const played = Boolean(m.score) && (live || finished)
  const minute = m.statusCode === 4 ? 'перерыв' : m.elapsed ? `${m.elapsed}-я минута` : 'идёт'
  const score = played ? m.score : null
  // ярче — кто ведёт или победил; до матча и при ничьей — обе команды одинаково
  const lead = score && score.home !== score.away ? (score.home > score.away ? 'home' : 'away') : null
  const tone = (k: 'home' | 'away') => (lead && lead !== k ? 'text-chalk' : 'text-fg')
  const BIG = 'num whitespace-nowrap font-semibold leading-none tracking-[-0.03em] text-[26px] sm:text-[30px] lg:text-[clamp(28px,4.2vh,46px)]'
  const row = (t: Match['home'], k: 'home' | 'away') => (
    <span className="flex min-w-0 items-center gap-3">
      <TeamLogo name={t.name} src={t.logo} size="var(--logo)" />
      <span className={`line-clamp-2 text-[20px] font-semibold leading-tight tracking-[-0.02em] sm:text-[22px] lg:text-[clamp(22px,3.2vh,32px)] ${tone(k)}`}>{t.name}</span>
    </span>
  )
  const facts = live || finished ? [] : factsFor(it, snap)
  const right = live || finished ? <PlayStats m={m} full={full} look={look} /> : <PreMatch m={m} snap={snap} facts={facts} look={look} />

  return (
    <div className="relative flex min-w-0 flex-1 flex-col justify-center gap-5 lg:grid lg:grid-cols-2 lg:items-center lg:gap-x-10">
      {/* турнир и тур — в шапке карточки (TopCarousel), напротив стрелок и чипа дня */}
      <div className="flex min-w-0 flex-col gap-4 lg:gap-[clamp(14px,2vh,20px)] lg:[@media(max-height:739px)]:gap-3">
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
        {/* на компьютере «Разбор за минуту» — сразу под табло (на телефоне — под лентой, в TopCarousel);
            вся карточка — ссылка на сторис, поэтому здесь это подпись, а не отдельная кнопка */}
        <div aria-hidden className="hidden lg:block">
          <span className={`${CHIP} w-fit shrink-0 gap-2 pl-1 pr-3.5`}>
            <StoryChipFace />
          </span>
        </div>
      </div>

      <div className="min-w-0 lg:border-l lg:border-edge lg:pl-10">{right}</div>
    </div>
  )
}

// ─── Подборки под блоком ─────────────────────────────────────────────────────

/**
 * Переход к подборке — компактный, с полезным превью и без крупных цифр: название и подпись, стрелка в углу
 * (сверху и справа поровну), ниже одна-две строки превью; широкий — с мини-графиком справа. Вся плитка — ссылка.
 */
function NavTile({
  title,
  caption,
  href,
  lines,
  aside,
  surface,
}: {
  title: string
  caption: string
  href: string
  lines: React.ReactNode[]
  aside?: React.ReactNode
  /** поверхность плитки по виду; у «Цифр» плитки — секции одной полосы, без своей рамки */
  surface: string
}) {
  return (
    <Link href={href} prefetch={false} className={`group flex h-full min-w-0 flex-col p-[18px] transition-colors ${surface}`}>
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold leading-5 text-fg">{title}</span>
          <span className="block truncate text-[13px] leading-[18px] text-dim">{caption}</span>
        </span>
        <Go />
      </span>
      <span className="mt-auto flex flex-col gap-3 pt-3 sm:flex-row sm:items-end sm:gap-6">
        <span className="min-w-0 flex-1">
          {lines.map((l, k) => (
            <span key={k} className={`block truncate text-[14px] leading-5 ${k ? 'text-dim' : 'text-chalk'}`}>
              {l}
            </span>
          ))}
        </span>
        {aside}
      </span>
    </Link>
  )
}

/**
 * Мини-график одного исхода одного букмекера: открытие линии → последнее значение, две честные точки без кривой.
 * По виду: «Полосы» — две полосы «открытие / конец периода» от нуля, «Точки» — две точки и пунктир из точек между
 * ними, подписи периода по краям; «Цифры» — без графика, плашка «−17% с открытия». Упал — янтарь, вырос — светлый.
 */
function MoveChart({ mv, kickoff, look }: { mv: LineMove; kickoff: number; look: Look }) {
  const down = mv.change < 0
  const end = periodEndLabel(mv.at, kickoff)
  const pctText = `${down ? '−' : '+'}${Math.abs(Math.round(mv.change * 100))}%`
  const box = 'block w-full shrink-0 sm:w-[min(14rem,44%)]'
  if (look === 'digits') {
    return (
      <span className="flex shrink-0 sm:justify-end" aria-hidden>
        <span className={`inline-flex h-8 items-baseline gap-1.5 rounded-[10px] px-3 pt-[5px] ${down ? 'bg-hot/[0.12] text-hot' : 'bg-white/[0.07] text-fg'}`}>
          <span className="num text-[17px] font-semibold leading-none">{pctText}</span>
          <span className="text-[13px] leading-none opacity-80">с открытия</span>
        </span>
      </span>
    )
  }
  if (look === 'bars') {
    const max = Math.max(mv.from, mv.to)
    // одна сетка на обе строки: колонка подписей — по самой длинной («4 октября, 19:30»), полосы начинаются ровно
    const row = (label: string, v: number, now: boolean) => (
      <>
        <span className="whitespace-nowrap text-[13px] leading-[18px] text-mute">{label}</span>
        <span className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <span className={`block h-full rounded-full ${now ? (down ? 'bg-hot' : 'bg-chalk') : 'bg-white/[0.26]'}`} style={{ width: `${(v / max) * 100}%` }} />
        </span>
        <span className={`num text-right text-[13px] leading-[18px] ${now ? (down ? 'font-semibold text-hot' : 'font-semibold text-fg') : 'text-dim'}`}>{v.toFixed(2)}</span>
      </>
    )
    return (
      <span className={`${box} grid grid-cols-[auto_minmax(2.5rem,1fr)_auto] items-center gap-x-3 gap-y-1.5`} aria-hidden>
        {row('открытие', mv.from, false)}
        {row(end, mv.to, true)}
      </span>
    )
  }
  // «Точки»: начало и конец — точки, между ними — пунктир из точек; круче — сильнее изменение
  const k = Math.min(1, Math.max(0.3, Math.abs(mv.change) / 0.35))
  const y1 = down ? 0 : 1
  const y2 = down ? k : 1 - k
  const color = down ? 'bg-hot' : 'bg-chalk'
  const STEPS = 13
  return (
    <span className={box} aria-hidden>
      <span className="relative mx-1 block h-[22px]">
        {Array.from({ length: STEPS - 1 }, (_, i) => {
          const t = (i + 1) / STEPS
          return <span key={i} className={`absolute h-[3px] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full ${color} opacity-60`} style={{ left: `${t * 100}%`, top: `${(y1 + (y2 - y1) * t) * 100}%` }} />
        })}
        <span className={`absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] bg-panel ${down ? 'border-hot' : 'border-chalk'}`} style={{ left: 0, top: `${y1 * 100}%` }} />
        <span className={`absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${color}`} style={{ left: '100%', top: `${y2 * 100}%` }} />
      </span>
      <span className="mt-1 flex justify-between gap-3 text-[13px] leading-[18px] text-mute">
        <span>открытие</span>
        <span className="truncate">{end}</span>
      </span>
    </span>
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

function Picks({ p, look: pageLook }: { p: DayPicks; look: Look }) {
  // «Афиша»: графики подборок — как в «Полосах», а плитки — свои, без обводки
  const look: Look = posterLike(pageLook) ? 'bars' : pageLook
  const c = p.counts
  const g = p.goals
  const allLines: React.ReactNode[] =
    c.live > 0
      ? [
          <>
            {pluralN(c.total, MATCHES)} · <span className="text-live">{c.live} LIVE</span>
          </>,
          `${pluralN(c.leagues, TOURNEYS)}${c.finished ? ` · ${c.finished} сыграно` : ''}`,
        ]
      : [
          `${pluralN(c.total, MATCHES)} · ${pluralN(c.leagues, TOURNEYS)}`,
          p.past || !c.next ? (c.finished ? 'все сыграны — итоги в списке' : 'итоги в списке') : `первый — в ${formatTime(c.next.match.ts)}`,
        ]
  const top = g.picks[0]
  const goalLines: React.ReactNode[] = top
    ? [`${pluralN(g.picks.length, MATCHES)} с шансом от ${pct(GOALS_PICK)}`, `выше всех: ${pair(top.it.match)}, ${pct(top.g.p)}`]
    : g.covered
      ? [`Матчей с шансом от ${pct(GOALS_PICK)} нет`, `линия на тотал есть у ${pluralN(g.covered, MATCHES)}`]
      : ['Линия букмекеров на тотал ещё загружается']
  const mv = p.move
  const moveLines: React.ReactNode[] = mv
    ? [
        `${pair(mv.it.match)} · ${moveOutcome(mv.mv.key, { home: mv.it.match.home.name, away: mv.it.match.away.name })}`,
        // в «Полосах» оба значения — на самом графике, здесь не повторяем
        look === 'bars' ? (
          `${mv.mv.bookmaker} · доматчевая линия`
        ) : (
          <>
            {mv.mv.bookmaker}, до матча: <span className="num">{mv.mv.from.toFixed(2)}</span> →{' '}
            <span className={`num font-semibold ${mv.mv.change < 0 ? 'text-hot' : 'text-fg'}`}>{mv.mv.to.toFixed(2)}</span>
          </>
        ),
      ]
    : p.movesCovered
      ? ['Заметных изменений линии нет', `кэфы открытия есть у ${pluralN(p.movesCovered, MATCHES)}`]
      : ['Линия букмекеров ещё загружается']
  // «Цифры» — одна полоса с тонкими разделителями, у остальных — отдельные плитки
  const strip = look === 'digits'
  const surface = strip ? HOVER.digits : `${SURFACE[pageLook]} ${HOVER[pageLook]}`
  const all = <NavTile title="Все матчи" caption="Расписание и результаты" href={`${p.dayHref}#matches`} lines={allLines} surface={surface} />
  const goals = <NavTile title="Голевые матчи" caption="Полная подборка на 3+ гола" href={`/matches/${p.ymd}/goals`} lines={goalLines} surface={surface} />
  const moves = (
    <NavTile
      title="Движение коэффициентов"
      caption="Изменения линии за день"
      href={`/matches/${p.ymd}/odds`}
      lines={moveLines}
      aside={mv ? <MoveChart mv={mv.mv} kickoff={mv.it.match.ts} look={look} /> : null}
      surface={surface}
    />
  )
  if (strip) {
    return (
      <div className={`grid overflow-hidden sm:grid-cols-2 lg:grid-cols-4 ${SURFACE.digits}`}>
        <div className="min-w-0">{all}</div>
        <div className="min-w-0 border-t border-edge sm:border-l sm:border-t-0">{goals}</div>
        <div className="min-w-0 border-t border-edge sm:col-span-2 lg:border-l lg:border-t-0">{moves}</div>
      </div>
    )
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {all}
      {goals}
      <div className="min-w-0 sm:col-span-2">{moves}</div>
    </div>
  )
}

/**
 * «Сводка дня» — первый экран: сверху «Главные матчи» (до пяти важных встреч, стрелки «1 из 5», чип дня —
 * переход на страницу другого дня), под ним «Подборки» — три перехода 1:1:2 к страницам дня: «Все матчи»,
 * «Голевые матчи» и широкий «Движение коэффициентов» с мини-графиком. Истории — короткий просмотр матчей,
 * подборки — полные списки дня со сравнением и фильтрами.
 */
export function DaySummary({
  mains,
  days,
  picks,
  look = 'bars',
  className = '',
}: {
  mains: MainItem[]
  days: DayLink[]
  picks: DayPicks
  /** вид виджетов (lib/looks.ts) — пока владелец выбирает подачу */
  look?: Look
  className?: string
}) {
  if (!mains.length) return null
  return (
    <section aria-label="Сводка дня" className={`flex flex-col ${className}`}>
      <TopCarousel
        slides={mains.map((x) => slideMeta(x.it))}
        panels={mains.map((x) => <TopSlide key={x.it.match.id} item={x} look={look} />)}
        days={days}
        backdrops={posterLike(look) ? mains.map((x) => backdropOf(x, look === 'crest')) : undefined}
        className={`lg:flex-1 ${SURFACE[look]}`}
      />
      {/* маленькая подпись над рядом — как «Топ-турниры» на странице лиг; к плиткам ближе, чем к блоку сверху */}
      <h2 className="mb-2.5 mt-4 text-[13px] font-medium text-mute lg:[@media(min-height:740px)_and_(max-height:799px)]:mb-2 lg:[@media(min-height:740px)_and_(max-height:799px)]:mt-3 lg:[@media(max-height:739px)]:mt-3">
        Подборки
      </h2>
      <Picks p={picks} look={look} />
    </section>
  )
}
