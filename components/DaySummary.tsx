import Link from 'next/link'
import type { FeedItem } from '@/lib/data'
import { summaryCards, type CardKind, type DaySummary as Summary } from '@/lib/day-summary'
import { formatTime, plural, pluralN } from '@/lib/format'
import { matchHref } from '@/lib/links'
import { fair1x2 } from '@/lib/odds'
import { bestTag, isLive } from '@/lib/rank'
import { TAG_BY_SLUG } from '@/lib/tags'
import type { Match } from '@/lib/types'
import { StoryLink } from './story/StoryLink'

const edge = (ev: number) => `${ev >= 0 ? '+' : '−'}${Math.abs(ev * 100).toFixed(1).replace('.', ',')}%`
const SIDE = { home: 'П1', draw: 'Х', away: 'П2' } as const
const WHY_TONE = { accent: 'text-acid', hot: 'text-hot', neutral: 'text-chalk' } as const
const names = (m: Match) => `${m.home.name} — ${m.away.name}`
/** Ссылка-накладка: вся карточка кликабельна, а текст ссылки — понятное название. */
const COVER = "after:absolute after:inset-0 after:rounded-[20px] after:content-['']"

type Tone = 'plain' | 'lime' | 'amber'

const TONE: Record<Tone, string> = {
  plain: 'border-edge bg-panel hover:border-edge-2',
  lime: 'border-acid bg-acid text-acid-ink hover:brightness-[1.04]',
  amber: 'border-hot/20 bg-[color-mix(in_oklab,var(--color-hot)_6%,var(--color-panel))] hover:border-hot/40',
}

/** Рамка виджета: короткая подпись сверху, цифра и подробности — внизу. */
function Tile({ tone = 'plain', label, children }: { tone?: Tone; label: React.ReactNode; children: React.ReactNode }) {
  return (
    <article
      className={`relative flex h-full min-h-[148px] min-w-0 flex-col rounded-[20px] border p-4 transition-[border-color,filter] duration-300 sm:min-h-[156px] sm:p-5 ${TONE[tone]}`}
    >
      <span className={`flex items-center gap-1.5 text-[13px] font-medium ${tone === 'lime' ? 'text-acid-ink/65' : 'text-dim'}`}>{label}</span>
      <div className="mt-auto min-w-0 pt-3">{children}</div>
    </article>
  )
}

function Big({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`num text-[32px] font-extrabold leading-none tracking-[-0.045em] sm:text-[36px] ${className}`}>{children}</div>
}

function MatchLink({ it }: { it: FeedItem }) {
  return (
    <StoryLink id={it.match.id} href={matchHref(it.match)} className={`mt-2 block truncate text-[14px] font-semibold ${COVER}`}>
      {names(it.match)}
    </StoryLink>
  )
}

