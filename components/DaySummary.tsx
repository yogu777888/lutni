import Link from 'next/link'
import { featuredInfo } from '@/config/leagues'
import type { FeedItem } from '@/lib/data'
import type { ChanceCheck } from '@/lib/chance-check'
import { dayStats, type DaySummary as Summary } from '@/lib/day-summary'
import { formatDayMonth, formatTime, pct, plural, pluralN, todayYmd, ymdInTz } from '@/lib/format'
import { matchHref } from '@/lib/links'
import { fair1x2 } from '@/lib/odds'
import { isLive } from '@/lib/rank'
import { artFor, type ArtIcon as IconName } from '@/lib/story-art'
import type { League, Match } from '@/lib/types'
import { buildVerdict, outcomeText, split100, type Verdict } from '@/lib/verdict'
import { ArtIcon } from './story/ArtIcon'
import { StoryLink } from './story/StoryLink'
import { TeamLogo } from './TeamLogo'
import { TopCarousel } from './TopCarousel'

/** Ссылка-накладка: вся карточка кликабельна, а текст ссылки — понятное название. */
const COVER = "after:absolute after:inset-0 after:rounded-[22px] after:content-['']"
const CARD = 'rounded-[22px] border border-edge bg-panel shadow-[inset_0_1px_0_rgb(255_255_255/0.035)]'

const leagueShort = (l: League) => featuredInfo(l)?.short || l.name

/** Стрелка «перейти» в правом верхнем углу: подсказывает, что по карточке можно нажать. */
function Go() {
  return (
    <span
      aria-hidden
      className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px] bg-white/[0.06] text-chalk transition-colors duration-300 group-hover:bg-white/[0.12] group-hover:text-fg"
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
  const min = Math.round((ts - Date.now()) / 60_000)
  if (min <= 0) return 'вот-вот начнётся'
  if (min < 60) return `через ${min} мин`
  return `через ${Math.round(min / 60)} ч`
}

// ─── Плитки: крупная цифра по одному матчу ───────────────────────────────────
//
// Каждая плитка отвечает на один вопрос одной цифрой: рядом — что она значит простыми словами,
// ниже — полный матч (нажатие открывает его разбор), время и турнир, внизу — спокойная полоска или
// «было → стало». Заголовок со стрелкой — вся подборка (страница тега): два разных нажатия, без
// вложенных ссылок. Цвет — только у цифры: лайм — выгодно, янтарь — кэф упал; остальное нейтральное.
// Каталога в плитках нет — все матчи дня ниже, по прокрутке. Текст не мельче 13px.

/** «Барселона — Леванте»: выделенная команда — ярче (или цветом плитки), вторая — приглушённая. */
function Teams({ m, hl = null, tone = 'text-fg' }: { m: Match; hl?: 'home' | 'away' | null; tone?: string }) {
  const cls = (side: 'home' | 'away') => (!hl ? '' : hl === side ? `font-semibold ${tone}` : 'text-dim')
  return (
    <>
      <span className={cls('home')}>{m.home.name}</span>
      <span className="text-mute"> — </span>
      <span className={cls('away')}>{m.away.name}</span>
    </>
  )
}

/** «Сколько из 100» — тонкая полоска под цифрой; черта (mark) — с чем сравнить, как на графике проверки шансов. */
function Meter({ p, mark }: { p: number; mark?: number }) {
  return (
    <span className="relative block h-1.5 rounded-full bg-white/[0.08]" aria-hidden>
      <span className="absolute inset-y-0 left-0 rounded-full bg-chalk/75" style={{ width: `${Math.round(p * 100)}%` }} />
      {mark !== undefined ? (
        <span className="absolute -top-1 h-3.5 w-0.5 -translate-x-1/2 rounded-full bg-fg" style={{ left: `${Math.round(mark * 100)}%` }} />
      ) : null}
    </span>
  )
}

/** Было → стало: старое число приглушённое, новое — цветом плитки. */
function Change({ from, to, tone, before = 'было', after = 'стало' }: { from: number; to: number; tone: string; before?: string; after?: string }) {
  return (
    <span className="block text-[13px] leading-none text-dim">
      {before} <span className="num font-semibold text-chalk">{from.toFixed(2)}</span> → {after} <span className={`num font-semibold ${tone}`}>{to.toFixed(2)}</span>
    </span>
  )
}

