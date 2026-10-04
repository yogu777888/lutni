import Link from 'next/link'
import { featuredInfo } from '@/config/leagues'
import type { FeedItem } from '@/lib/data'
import type { ChanceCheck } from '@/lib/chance-check'
import { summaryCards, type CardKind, type DaySummary as Summary } from '@/lib/day-summary'
import { formatDayMonth, formatTime, pct, plural, pluralN, todayYmd, ymdInTz } from '@/lib/format'
import { leagueHref, matchHref } from '@/lib/links'
import { fair1x2 } from '@/lib/odds'
import { isLive } from '@/lib/rank'
import { artFor, type ArtIcon as IconName } from '@/lib/story-art'
import type { League, Match } from '@/lib/types'
import { buildVerdict, split100, type Verdict } from '@/lib/verdict'
import { ChanceChart } from './ChanceChart'
import { ArtIcon } from './story/ArtIcon'
import { StoryLink } from './story/StoryLink'
import { TeamLogo } from './TeamLogo'
import { TopCarousel } from './TopCarousel'

/** Ссылка-накладка: вся карточка кликабельна, а текст ссылки — понятное название. */
const COVER = "after:absolute after:inset-0 after:rounded-[22px] after:content-['']"
const CARD = 'rounded-[22px] border border-edge bg-panel shadow-[inset_0_1px_0_rgb(255_255_255/0.035)]'

const MATCHES = ['матч', 'матча', 'матчей'] as const
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

// ─── Плитки-подборки ─────────────────────────────────────────────────────────
//
// Каждая плитка отвечает на один вопрос несколькими матчами: в заголовке — вопрос и что значит
// цифра («Фавориты · шанс победы»), ниже — строки «команды … цифра». Строка открывает сторис
// матча, заголовок со стрелкой — все такие матчи. Текст не мельче 13px; цвет — только у цифр
// (лайм — выгодно, янтарь — падение кэфа, красный — live) и у выделенной команды.

type Row = { key: number; it?: FeedItem; href?: string; left: React.ReactNode; right: React.ReactNode; tone?: string }
type ListCard = { title: string; hint?: string; href: string; live?: boolean; rows: Row[] }

const ROW = '-mx-2 flex min-w-0 flex-1 items-center justify-between gap-3 rounded-lg px-2 text-[14px] text-chalk transition-colors hover:bg-white/[0.04]'

/** Строк в плитке: ряд плиток под «Матчем дня» одной высоты, лишняя высота экрана уходит «Матчу дня». */
const TILE_ROWS = 3

