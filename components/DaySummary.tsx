import Link from 'next/link'
import { featuredInfo } from '@/config/leagues'
import type { FeedItem } from '@/lib/data'
import { summaryCards, type CardKind, type DaySummary as Summary } from '@/lib/day-summary'
import { formatDayMonth, formatTime, pct, pluralN, todayYmd, ymdInTz } from '@/lib/format'
import { leagueHref, matchHref } from '@/lib/links'
import { fair1x2 } from '@/lib/odds'
import { isLive } from '@/lib/rank'
import { artFor, type ArtIcon as IconName } from '@/lib/story-art'
import type { League, Match } from '@/lib/types'
import { buildVerdict, split100, type Verdict } from '@/lib/verdict'
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
      className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/[0.06] text-chalk transition-colors duration-300 group-hover:bg-white/[0.12] group-hover:text-fg"
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

/**
 * Строки делят высоту плитки поровну — плитка заполнена, сколько бы места ни дал экран.
 * Четвёртая строка — только на компьютере с высоким окном: на телефоне и ноутбуке пониже хватает трёх.
 */
function ListTile({ title, hint, href, live = false, rows }: ListCard) {
  return (
    <article className={`flex h-full min-w-0 flex-col px-4 pb-2 pt-3.5 sm:px-5 ${CARD}`}>
      <Link href={href} prefetch={false} className="group -mx-1 flex items-center justify-between gap-2 rounded-lg px-1">
        <span className="min-w-0 truncate text-[13px] font-medium text-chalk">
          {live ? <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse-live rounded-full bg-live align-middle" /> : null}
          {title}
          {hint ? <span className="text-mute"> · {hint}</span> : null}
        </span>
        <Go />
      </Link>
      <ol className="mt-1.5 flex flex-1 flex-col">
        {rows.map((r, i) => {
          const body = (
            <>
              <span className="min-w-0 truncate">{r.left}</span>
              <span className={`num shrink-0 text-[15px] font-semibold ${r.tone ?? 'text-fg'}`}>{r.right}</span>
            </>
          )
          return (
            <li key={r.key} className={`flex min-h-[36px] flex-1 border-t border-edge first:border-t-0 ${i >= 3 ? 'hidden lg:flex lg:[@media(max-height:759px)]:hidden' : ''}`}>
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
  const BAR = 500
  const est = (t: string) => t.length * 7 + 10
  const mid = f.home + f.draw / 2
  const drawAt = f.draw >= 0.1 && mid * BAR >= est(m.home.name) + 30 && (1 - mid) * BAR >= est(m.away.name) + 30 ? mid * 100 : null
  const tone = (k: (typeof cells)[number]['k']) => (k === fav ? 'bg-chalk text-ink' : k === 'draw' ? 'bg-[#26251f] text-dim' : 'bg-[#3a3931] text-chalk')
  const label = `Шансы по коэффициентам букмекеров: ${cells.map((c) => `${c.k === 'draw' ? c.name : `«${c.name}»`} — ${c.n}%`).join(', ')}`
  return (
    <div role="img" aria-label={label} title={label}>
      <div className="flex h-7 gap-0.5 overflow-hidden rounded-full lg:h-[clamp(28px,3.4vh,34px)]">
        {cells.map((c) => (
          <span key={c.k} className={`num grid min-w-0 place-items-center text-[13px] font-semibold ${tone(c.k)}`} style={{ width: `${c.p * 100}%` }}>
            <span className="truncate px-1">{c.n}%</span>
          </span>
        ))}
      </div>
      {/* команды — по краям полосы, не обрезаются узким сегментом; «Ничья» — под серединой,
          если ей хватает места (оценка по ширине полосы ~500 px), на телефоне — только команды */}
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
 * Слайд «Матча дня»: команды и время → вывод словами и полоса шансов → почему (до трёх фактов) → разбор.
 * Шапка с лигой и точками — у карусели (TopCarousel); лишняя высота делится поровну между блоками.
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
  const team = (t: Match['home'], goals: number | undefined, dim = false) => (
    <span className={`flex min-w-0 items-center gap-3 ${dim ? 'text-chalk' : ''}`}>
      <TeamLogo name={t.name} src={t.logo} size={28} />
      <span className="min-w-0 flex-1 truncate">{t.name}</span>
      {played ? <span className={`num shrink-0 font-semibold ${live ? 'text-live' : 'text-fg'}`}>{goals}</span> : null}
    </span>
  )
  return (
    <div className="relative flex min-w-0 flex-1 flex-col justify-between gap-4">
      <div>
        {/* команды, справа — время начала, как на табло; после стартового свистка на этом месте счёт */}
        <div className="flex items-center gap-3 text-[21px] font-semibold leading-tight tracking-[-0.025em] sm:text-[23px] lg:gap-5 lg:text-[clamp(23px,3.6vh,32px)]">
          <StoryLink id={m.id} href={matchHref(m)} className={`block min-w-0 flex-1 space-y-1.5 ${COVER}`}>
            {team(m.home, m.score?.home)}
            {team(m.away, m.score?.away, true)}
          </StoryLink>
          {played ? null : (
            <p className="shrink-0 text-right">
              <span className="num block leading-none">{formatTime(m.ts)}</span>
              {/* «через 40 мин» — только где есть место: на телефоне названия команд важнее */}
              <span className="mt-2 hidden text-[13px] font-medium leading-none tracking-normal text-dim sm:block">{until(m.ts)}</span>
            </p>
          )}
        </div>
      </div>

      {played ? (
        <div>
          <p className="mb-3 text-[17px] font-semibold leading-snug tracking-[-0.01em] lg:text-[clamp(17px,2.5vh,21px)]">
            {live ? (m.statusCode === 4 ? 'Перерыв' : m.elapsed ? `Идёт ${m.elapsed}-я минута` : 'Идёт матч') : 'Матч завершён'}
          </p>
          {live ? (
            <div className="h-1.5 rounded-full bg-white/[0.08]" aria-hidden>
              <div className="h-full rounded-full bg-live" style={{ width: `${Math.min(100, ((m.elapsed ?? 45) / 90) * 100)}%` }} />
            </div>
          ) : null}
        </div>
      ) : (
        // вывод → на чём он основан (полоса шансов по кэфам)
        <div>
          {v ? <p className="mb-2.5 text-[17px] font-semibold leading-snug tracking-[-0.01em] lg:text-[clamp(17px,2.5vh,21px)]">{v.headline}</p> : null}
          <ChanceBar m={m} />
        </div>
      )}

      {reasons.length ? (
        // третий факт — только где хватает высоты: на невысоком ноутбуке карточка не должна вылезать за экран
        <ul className="space-y-2.5">
          {reasons.map((r, i) => (
            <li key={i} className={`flex items-start gap-2.5 text-[14px] leading-snug text-chalk ${i === 2 ? 'lg:[@media(max-height:779px)]:hidden' : ''}`}>
              <span className={`mt-px grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full ${r.hot ? 'bg-hot/[0.14] text-hot' : 'bg-white/[0.06] text-chalk'}`}>
                <ArtIcon name={r.icon} className="h-[13px] w-[13px]" />
              </span>
              <span className="line-clamp-2 pt-px">{r.text}</span>
            </li>
          ))}
        </ul>
      ) : null}

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
  )
}

/**
 * «Сводка дня» — первый экран главной: слева высокий «Матч дня» (карусель по топ-лигам), справа до четырёх плиток-подборок (2×2).
 * На телефоне — всё столбиком, на планшете — подборки по две в ряд. Сводка тянется до низа окна
 * (см. DayView): строки подборок делят высоту поровну, пустых мест в плитках нет.
 */
export function DaySummary({ s, className = '' }: { s: Summary; className?: string }) {
  if (!s.top) return null
  const cards = summaryCards(s)
  const n = cards.length
  // плиток меньше четырёх — растягиваем последние, чтобы в сетке не было дыр
  const span = (i: number) => (n === 1 ? 'sm:col-span-2 lg:row-span-2' : n === 2 || (n === 3 && i === 2) ? 'sm:col-span-2' : '')
  return (
    <section aria-label="Сводка дня" className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-4 ${className}`}>
      <TopCarousel
        heads={s.tops.map((t) => ({ league: leagueShort(t.match.league), live: isLive(t.match) }))}
        className={`sm:col-span-2 lg:row-span-2 ${n === 0 ? 'lg:col-span-4' : ''} ${CARD}`}
      >
        {s.tops.map((t) => (
          <TopSlide key={t.match.id} it={t} />
        ))}
      </TopCarousel>
      {cards.map((k, i) => (
        <div key={k} className={`min-w-0 ${span(i)}`}>
          <ListTile {...cardFor(k, s)} />
        </div>
      ))}
    </section>
  )
}