type Stat = {
  key: string
  title: string
  hint: string
  href: string
  value: string
  tone?: string
  label: React.ReactNode
  it: FeedItem
  hl?: 'home' | 'away' | null
  hlTone?: string
  foot: React.ReactNode
}

function TileHead({ title, hint, href }: { title: string; hint: string; href: string }) {
  return (
    // на телефоне область нажатия — 44px по высоте (отрицательные поля — без сдвига вёрстки)
    <Link href={href} prefetch={false} className="group -mx-1 -my-2 flex items-center justify-between gap-2 rounded-lg px-1 py-2 lg:my-0 lg:py-0">
      <span className="min-w-0 truncate text-[13px] font-medium text-chalk">
        {title} <span className="text-mute">· {hint}</span>
      </span>
      <Go />
    </Link>
  )
}

/** Цифра и подпись к ней — одинаковые во всех плитках. */
function Figure({ value, tone = 'text-fg', label }: { value: string; tone?: string; label: React.ReactNode }) {
  return (
    <span className="flex items-end gap-3">
      <span className={`num shrink-0 text-[40px] font-semibold leading-none tracking-[-0.04em] lg:text-[clamp(32px,4.6vh,44px)] ${tone}`}>{value}</span>
      <span className="line-clamp-2 min-w-0 pb-0.5 text-[13px] leading-snug text-dim">{label}</span>
    </span>
  )
}

function StatTile({ title, hint, href, value, tone, label, it, hl = null, hlTone, foot }: Stat) {
  const m = it.match
  return (
    <article className={`flex h-full min-w-0 flex-col p-[18px] ${CARD}`}>
      <TileHead title={title} hint={hint} href={href} />
      <StoryLink id={m.id} href={matchHref(m)} className="group/m -mx-1 mt-3 flex min-w-0 flex-1 flex-col rounded-lg px-1 lg:[@media(max-height:779px)]:mt-2">
        <Figure value={value} tone={tone} label={label} />
        <span className="mt-3 line-clamp-2 text-[14px] leading-snug text-chalk transition-colors group-hover/m:text-fg lg:[@media(max-height:779px)]:mt-2">
          <Teams m={m} hl={hl} tone={hlTone} />
        </span>
        <span className="block truncate text-[13px] text-dim">
          {formatTime(m.ts)} · {leagueShort(m.league)}
        </span>
        <span className="mt-auto block pt-3 lg:[@media(max-height:779px)]:pt-2">{foot}</span>
      </StoryLink>
    </article>
  )
}

const teamOf = (m: Match, side: 'home' | 'away') => `«${side === 'home' ? m.home.name : m.away.name}»`

/**
 * Плитки сводки по выбранным матчам (lib/day-summary.ts, dayStats): фаворит, голы, падение кэфа;
 * «Выгодно» — на свободное место (в другие дни — четвёртой, сегодня четвёртая — проверка шансов).
 */
function statsFor(s: Summary, slots: number): Stat[] {
  const st = dayStats(s)
  const out: Stat[] = []
  if (st.favorite) {
    const f = st.favorite
    out.push({
      key: 'favorite',
      title: 'Фаворит дня',
      hint: 'по кэфам',
      href: '/tag/favorit',
      value: pct(f.p),
      label: <>на победу {teamOf(f.item.match, f.side)}</>,
      it: f.item,
      hl: f.side,
      foot: <Meter p={f.p} />,
    })
  }
  if (st.goals) {
    const g = st.goals
    out.push({
      key: 'goals',
      title: 'Ждём голов',
      hint: 'по кэфам',
      href: '/tag/tb-2-5',
      value: pct(g.p),
      label: 'шанс 3+ голов',
      it: g.item,
      foot: <Meter p={g.p} />,
    })
  }
  if (st.drop) {
    // только то, что видно по линии: кэф снизился. Сколько на исход ставят — мы не знаем
    const d = st.drop
    out.push({
      key: 'drop',
      title: 'Кэф упал',
      hint: 'с открытия линии',
      href: '/tag/progruz',
      value: `−${Math.round(d.drop * 100)}%`,
      tone: 'text-hot',
      label: <>кэф на победу {teamOf(d.item.match, d.side)}</>,
      it: d.item,
      hl: d.side,
      hlTone: 'text-hot',
      foot: <Change from={d.from} to={d.to} tone="text-hot" />,
    })
  }
  const p = st.value?.summary?.pick
  if (out.length < slots && st.value && p?.odd) {
    const m = st.value.match
    const side = p.key === 'home' || p.key === 'away' ? p.key : null
    out.push({
      key: 'value',
      title: 'Выгодно',
      hint: 'кэф выше честного',
      href: '/tag/value',
      value: p.odd.toFixed(2),
      tone: 'text-acid',
      label: side ? <>кэф на победу {teamOf(m, side)}</> : <>кэф: {outcomeText(p.key, m)}</>,
      it: st.value,
      hl: side,
      hlTone: 'text-acid',
      foot: <Change from={1 / p.prob} to={p.odd} tone="text-acid" before="честный" after="платят" />,
    })
  }
  return out.slice(0, slots)
}

