import Link from 'next/link'
import { featuredInfo } from '@/config/leagues'
import type { FeedItem } from '@/lib/data'
import { navExamples, type DaySummary as Summary } from '@/lib/day-summary'
import { formatDayMonth, formatTime, pct, pluralN, todayYmd, ymdInTz } from '@/lib/format'
import { matchHref } from '@/lib/links'
import { fair1x2 } from '@/lib/odds'
import { isLive } from '@/lib/rank'
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
  const min = Math.round((ts - Date.now()) / 60_000)
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
 * в главной фразе, их не повторяем. Фактов нет — панели нет, ничего не выдумываем.
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
  return out.slice(0, 2)
}

/** Сыгранный матч глазами шансов до него: «Фаворит «Барселона» (79%) выиграл» / «Сенсация: …». */
function resultLine(m: Match): string | null {
  const f = fair1x2(m.odds?.x12)
  const s = m.scoreFT ?? m.score
  if (!f || !s) return null
  if (Math.abs(f.home - f.away) < 0.1) return 'Шансы были почти равны'
  const side = f.home >= f.away ? 'home' : 'away'
  const diff = side === 'home' ? s.home - s.away : s.away - s.home
  const fav = `${team(m, side)} (${pct(f[side])})`
  return diff > 0 ? `Фаворит ${fav} выиграл` : diff === 0 ? `Ничья: фаворит ${fav} не выиграл` : `Сенсация: фаворит ${fav} проиграл`
}

/** Вывод до матча — только с выгодной ставкой: обычный прогноз модели бывает «против» главной фразы и путает. */
const verdictOf = (it: FeedItem) => {
  const m = it.match
  if (m.status !== 'scheduled') return null
  const pick = it.summary?.pick
  return buildVerdict({ match: m, tags: it.tags, pick: pick?.kind === 'value' ? pick : null })
}

/** Матч слайда для кнопок под лентой: разбор и «Выгодно» относятся к матчу, который сейчас на экране. */
function slideMeta(it: FeedItem): MainSlide {
  const m = it.match
  const v = verdictOf(it)
  const pick = m.status === 'scheduled' ? it.summary?.pick : null
  const bet = v?.bet && pick ? { label: pick.key === v.side ? 'Выгодно' : `Выгодно: ${v.bet.text}`, odd: v.bet.odd } : null
  return { id: m.id, href: matchHref(m), live: isLive(m), bet }
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
  const headline = v?.headline ?? (finished ? resultLine(m) : null)
  const odds = Boolean(fair1x2(m.odds?.x12))
  const minute = m.statusCode === 4 ? 'перерыв' : m.elapsed ? `${m.elapsed}-я минута` : 'идёт'
  const wide = live || odds || reasons.length > 0
  const side = (t: Match['home'], k: 'home' | 'away') => (
    <span className="flex min-w-0 flex-col items-center gap-2 text-center">
      <TeamLogo name={t.name} src={t.logo} size="var(--logo)" />
      <span
        className={`line-clamp-2 text-[17px] font-semibold leading-tight tracking-[-0.015em] sm:text-[19px] lg:text-[clamp(18px,2.8vh,28px)] ${v?.side && v.side !== k ? 'text-chalk' : 'text-fg'}`}
      >
        {t.name}
      </span>
    </span>
  )

  return (
    <div className={`relative flex min-w-0 flex-1 flex-col justify-center gap-4 ${wide ? 'lg:grid lg:grid-cols-2 lg:items-center lg:gap-x-10' : ''}`}>
      <div className="flex min-w-0 flex-col items-center gap-3 lg:gap-[clamp(12px,1.8vh,20px)] lg:[@media(max-height:739px)]:gap-2">
        <p className="text-[13px] text-dim">
          {leagueShort(m.league)}
          {m.round ? ` · ${m.round}` : ''}
        </p>
        {/* табло: хозяева — время (после свистка — счёт) — гости; вся карточка открывает сторис;
            эмблемы растут с высотой окна, чтобы на большом мониторе карточка не пустела */}
        <StoryLink
          id={m.id}
          href={matchHref(m)}
          className={`grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3 [--logo:56px] lg:[--logo:clamp(56px,7vh,76px)] lg:[@media(max-height:739px)]:[--logo:44px] ${COVER}`}
        >
          {side(m.home, 'home')}
          <span className="flex flex-col items-center pt-3">
            <span
              className={`num whitespace-nowrap text-[28px] font-semibold leading-none tracking-[-0.03em] sm:text-[32px] lg:text-[clamp(30px,4.6vh,52px)] ${live ? 'text-live' : ''}`}
            >
              {played && m.score ? `${m.score.home} : ${m.score.away}` : formatTime(m.ts)}
            </span>
            <span className={`mt-2 whitespace-nowrap text-[13px] font-medium ${live ? 'text-live' : 'text-dim'}`}>
              {live ? minute : finished ? 'итог' : until(m.ts)}
            </span>
          </span>
          {side(m.away, 'away')}
        </StoryLink>
        {/* на компьютере «Разбор за минуту» и «Выгодно» — под табло (на телефоне — под лентой, в TopCarousel);
            вся карточка — ссылка на сторис, поэтому здесь это подписи, а не отдельные кнопки */}
        <div aria-hidden className="mt-1 hidden flex-wrap items-center justify-center gap-2 lg:flex lg:[@media(max-height:739px)]:mt-0">
          <span className={`${CHIP} shrink-0 gap-2 pl-1 pr-3.5`}>
            <StoryChipFace />
          </span>
          {bet ? <ValueChip label={bet.label} odd={bet.odd} /> : null}
        </div>
      </div>

      {wide ? (
        <div className="flex min-w-0 flex-col gap-4 lg:gap-3.5 lg:border-l lg:border-edge lg:pl-10">
          {live ? (
            // идёт матч: сколько сыграно — тонкой полосой; вывода до матча здесь уже нет
            <div>
              <div className="h-1.5 rounded-full bg-white/[0.08]" aria-hidden>
                <div className="h-full rounded-full bg-live" style={{ width: `${Math.min(100, ((m.elapsed ?? 45) / 90) * 100)}%` }} />
              </div>
              <p className="mt-2 text-center text-[13px] text-mute lg:text-left">сыграно {Math.min(90, m.elapsed ?? 45)} из 90 минут</p>
            </div>
          ) : odds ? (
            // вывод (или итог сыгранного) → на чём он основан: шансы по кэфам перед матчем
            <div>
              {headline ? (
                <p className="mb-2.5 text-center text-[17px] font-semibold leading-snug tracking-[-0.01em] lg:text-left lg:text-[clamp(17px,2.5vh,24px)]">{headline}</p>
              ) : null}
              <ChanceBar m={m} />
            </div>
          ) : null}
          {reasons.length ? (
            // два факта — одной панелью; на компьютере второй — от 800px высоты окна: факт бывает в две строки,
            // и на окне 720–800px сводка иначе не влезает целиком
            <ul className="rounded-[14px] bg-white/[0.035] px-3.5">
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
        className="lg:flex-1"
        cardClassName={CARD}
      />
      {/* маленькая подпись над рядом — как «Топ-турниры» на странице лиг */}
      <h2 className="mb-2.5 mt-5 text-[13px] font-medium text-mute lg:[@media(max-height:739px)]:mt-3">Цифры дня</h2>
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