/** Строки делят высоту плитки поровну — плитка заполнена, даже если соседняя в ряду выше. */
function ListTile({ title, hint, href, live = false, rows }: ListCard) {
  return (
    <article className={`flex h-full min-w-0 flex-col px-[18px] pb-2 pt-[18px] ${CARD}`}>
      <Link href={href} prefetch={false} className="group -mx-1 flex items-center justify-between gap-2 rounded-lg px-1">
        <span className="min-w-0 truncate text-[13px] font-medium text-chalk">
          {live ? <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse-live rounded-full bg-live align-middle" /> : null}
          {title}
          {hint ? <span className="text-mute"> · {hint}</span> : null}
        </span>
        <Go />
      </Link>
      <ol className="mt-1.5 flex flex-1 flex-col">
        {rows.slice(0, TILE_ROWS).map((r) => {
          const body = (
            <>
              <span className="min-w-0 truncate">{r.left}</span>
              <span className={`num shrink-0 text-[15px] font-semibold ${r.tone ?? 'text-fg'}`}>{r.right}</span>
            </>
          )
          return (
            <li key={r.key} className="flex min-h-[36px] flex-1 border-t border-edge first:border-t-0">
              {r.it ? (
                <StoryLink id={r.it.match.id} href={matchHref(r.it.match)} className={ROW}>
                  {body}
                </StoryLink>
              ) : (
                <Link href={r.href ?? '#matches'} prefetch={false} className={ROW}>
                  {body}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </article>
  )
}

/** «Барселона — Леванте»: выделенная команда — ярче (или цветом подборки), вторая — приглушённая. */
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

/** Чья команда в ставке (её выделяем цветом) и короткая подпись, если ставка не на победу. */
function betShape(key: string): { side: 'home' | 'away' | null; label: string | null } {
  if (key === 'home' || key === 'away') return { side: key, label: null }
  if (key === 'hd' || key === 'da') return { side: key === 'hd' ? 'home' : 'away', label: 'не проиграет' }
  if (key === 'draw') return { side: null, label: 'ничья' }
  if (key === 'ha') return { side: null, label: 'без ничьей' }
  if (key === 'bttsYes') return { side: null, label: 'обе забьют' }
  if (key === 'bttsNo') return { side: null, label: 'не обе забьют' }
  const t = /^(over|under)([\d.]+)$/.exec(key)
  if (t) {
    const line = Number(t[2])
    if (t[1] === 'over') return { side: null, label: `${Math.ceil(line)}+ ${Math.ceil(line) < 5 ? 'гола' : 'голов'}` }
    const n = Math.floor(line)
    return { side: null, label: n === 0 ? 'без голов' : `до ${n} ${n === 1 ? 'гола' : 'голов'}` }
  }
  return { side: null, label: null }
}

function cardFor(kind: CardKind, s: Summary): ListCard {
  const l = s.lists
  switch (kind) {
    case 'live': {
      // идущих мало — добираем ближайшими, чтобы плитка не пустовала
      const soon = l.upcoming.slice(0, Math.max(0, 4 - l.live.length))
      return {
        title: soon.length ? 'Сейчас и скоро' : 'Сейчас идут',
        hint: soon.length ? pluralN(s.liveCount, ['идёт', 'идут', 'идут']) : pluralN(s.liveCount, MATCHES),
        href: '#matches',
        live: true,
        rows: [
          ...l.live.map((it) => {
            const m = it.match
            return {
              key: m.id,
              it,
              left: (
                <>
                  {m.home.name} <span className="num font-semibold text-fg">{m.score ? `${m.score.home}:${m.score.away}` : '–'}</span> {m.away.name}
                </>
              ),
              right: m.statusCode === 4 ? 'перерыв' : m.elapsed ? `${m.elapsed}′` : 'идёт',
              tone: 'text-live',
            }
          }),
          ...soon.map((it) => ({ key: it.match.id, it, left: <Teams m={it.match} />, right: formatTime(it.match.ts) })),
        ],
      }
    }
    case 'next': {
      const today = l.upcoming.length > 0 && ymdInTz(l.upcoming[0].match.ts) === todayYmd()
      return {
        title: today ? 'Скоро начнутся' : 'Первые матчи дня',
        href: '#matches',
        rows: l.upcoming.map((it) => ({ key: it.match.id, it, left: <Teams m={it.match} />, right: formatTime(it.match.ts) })),
      }
    }
    case 'favorite':
      return {
        title: 'Фавориты',
        hint: 'шанс победы',
        href: '/tag/favorit',
        rows: l.favorites.map((f) => ({ key: f.item.match.id, it: f.item, left: <Teams m={f.item.match} hl={f.side} />, right: pct(f.p) })),
      }
    case 'goals':
      return {
        title: 'Ждём голов',
        hint: 'шанс 3+ голов',
        href: '/tag/tb-2-5',
        rows: l.goals.map((g) => ({ key: g.item.match.id, it: g.item, left: <Teams m={g.item.match} />, right: pct(g.p) })),
      }
    case 'value':
      return {
        title: 'Выгодно',
        hint: 'кэф выше честного',
        href: '/tag/value',
        rows: l.values.map((it) => {
          const p = it.summary!.pick!
          const b = betShape(p.key)
          return {
            key: it.match.id,
            it,
            left: <Teams m={it.match} hl={b.side} tone="text-acid" />,
            right: (
              <>
                {b.label ? <span className="mr-1.5 text-[13px] font-medium text-dim">{b.label}</span> : null}
                {p.odd ? p.odd.toFixed(2) : '—'}
              </>
            ),
            tone: 'text-acid',
          }
        }),
      }
    case 'progruz':
      // только то, что видно по линии: кэф снизился. Сколько на исход ставят — мы не знаем
      return {
        title: 'Кэф упал',
        hint: 'с открытия линии',
        href: '/tag/progruz',
        rows: l.drops.map((d) => ({
          key: d.item.match.id,
          it: d.item,
          left: <Teams m={d.item.match} hl={d.side} tone="text-hot" />,
          right: `−${Math.round(d.drop * 100)}%`,
          tone: 'text-hot',
        })),
      }
    case 'count':
      return {
        title: 'Турниры дня',
        hint: pluralN(s.total, MATCHES),
        href: '#matches',
        rows: s.topLeagues.map((g) => ({ key: g.id, href: leagueHref(g.league), left: leagueShort(g.league), right: g.count })),
      }
  }
}

// ─── Матч дня ────────────────────────────────────────────────────────────────

/**
 * Шансы одной полосой прямо под табло: левая часть — под хозяевами, правая — под гостями, середина —
 * ничья; проценты (в сумме 100) внутри. Подписи с названиями не нужны — команды стоят прямо над полосой.
 * Без своих цветов, чтобы не спорить с лаймом: светлая часть — фаворит, остальные — тёмные.
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
      {/* на невысоком ноутбуке подпись прячем — карточка должна влезать в экран */}
      <p className="mt-1.5 text-center text-[13px] text-mute lg:text-left lg:[@media(max-height:779px)]:hidden" aria-hidden>
        шансы по кэфам букмекеров · в середине — ничья
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
        className={`line-clamp-2 text-[16px] font-semibold leading-tight tracking-[-0.015em] sm:text-[18px] lg:text-[clamp(17px,2.5vh,22px)] ${v?.side && v.side !== k ? 'text-chalk' : 'text-fg'}`}
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
            className={`num whitespace-nowrap text-[30px] font-semibold leading-none tracking-[-0.03em] sm:text-[34px] lg:text-[clamp(32px,4.8vh,46px)] ${live ? 'text-live' : ''}`}
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
            // факты «почему» — одной панелью; второй и третий — только где хватает высоты окна
            <ul className="rounded-[14px] bg-white/[0.035] px-3.5">
              {reasons.map((r, i) => (
                <li
                  key={i}
                  className={`flex items-center gap-3 border-t border-edge py-2 text-[14px] leading-snug text-chalk first:border-t-0 ${
                    i === 1 ? 'lg:[@media(max-height:739px)]:hidden' : i === 2 ? 'lg:[@media(max-height:859px)]:hidden' : ''
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
 * Аналитика: сбываются ли проценты, которые показывает сайт. В ряду плиток — шириной в две:
 * слева крупно пример по корзине «около 60%» (порог тега #фаворит) — «58% сбылось там, где давали 60%»
 * и среднее расхождение, справа график «давали — сбылось» (lib/chance-check.ts). Без денег и обещаний.
 */
function ChanceTile({ c }: { c: ChanceCheck }) {
  return (
    <article className={`flex h-full min-w-0 flex-col p-[18px] ${CARD}`}>
      <Link href="/about#proverka" prefetch={false} className="group -mx-1 flex items-center justify-between gap-2 rounded-lg px-1">
        <span className="min-w-0 truncate text-[13px] font-medium text-chalk">
          Проверка шансов <span className="text-mute">· {c.days >= 28 ? 'за месяц' : `за ${pluralN(c.days, ['день', 'дня', 'дней'])}`}</span>
        </span>
        <Go />
      </Link>
      <div className="mt-3 grid flex-1 gap-4 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col">
          <div className="flex items-end gap-3">
            <p className="text-[40px] font-semibold leading-none tracking-[-0.04em] lg:text-[clamp(34px,4.6vh,44px)]">{pct(c.lead.hit)}</p>
            <p className="text-[13px] leading-snug text-dim">
              сбылось там,
              <br />
              где давали {pct(c.lead.p)}
            </p>
          </div>
          <p className="mt-2.5 text-[13px] leading-snug text-chalk">
            среднее расхождение — <B>{c.gap.toFixed(1).replace('.', ',')} пункта</B>
          </p>
          <p className="text-[13px] leading-snug text-dim">
            по {new Intl.NumberFormat('ru-RU').format(c.outcomes)} {plural(c.outcomes, ['исходу', 'исходам', 'исходам'])} · кэфы без маржи
          </p>
        </div>
        <ChanceChart className="h-[150px] sm:h-auto sm:min-h-[90px]" bins={c.bins} />
      </div>
    </article>
  )
}

/**
 * «Сводка дня» — первый экран главной: сверху во всю ширину «Матч дня» (карусель по топ-лигам),
 * под ним ряд плиток одной высоты — подборки со списками матчей и «Проверка шансов» шириной в две.
 * Порядок «главное сверху, детали рядом снизу» владелец счёл спокойнее, чем высокий «Матч дня» сбоку.
 * На компьютере сводка тянется до низа окна (см. DayView): лишняя высота уходит «Матчу дня»,
 * ряд плиток — по содержимому (три строки в подборке).
 */
export function DaySummary({ s, check = null, className = '' }: { s: Summary; check?: ChanceCheck | null; className?: string }) {
  if (!s.top) return null
  // «Проверка шансов» занимает две колонки ряда: подборок тогда две
  const cards = summaryCards(s).slice(0, check ? 2 : 4)
  const cols = cards.length + (check ? 2 : 0)
  const lgCols = cols >= 4 ? 'lg:grid-cols-4' : cols === 3 ? 'lg:grid-cols-3' : cols === 2 ? 'lg:grid-cols-2' : ''
  // на планшете по две в ряд: одинокая последняя подборка — во всю ширину
  const wideLast = !check && cards.length % 2 === 1
  return (
    <section aria-label="Сводка дня" className={`flex flex-col gap-3 ${className}`}>
      <TopCarousel heads={s.tops.map((t) => ({ league: leagueShort(t.match.league), live: isLive(t.match) }))} className={`lg:flex-1 ${CARD}`}>
        {s.tops.map((t) => (
          <TopSlide key={t.match.id} it={t} />
        ))}
      </TopCarousel>
      {cols ? (
        <div className={`grid gap-3 sm:grid-cols-2 ${lgCols}`}>
          {cards.map((k, i) => (
            <div key={k} className={`min-w-0 ${(wideLast && i === cards.length - 1) || (check && cards.length === 1) ? 'sm:col-span-2 lg:col-span-1' : ''}`}>
              <ListTile {...cardFor(k, s)} />
            </div>
          ))}
          {check ? (
            <div className="min-w-0 sm:col-span-2">
              <ChanceTile c={check} />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