// ─── Матч дня ────────────────────────────────────────────────────────────────

/**
 * Шансы трёх исходов одной полосой: слева хозяева, в середине ничья, справа гости; проценты (в сумме 100)
 * внутри, под полосой — подписи исходов прямо по местам (на компьютере полоса не под табло, а в правой
 * колонке, поэтому названия нужны). Без своих цветов, чтобы не спорить с лаймом: светлая часть — фаворит.
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
  const tone = (k: (typeof cells)[number]['k']) => (k === fav ? 'bg-chalk text-ink' : k === 'draw' ? 'bg-[#26251f] text-dim' : 'bg-[#3a3931] text-chalk')
  const label = `Шансы по коэффициентам букмекеров: ${cells.map((c) => `${c.k === 'draw' ? c.name : `«${c.name}»`} — ${c.n}%`).join(', ')}`
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
        <span className={`truncate ${fav === 'home' ? 'text-chalk' : ''}`}>{m.home.name}</span>
        <span>ничья</span>
        <span className={`truncate text-right ${fav === 'away' ? 'text-chalk' : ''}`}>{m.away.name}</span>
      </p>
    </div>
  )
}

type Reason = { text: string; icon: IconName; hot: boolean }

/**
 * Почему стоит смотреть — до трёх фактов: падение кэфа, серии, дом, потери, личные встречи, голы.
 * «Выгодно» — на кнопке, «фаворит» и «50 на 50» — в главной фразе, их не повторяем.
 * Значки — те же, что у кружков историй с этими тегами. Во время матча вывода нет (v = null) —
 * остаются факты из тегов.
 */
function reasonsFor(it: FeedItem, v: Verdict | null): Reason[] {
  const out: Reason[] = []
  if (v?.drop) out.push({ text: v.drop, icon: 'down', hot: true })
  // до матча «фаворит» и «50 на 50» — в главной фразе; во время игры главной фразы нет, и эти факты — к месту
  const skip = new Set(v ? ['value', 'favorit', 'ravnye', 'progruz'] : ['value', 'progruz'])
  for (const t of [...it.tags].sort((a, b) => b.score - a.score)) {
    if (!skip.has(t.slug)) out.push({ text: t.reason, icon: artFor(t.slug).icon, hot: false })
  }
  if (v?.goals && !it.tags.some((t) => t.slug === 'tb-2-5' || t.slug === 'tm-2-5')) out.push({ text: v.goals, icon: 'ball', hot: false })
  return out.slice(0, 3)
}

/**
 * Слайд «Матча дня» — как карточка матча в спортивных приложениях: табло (хозяева · время или счёт · гости),
 * вывод словами и полоса шансов, факты «почему» одной панелью и кнопки. На телефоне — столбиком;
 * на компьютере карточка во всю ширину и в две колонки: слева табло и кнопки, справа вывод, шансы
 * и факты — без пустой середины. Шапка с выбором лиги — у карусели (TopCarousel).
 */
