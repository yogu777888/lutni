import Link from 'next/link'
import type { FeedItem } from '@/lib/data'
import { summaryCards, type CardKind, type DaySummary as Summary } from '@/lib/day-summary'
import { formatTime, plural, pluralN } from '@/lib/format'
import { matchHref } from '@/lib/links'
import { fair1x2 } from '@/lib/odds'
import { bestTag, isLive } from '@/lib/rank'
import { TAG_BY_SLUG } from '@/lib/tags'
import type { Match } from '@/lib/types'
import { Hashtags } from './MatchRow'
import { StoryLink } from './story/StoryLink'

const edge = (ev: number) => `${ev >= 0 ? '+' : '−'}${Math.abs(ev * 100).toFixed(1).replace('.', ',')}%`
const SIDE = { home: 'П1', draw: 'Х', away: 'П2' } as const
const WHY_TONE = { accent: 'text-acid', hot: 'text-hot', neutral: 'text-chalk' } as const
const names = (m: Match) => `${m.home.name} — ${m.away.name}`
/** Ссылка-накладка: вся карточка кликабельна, а текст ссылки — понятное название. */
const COVER = "after:absolute after:inset-0 after:rounded-[18px] after:content-['']"

type Tone = 'plain' | 'lime' | 'amber' | 'live'

const TONE: Record<Tone, string> = {
  plain: 'border-edge bg-panel hover:border-edge-2',
  live: 'border-edge bg-panel hover:border-edge-2',
  lime: 'border-acid bg-acid text-acid-ink',
  amber: 'border-hot/25 bg-[color-mix(in_oklab,var(--color-hot)_7%,var(--color-panel))] hover:border-hot/50',
}