function Card({ kind, s, wide = false }: { kind: CardKind; s: Summary; wide?: boolean }) {
  switch (kind) {
    case 'value': {
      const it = s.value!
      const p = it.summary!.pick!
      return (
        <Tile tone="lime" label="Value дня">
          <Big>{edge(p.ev ?? 0)}</Big>
          <MatchLink it={it} />
          <p className="mt-0.5 truncate text-[12.5px] text-acid-ink/65">
            {p.label}
            {p.odd ? (
              <>
                {' '}
                <span className="num font-semibold text-acid-ink">{p.odd.toFixed(2)}</span> · честно <span className="num">{(1 / p.prob).toFixed(2)}</span>
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
          <p className="num mt-0.5 truncate text-[12.5px] text-dim">
            {SIDE[g.side]} {g.from.toFixed(2)} → <span className="font-semibold text-hot">{g.to.toFixed(2)}</span>
          </p>
        </Tile>
      )
    }
    case 'live':
      return (
        <Tile
          label={
            <>
              <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-live" />
              Сейчас в игре
            </>
          }
        >
          <a href="#live" className={`flex items-baseline gap-2 ${COVER}`}>
            <Big>{s.liveCount}</Big>
            <span className="text-[13px] text-dim">{plural(s.liveCount, ['матч', 'матча', 'матчей'])}</span>
          </a>
          <ul className="mt-2.5 space-y-1">
            {s.live.slice(0, 2).map(({ match: m }) => (
              <li key={m.id} className="flex min-w-0 items-center gap-2 text-[12.5px]">
                <span className="num w-7 shrink-0 text-live">{m.statusCode === 4 ? 'Пер' : m.elapsed ? `${m.elapsed}′` : ''}</span>
                <span className="min-w-0 truncate text-chalk">
                  {m.home.name} <span className="num font-semibold text-fg">{m.score ? `${m.score.home}:${m.score.away}` : '–'}</span> {m.away.name}
                </span>
              </li>
            ))}
          </ul>
        </Tile>
      )
    case 'next': {
      const it = s.next!
      return (
        <Tile label={s.liveCount ? 'Следующий матч' : 'Первый матч'}>
          <Big>{formatTime(it.match.ts)}</Big>
          <MatchLink it={it} />
          <p className="mt-0.5 truncate text-[12.5px] text-dim">{it.match.league.name}</p>
        </Tile>
      )
    }
    case 'goals': {
      const g = s.goals!
      return (
        <Tile label="Ждём голов">
          <Link href="/tag/tb-2-5" prefetch={false} className={`flex items-baseline gap-2 ${COVER}`}>
            <Big>{g.count}</Big>
            <span className="text-[13px] text-dim">
              {plural(g.count, ['матч', 'матча', 'матчей'])} с <span className="text-mute">#</span>ТБ2.5
            </span>
          </Link>
          <StoryLink
            id={g.item.match.id}
            href={matchHref(g.item.match)}
            className="relative z-10 mt-2.5 flex min-w-0 items-baseline gap-1.5 text-[12.5px] text-chalk transition-colors hover:text-fg"
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
            <span className="ml-0.5 text-[0.55em] tracking-normal">%</span>
          </Big>
          <MatchLink it={f.item} />
          <p className="mt-0.5 truncate text-[12.5px] text-dim">
            {SIDE[f.side]} · победа: {f.side === 'home' ? f.item.match.home.name : f.item.match.away.name}
          </p>
        </Tile>
      )
    }
    case 'count':
      return (
        <Tile label="Всего за день">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
            <div>
              <a href="#matches" className={`flex items-baseline gap-2 ${COVER}`}>
                <Big>{s.total}</Big>
                <span className="text-[13px] text-dim">{plural(s.total, ['матч', 'матча', 'матчей'])}</span>
              </a>
              <p className="mt-2 truncate text-[12.5px] text-dim">в {pluralN(s.leagues, ['турнире', 'турнирах', 'турнирах'])}</p>
            </div>
            {wide && s.topLeagues.length ? (
              <ul className="hidden min-w-0 flex-1 space-y-1.5 text-[12.5px] sm:block sm:max-w-[60%]">
                {s.topLeagues.map((l) => (
                  <li key={l.id} className="flex items-baseline gap-2">
                    <span className="min-w-0 truncate text-chalk">{l.name}</span>
                    <span className="flex-1 border-b border-dotted border-edge-2" />
                    <span className="num shrink-0 font-semibold text-fg">{l.count}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </Tile>
      )
  }
}

/** Главный виджет: матч дня — команды, почему он главный, шансы и кэфы. */
function TopCard({ it }: { it: FeedItem }) {
  const m = it.match
  const live = isLive(m)
  const played = Boolean(m.score) && (live || m.status === 'finished')
  const f = fair1x2(m.odds?.x12)
  const pick = m.status === 'scheduled' ? it.summary?.pick : null
  const hotKey = pick?.kind === 'value' ? pick.key : null
  const cells = f ? (['home', 'draw', 'away'] as const).map((k) => ({ k, p: f[k], odd: m.odds?.x12?.[k]?.value ?? null })) : null
  const top = cells ? Math.max(...cells.map((c) => c.p)) : 0
  // почему это матч дня — самый весомый тег и его объяснение
  const best = bestTag(it.tags)
  const def = best ? TAG_BY_SLUG.get(best.slug) : undefined
  const team = (t: Match['home'], goals: number | undefined, dim = false) => (
    <span className={`flex min-w-0 items-baseline justify-between gap-4 ${dim ? 'text-chalk' : ''}`}>
      <span className="min-w-0 truncate">{t.name}</span>
      {played ? <span className={`num shrink-0 ${live ? 'text-live' : 'text-fg'}`}>{goals}</span> : null}
    </span>
  )
  return (
    <article className="relative col-span-2 flex min-w-0 flex-col rounded-[20px] border border-edge bg-panel p-5 transition-colors duration-300 hover:border-edge-2 sm:p-6 lg:row-span-2">
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="font-medium text-dim">Матч дня</span>
        <span className="min-w-0 truncate text-mute">
          {m.league.name} ·{' '}
          <span className={`num font-semibold ${live ? 'text-live' : 'text-chalk'}`}>
            {live ? (m.statusCode === 4 ? 'перерыв' : m.elapsed ? `идёт ${m.elapsed}′` : 'идёт') : m.status === 'finished' ? 'итог' : formatTime(m.ts)}
          </span>
        </span>
      </div>

      <StoryLink id={m.id} href={matchHref(m)} className={`mt-4 block text-[24px] font-bold leading-[1.15] tracking-[-0.025em] sm:text-[28px] ${COVER}`}>
        {team(m.home, m.score?.home)}
        {team(m.away, m.score?.away, true)}
      </StoryLink>

      {best && def ? (
        <p className="mt-3 line-clamp-2 max-w-[52ch] text-[14px] leading-snug text-dim">
          <span className={WHY_TONE[def.kind]}>{def.label}</span> · {best.reason}
        </p>
      ) : null}

      {cells ? (
        <div className="mt-6">
          <div className="grid grid-cols-3 gap-3">
            {cells.map((c) => (
              <div key={c.k} className="min-w-0">
                <div className={`num text-[26px] font-bold leading-none tracking-[-0.04em] sm:text-[30px] ${c.p === top ? 'text-fg' : 'text-dim'}`}>
                  {Math.round(c.p * 100)}
                  <span className="ml-0.5 text-[0.55em] tracking-normal">%</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[12.5px] text-dim">
                  {SIDE[c.k]}
                  {c.odd ? (
                    <span className={`num rounded-md px-1.5 py-px font-semibold ${c.k === hotKey ? 'bg-acid text-acid-ink' : 'bg-panel-3 text-fg/90'}`}>{c.odd.toFixed(2)}</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex h-1 gap-0.5 overflow-hidden rounded-full" aria-hidden>
            {cells.map((c) => (
              <span key={c.k} className={c.k === 'home' ? 'bg-home' : c.k === 'away' ? 'bg-away' : 'bg-tie'} style={{ width: `${c.p * 100}%` }} />
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-auto flex items-center justify-between gap-3 pt-6 text-[13px]">
        <span aria-hidden className="inline-flex items-center gap-2 rounded-full bg-panel-3 py-1.5 pl-1.5 pr-3.5 font-medium text-fg">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-acid text-acid-ink">
            <svg viewBox="0 0 12 12" className="ml-px h-2.5 w-2.5" fill="currentColor">
              <path d="M3 1.5v9l7.5-4.5z" />
            </svg>
          </span>
          Матч в слайдах
        </span>
        {pick ? (
          <span className={`truncate ${pick.kind === 'value' ? 'text-acid' : 'text-dim'}`}>
            Прогноз {pick.label}
            {pick.odd ? <span className="num ml-1 font-semibold">{pick.odd.toFixed(2)}</span> : null}
          </span>
        ) : null}
      </div>
    </article>
  )
}

/**
 * «Сводка дня» — виджеты под кружками историй: большой «Матч дня» и четыре
 * маленьких — value (лайм), прогруз (янтарь), live или первый матч, голы…
 * Каждый открывает сторис матча или нужный блок страницы.
 */
export function DaySummary({ s, className = '' }: { s: Summary; className?: string }) {
  if (!s.top) return null
  const cards = summaryCards(s)
  return (
    <section aria-label="Сводка дня" className={`grid grid-cols-2 gap-3 lg:grid-cols-4 ${className}`}>
      <TopCard it={s.top} />
      {cards.map((k, i) => {
        // карточек меньше четырёх — последние растягиваем, чтобы в сетке не было дыр
        const wide = cards.length <= 2 || (cards.length === 3 && i === 2)
        return (
          <div key={k} className={`min-w-0 ${wide ? 'col-span-2' : ''} ${cards.length === 2 ? 'lg:col-span-2' : ''}`}>
            <Card kind={k} s={s} wide={wide} />
          </div>
        )
      })}
    </section>
  )
}