function TopSlide({ it }: { it: FeedItem }) {
  const m = it.match
  const live = isLive(m)
  const played = Boolean(m.score) && (live || m.status === 'finished')
  const pick = m.status === 'scheduled' ? it.summary?.pick : null
  // только выгодная ставка: обычный прогноз модели бывает «против» главной фразы и путает
  const v = m.status === 'scheduled' ? buildVerdict({ match: m, tags: it.tags, pick: pick?.kind === 'value' ? pick : null }) : null
  const bet = v?.bet
  const betLabel = bet && pick ? (pick.key === v.side ? 'Выгодно' : `Выгодно: ${bet.text}`) : null
  // факты о командах (серии, дом, потери, личные встречи) полезны и во время игры; после матча — уже нет
  const reasons = m.status === 'finished' ? [] : reasonsFor(it, v)
  const minute = m.statusCode === 4 ? 'перерыв' : m.elapsed ? `${m.elapsed}-я минута` : 'идёт'
  const side = (t: Match['home'], k: 'home' | 'away') => (
    <span className="flex min-w-0 flex-col items-center gap-2 text-center">
      <TeamLogo name={t.name} src={t.logo} size={48} />
      <span
        className={`line-clamp-2 text-[17px] font-semibold leading-tight tracking-[-0.015em] sm:text-[19px] lg:text-[clamp(18px,2.8vh,24px)] ${v?.side && v.side !== k ? 'text-chalk' : 'text-fg'}`}
      >
        {t.name}
      </span>
    </span>
  )

  const state = played ? (
    live ? (
      // идёт матч: сколько сыграно — тонкой полосой; вывода до матча здесь уже нет
      <div>
        <div className="h-1.5 rounded-full bg-white/[0.08]" aria-hidden>
          <div className="h-full rounded-full bg-live" style={{ width: `${Math.min(100, ((m.elapsed ?? 45) / 90) * 100)}%` }} />
        </div>
        <p className="mt-2 text-center text-[13px] text-mute lg:text-left">сыграно {Math.min(90, m.elapsed ?? 45)} из 90 минут</p>
      </div>
    ) : null
  ) : (
    // вывод → на чём он основан (полоса шансов по кэфам)
    <div>
      {v ? (
        <p className="mb-2.5 text-center text-[17px] font-semibold leading-snug tracking-[-0.01em] lg:text-left lg:text-[clamp(17px,2.5vh,22px)]">{v.headline}</p>
      ) : null}
      <ChanceBar m={m} />
    </div>
  )
  const wide = Boolean(state) || reasons.length > 0

  return (
    <div
      className={`relative flex min-w-0 flex-1 flex-col justify-between gap-4 ${wide ? 'lg:grid lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)_auto] lg:gap-x-10 lg:gap-y-3' : ''}`}
    >
      {/* табло: хозяева — время (после свистка — счёт) — гости; вся карточка открывает сторис */}
      <StoryLink id={m.id} href={matchHref(m)} className={`grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3 lg:self-center ${COVER}`}>
        {side(m.home, 'home')}
        <span className="flex flex-col items-center pt-2">
          <span
            className={`num whitespace-nowrap text-[26px] font-semibold leading-none tracking-[-0.03em] sm:text-[30px] lg:text-[clamp(28px,4vh,38px)] ${live ? 'text-live' : ''}`}
          >
            {played && m.score ? `${m.score.home} : ${m.score.away}` : formatTime(m.ts)}
          </span>
          <span className={`mt-2 whitespace-nowrap text-[13px] font-medium ${live ? 'text-live' : 'text-dim'}`}>
            {live ? minute : m.status === 'finished' ? 'итог' : until(m.ts)}
          </span>
        </span>
        {side(m.away, 'away')}
      </StoryLink>

      {wide ? (
        // справа на компьютере: вывод, шансы и факты; разделитель — тонкая линия
        <div className="flex min-w-0 flex-col justify-between gap-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:justify-center lg:gap-3.5 lg:border-l lg:border-edge lg:pl-10">
          {state}
          {reasons.length ? (
            // факты «почему» — одной панелью; сколько — по высоте окна: от 740px один, от 800px два, от 900px три
            <ul className="rounded-[14px] bg-white/[0.035] px-3.5">
              {reasons.map((r, i) => (
                <li
                  key={i}
                  className={`flex items-center gap-3 border-t border-edge py-2 text-[14px] leading-snug text-chalk first:border-t-0 ${
                    i === 0 ? 'lg:[@media(max-height:739px)]:hidden' : i === 1 ? 'lg:[@media(max-height:799px)]:hidden' : 'lg:[@media(max-height:899px)]:hidden'
                  }`}
                >
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-[7px] ${r.hot ? 'bg-hot/[0.14] text-hot' : 'bg-white/[0.06] text-chalk'}`}>
                    <ArtIcon name={r.icon} className="h-[13px] w-[13px]" />
                  </span>
                  <span className="line-clamp-2">{r.text}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-[13px] lg:col-start-1 lg:row-start-2 lg:justify-center lg:gap-x-2.5">
        <span aria-hidden className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] bg-white/[0.06] py-1.5 pl-1.5 pr-3.5 font-medium text-fg">
          <span className="grid h-6 w-6 place-items-center rounded-[7px] bg-acid text-acid-ink">
            <svg viewBox="0 0 12 12" className="ml-px h-2.5 w-2.5" fill="currentColor">
              <path d="M3 1.5v9l7.5-4.5z" />
            </svg>
          </span>
          Разбор за минуту
        </span>
        {bet && betLabel ? (
          <span className="inline-flex min-w-0 items-center gap-1.5 rounded-[10px] bg-acid/[0.12] px-3.5 py-1.5 font-semibold text-acid">
            <span className="truncate">{betLabel}</span>
            {bet.odd ? <span className="num shrink-0">· {bet.odd.toFixed(2)}</span> : null}
          </span>
        ) : null}
      </div>
    </div>
  )
}

// ─── Проверка шансов ─────────────────────────────────────────────────────────

const B = ({ children }: { children: React.ReactNode }) => <b className="font-semibold text-fg">{children}</b>

/**
 * Проверка шансов — той же формы, что и остальные плитки: крупно «58% — сбылось там, где давали 60%»
 * (корзина «около 60%», порог тега #фаворит), ниже — среднее расхождение по всем шансам и число исходов,
 * внизу — полоска «сбылось» с белой чертой «давали», как на графике в «Как мы считаем» (lib/chance-check.ts).
 */
function ChanceTile({ c }: { c: ChanceCheck }) {
  return (
    <article className={`flex h-full min-w-0 flex-col p-[18px] ${CARD}`}>
      <TileHead title="Проверка шансов" hint={c.days >= 28 ? 'за месяц' : `за ${pluralN(c.days, ['день', 'дня', 'дней'])}`} href="/about#proverka" />
      <div className="mt-3 flex min-w-0 flex-1 flex-col lg:[@media(max-height:779px)]:mt-2">
        <Figure value={pct(c.lead.hit)} label={<>сбылось там, где давали {pct(c.lead.p)}</>} />
        <span className="mt-3 text-[14px] leading-snug text-chalk lg:[@media(max-height:779px)]:mt-2">
          в среднем ±{c.gap.toFixed(1).replace('.', ',')} пункта
        </span>
        <span className="block truncate text-[13px] text-dim">
          {new Intl.NumberFormat('ru-RU').format(c.outcomes)} {plural(c.outcomes, ['исход', 'исхода', 'исходов'])} за {c.days >= 28 ? 'месяц' : pluralN(c.days, ['день', 'дня', 'дней'])}
        </span>
        <span className="mt-auto block pt-3 lg:[@media(max-height:779px)]:pt-2">
          <Meter p={c.lead.hit} mark={c.lead.p} />
        </span>
      </div>
    </article>
  )
}

/**
 * «Сводка дня» — первый экран главной: сверху во всю ширину «Матч дня» (карусель по топ-лигам),
 * под ним ряд плиток одной высоты — по крупной цифре на вопрос: фаворит, голы, падение кэфа и проверка
 * шансов (в другие дни — «Выгодно»). Порядок «главное сверху, детали рядом снизу» владелец счёл
 * спокойнее, чем высокий «Матч дня» сбоку, а цифры — понятнее списков: списки — ниже, в матчах дня.
 * На компьютере сводка тянется до низа окна (см. DayView): лишняя высота уходит «Матчу дня».
 */
export function DaySummary({ s, check = null, className = '' }: { s: Summary; check?: ChanceCheck | null; className?: string }) {
  if (!s.top) return null
  const stats = statsFor(s, check ? 3 : 4)
  const n = stats.length + (check ? 1 : 0)
  const lgCols = n >= 4 ? 'lg:grid-cols-4' : n === 3 ? 'lg:grid-cols-3' : n === 2 ? 'lg:grid-cols-2' : ''
  return (
    <section aria-label="Сводка дня" className={`flex flex-col gap-3 ${className}`}>
      <TopCarousel heads={s.tops.map((t) => ({ league: leagueShort(t.match.league), live: isLive(t.match) }))} className={`lg:flex-1 ${CARD}`}>
        {s.tops.map((t) => (
          <TopSlide key={t.match.id} it={t} />
        ))}
      </TopCarousel>
      {n ? (
        <div className={`grid gap-3 sm:grid-cols-2 ${lgCols}`}>
          {stats.map((t) => (
            <div key={t.key} className="min-w-0">
              <StatTile {...t} />
            </div>
          ))}
          {check ? (
            <div className="min-w-0">
              <ChanceTile c={check} />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