/** Рамка виджета: подпись сверху, стрелка-кружок, цифра и подробности — внизу. */
function Tile({ tone = 'plain', label, children }: { tone?: Tone; label: React.ReactNode; children: React.ReactNode }) {
  const lime = tone === 'lime'
  return (
    <article
      className={`group relative flex h-full min-h-[168px] min-w-0 flex-col rounded-[18px] border p-4 transition-[transform,border-color] duration-300 hover:-translate-y-0.5 sm:min-h-[184px] sm:p-5 ${TONE[tone]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${lime ? 'text-acid-ink/70' : 'text-dim'}`}>
          {label}
        </span>
        <span
          aria-hidden
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] transition-transform duration-300 group-hover:rotate-45 ${
            lime ? 'bg-acid-ink/10' : 'bg-white/[0.06] text-dim group-hover:text-fg'
          }`}
        >
          ↗
        </span>
      </div>
      <div className="mt-auto min-w-0 pt-4">{children}</div>
    </article>
  )
}

function Big({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`num text-[38px] font-extrabold leading-none tracking-[-0.05em] sm:text-[46px] ${className}`}>{children}</div>
}

function MatchLink({ it, className = '' }: { it: FeedItem; className?: string }) {
  return (
    <StoryLink id={it.match.id} href={matchHref(it.match)} className={`mt-2.5 block truncate text-[13.5px] font-semibold ${COVER} ${className}`}>
      {names(it.match)}
    </StoryLink>
  )
}

function Card({ kind, s }: { kind: CardKind; s: Summary }) {
  switch (kind) {
    case 'value': {
      const it = s.value!
      const p = it.summary!.pick!
      return (
        <Tile tone="lime" label="Value дня">
          <Big>{edge(p.ev ?? 0)}</Big>
          <MatchLink it={it} />
          <p className="mt-0.5 truncate text-[12px] font-medium text-acid-ink/70">
            {p.label}
            {p.odd ? (
              <>
                {' '}
                <span className="num">{p.odd.toFixed(2)}</span> · честно <span className="num">{(1 / p.prob).toFixed(2)}</span>
              </>
            ) : null}
          </p>
        </Tile>
      )
    }
    case 'progruz': {
      const g = s.progruz!
      return (
        <Tile tone="amber" label="Прогруз дня">
          <Big className="text-hot">−{Math.round(g.drop * 100)}%</Big>
          <MatchLink it={g.item} />
          <p className="num mt-0.5 truncate text-[12px] text-dim">
            {SIDE[g.side]} {g.from.toFixed(2)} <span className="text-hot">→ {g.to.toFixed(2)}</span>
          </p>
        </Tile>
      )
    }
    case 'live':
      return (
        <Tile
          tone="live"
          label={
            <>
              <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-live" />
              <span className="text-live">Live</span>
            </>
          }
        >
          <Big>{s.liveCount}</Big>
          <a href="#live" className={`mt-1 block text-[12.5px] text-dim ${COVER}`}>
            {plural(s.liveCount, ['матч идёт', 'матча идут', 'матчей идут'])} сейчас
          </a>
          <ul className="mt-2 space-y-0.5">
            {s.live.slice(0, 2).map(({ match: m }) => (
              <li key={m.id} className="flex min-w-0 items-center gap-2 text-[12px]">
                <span className="num w-7 shrink-0 font-semibold text-live">{m.statusCode === 4 ? 'Пер' : m.elapsed ? `${m.elapsed}′` : ''}</span>
                <span className="min-w-0 truncate text-chalk">
                  {m.home.name} <span className="num font-bold text-fg">{m.score ? `${m.score.home}:${m.score.away}` : '–'}</span> {m.away.name}
                </span>
              </li>
            ))}
          </ul>
        </Tile>
      )
    case 'next': {
      const it = s.next!
      return (
        <Tile label="Первый матч">
          <Big>{formatTime(it.match.ts)}</Big>
          <MatchLink it={it} />
          <p className="mt-0.5 truncate text-[12px] text-dim">{it.match.league.name}</p>
        </Tile>
      )
    }
    case 'goals': {
      const g = s.goals!
      return (
        <Tile label="Голы">
          <Big>{g.count}</Big>
          <Link href="/tag/tb-2-5" prefetch={false} className={`mt-1 block text-[12.5px] text-dim ${COVER}`}>
            {plural(g.count, ['матч', 'матча', 'матчей'])} с <span className="text-mute">#</span>ТБ2.5
          </Link>
          <StoryLink
            id={g.item.match.id}
            href={matchHref(g.item.match)}
            className="relative z-10 mt-2 flex min-w-0 items-baseline gap-1.5 text-[12px] text-chalk transition-colors hover:text-fg"
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
        <Tile label="Фаворит дня">
          <Big>
            {Math.round(f.p * 100)}
            <span className="ml-0.5 text-[0.5em] tracking-normal">%</span>
          </Big>
          <MatchLink it={f.item} />
          <p className="mt-0.5 truncate text-[12px] text-dim">
            {SIDE[f.side]} · победа: {f.side === 'home' ? f.item.match.home.name : f.item.match.away.name}
          </p>
        </Tile>
      )
    }
    case 'count':
      return (
        <Tile label="Сегодня">
          <Big>{s.total}</Big>
          <a href="#matches" className={`mt-1 block text-[12.5px] text-dim ${COVER}`}>
            {plural(s.total, ['матч', 'матча', 'матчей'])} в {pluralN(s.leagues, ['турнире', 'турнирах', 'турнирах'])}
          </a>
        </Tile>
      )
  }
}

/** Главный виджет: матч дня — команды крупно, шансы и кэфы как на табло. */
function TopCard({ it }: { it: FeedItem }) {
  const m = it.match
  const live = isLive(m)
  const played = Boolean(m.score) && (live || m.status === 'finished')
  const f = fair1x2(m.odds?.x12)
  const pick = m.status === 'scheduled' ? it.summary?.pick : null
  const hotKey = pick?.kind === 'value' ? pick.key : null
  const cells = f
    ? (['home', 'draw', 'away'] as const).map((k) => ({ k, p: f[k], odd: m.odds?.x12?.[k]?.value ?? null }))
    : null
  const top = cells ? Math.max(...cells.map((c) => c.p)) : 0
  // почему это матч дня — самый весомый тег и его объяснение
  const best = bestTag(it.tags)
  const def = best ? TAG_BY_SLUG.get(best.slug) : undefined
  const why = best && def ? { def, reason: best.reason } : null
  const row = (t: Match['home'], goals: number | undefined) => (
    <span className="flex min-w-0 items-baseline justify-between gap-4">
      <span className="min-w-0 hyphens-auto break-words">{t.name}</span>
      {played ? <span className={`num shrink-0 ${live ? 'text-live' : ''}`}>{goals}</span> : null}
    </span>
  )
  return (
    <article className="card group relative col-span-2 flex min-w-0 flex-col overflow-hidden p-5 transition-[border-color] duration-300 hover:border-edge-2 sm:p-6 lg:row-span-2">
      <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-acid/[0.07] blur-3xl" aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-dim">Матч дня</span>
          <span className="inline-flex min-w-0 items-center gap-2 rounded-full border border-edge bg-panel-2 px-2.5 py-0.5 text-[12px] text-chalk">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${live ? 'animate-pulse-live bg-live' : 'bg-acid'}`} />
            <span className="truncate">{m.league.name}</span>
            <span className={`num shrink-0 font-semibold ${live ? 'text-live' : 'text-fg'}`}>
              {live ? (m.elapsed ? `${m.elapsed}′` : 'LIVE') : m.status === 'finished' ? 'итог' : formatTime(m.ts)}
            </span>
          </span>
        </div>
        <span
          aria-hidden
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.06] text-[14px] text-dim transition-transform duration-300 group-hover:rotate-45 group-hover:text-fg"
        >
          ↗
        </span>
      </div>

      <StoryLink
        id={m.id}
        href={matchHref(m)}
        className={`mt-6 block text-[28px] font-extrabold uppercase leading-[1.04] tracking-[-0.035em] sm:text-[38px] ${COVER}`}
      >
        {row(m.home, m.score?.home)}
        <span className="block text-chalk">{row(m.away, m.score?.away)}</span>
      </StoryLink>
      {why ? (
        <p className="mt-3 line-clamp-2 max-w-[48ch] text-[14px] leading-snug text-dim">
          <span className={WHY_TONE[why.def.kind]}>{why.def.label}</span> · {why.reason}
        </p>
      ) : null}

      {cells ? (
        <div className="mt-auto pt-7">
          <div className="grid grid-cols-3 gap-3">
            {cells.map((c) => {
              const hot = c.k === hotKey
              return (
                <div key={c.k} className="min-w-0">
                  <div className={`num text-[34px] font-extrabold leading-none tracking-[-0.05em] sm:text-[44px] ${c.p === top ? 'text-fg' : 'text-dim'}`}>
                    {Math.round(c.p * 100)}
                    <span className="ml-0.5 text-[0.45em] tracking-normal">%</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-[12px] text-dim">
                    {SIDE[c.k]}
                    {c.odd ? (
                      <span className={`num rounded-md px-1.5 py-0.5 font-semibold ${hot ? 'bg-acid text-acid-ink' : 'bg-panel-3 text-fg/90'}`}>{c.odd.toFixed(2)}</span>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 flex h-1.5 gap-0.5 overflow-hidden rounded-full" aria-hidden>
            {cells.map((c) => (
              <span key={c.k} className={c.k === 'home' ? 'bg-home' : c.k === 'away' ? 'bg-away' : 'bg-tie'} style={{ width: `${c.p * 100}%` }} />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-auto" />
      )}

      {it.tags.length || pick ? (
        <div className="relative z-10 mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px]">
          <Hashtags tags={it.tags.filter((t) => t.slug !== best?.slug)} max={2} />
          {pick ? (
            <span className={pick.kind === 'value' ? 'text-acid' : 'text-dim'}>
              Прогноз {pick.label}
              {pick.odd ? <span className="num ml-1 font-semibold">{pick.odd.toFixed(2)}</span> : null}
            </span>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

/**
 * «Сводка дня» — первый экран главной из виджетов (бенто): большой «Матч дня»
 * и четыре маленьких — value (лайм), прогруз (янтарь), live, голы и т. д.
 * Каждый виджет открывает сторис матча или страницу тега.
 */
export function DaySummary({ s, className = '' }: { s: Summary; className?: string }) {
  if (!s.top) return null
  const cards = summaryCards(s)
  return (
    <section aria-label="Сводка дня" className={`grid grid-cols-2 gap-3 lg:grid-cols-4 ${className}`}>
      <TopCard it={s.top} />
      {cards.map((k, i) => (
        <div key={k} className="fade-up min-w-0" style={{ animationDelay: `${120 + i * 70}ms` }}>
          <Card kind={k} s={s} />
        </div>
      ))}
    </section>
  )
}
