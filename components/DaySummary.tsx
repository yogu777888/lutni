import Link from 'next/link'
import { getPartner, type Partner } from '@/config/bookmakers'
import { featuredInfo } from '@/config/leagues'
import { goHref, SPONSORED_REL } from '@/lib/affiliate'
import { edgeTone, type DayPick, type DaySummary as Summary } from '@/lib/day-summary'
import { formatTime, plural } from '@/lib/format'
import { matchHref } from '@/lib/links'
import { TAG_BY_SLUG } from '@/lib/tags'
import type { Match } from '@/lib/types'
import { AdMarks } from './AdMark'
import { StoryLink } from './story/StoryLink'

const names = (m: Match) => `${m.home.name} — ${m.away.name}`
/** В виджетах — короткое имя турнира: «АПЛ», а не «Англия. Премьер-лига». */
const league = (m: Match) => featuredInfo(m.league)?.short || m.league.name
const pct = (p: number) => `${Math.round(p * 100)}%`
const edge = (ev: number) => `+${(ev * 100).toFixed(1).replace('.', ',')}%`
const SIDE = { home: 'П1', away: 'П2' } as const
const HASH = { accent: 'text-acid', hot: 'text-hot', neutral: 'text-mute' } as const

/** Рамка виджета: заголовок-вопрос, пояснение в одну строку и ссылка «все». */
function Card({
  title,
  sub,
  more,
  className = '',
  children,
}: {
  title: React.ReactNode
  sub: React.ReactNode
  more?: { href: string; label: string }
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={`flex min-w-0 flex-col rounded-[24px] border border-edge bg-panel p-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.035)] sm:p-6 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.015em]">{title}</h2>
          <p className="mt-0.5 text-[12.5px] leading-snug text-dim">{sub}</p>
        </div>
        {more ? (
          <Link href={more.href} prefetch={false} className="shrink-0 pt-0.5 text-[13px] text-dim transition-colors hover:text-fg">
            {more.label} →
          </Link>
        ) : null}
      </div>
      <div className="mt-4 flex min-w-0 flex-1 flex-col">{children}</div>
    </section>
  )
}

const ROW = 'border-t border-edge py-3 first:border-t-0 first:pt-0 last:pb-0'

// ─── Ставки дня ──────────────────────────────────────────────────────────────

const BTN_TONE = {
  hot: 'bg-acid text-acid-ink hover:brightness-105',
  lime: 'bg-acid/75 text-acid-ink hover:bg-acid',
  soft: 'bg-acid/[0.12] text-acid ring-1 ring-inset ring-acid/30 hover:bg-acid/20',
  none: 'bg-panel-3 text-fg hover:bg-[#2a2923]',
} as const

/** Кнопка ставки: исход, кэф и перевес; цвет — сила перевеса. Ведёт к букмекеру через /go. */
function BetButton({ p }: { p: DayPick }) {
  const partner = p.partnerSlug ? getPartner(p.partnerSlug) : undefined
  const tone = p.kind === 'value' ? edgeTone(p.ev) : 'none'
  const body = (
    <>
      <span className="text-[11.5px] font-medium opacity-70">{p.label}</span>
      <span className="num text-[18px] font-bold leading-tight">{p.odd ? p.odd.toFixed(2) : '—'}</span>
      <span className="num text-[11px] font-semibold opacity-75">
        {p.kind === 'value' && p.ev ? edge(p.ev) : partner ? partner.name : `шанс ${pct(p.prob)}`}
      </span>
    </>
  )
  const cls = `relative z-10 flex w-[84px] shrink-0 flex-col items-center rounded-2xl px-2 py-1.5 transition ${BTN_TONE[tone]}`
  if (partner && p.odd) {
    return (
      <a href={goHref(partner, 'pick', p.item.match.id)} target="_blank" rel={SPONSORED_REL} className={cls} title={`Поставить в ${partner.name}`}>
        {body}
      </a>
    )
  }
  return <span className={cls}>{body}</span>
}

function PicksCard({ picks, className = '' }: { picks: DayPick[]; className?: string }) {
  const value = picks.filter((p) => p.kind === 'value').length
  const modelReady = picks.some((p) => p.kind !== 'favorite')
  const partners = [...new Map(picks.flatMap((p) => (p.partnerSlug ? [getPartner(p.partnerSlug)] : [])).filter((x): x is Partner => Boolean(x)).map((x) => [x.slug, x])).values()]
  return (
    <Card
      className={className}
      title="Ставки дня"
      sub={
        value === picks.length
          ? 'Где букмекер платит больше честной цены — по размеру перевеса'
          : value
            ? 'Сначала — где букмекер платит больше честной цены, потом — самые уверенные исходы'
            : modelReady
              ? 'Самые уверенные исходы по модели tag.bet'
              : 'Фавориты главных матчей по линии — подробный разбор ещё считается'
      }
      more={{ href: '/tag/value', label: 'Все value' }}
    >
      <ol>
        {picks.map((p) => {
          const m = p.item.match
          const why = p.why ? TAG_BY_SLUG.get(p.why.slug) : undefined
          // шанс уже написан на кнопке, если на ней нет перевеса и букмекера
          const chanceOnButton = p.kind !== 'value' && !(p.partnerSlug && getPartner(p.partnerSlug))
          return (
            <li key={m.id} className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 sm:grid-cols-[3.25rem_minmax(0,1fr)_auto] sm:gap-x-4 ${ROW}`}>
              <span className="num hidden text-[15px] font-semibold text-chalk sm:block">{formatTime(m.ts)}</span>
              <div className="min-w-0">
                {/* на телефоне название в две строки, время — в строке под ним */}
                <StoryLink id={m.id} href={matchHref(m)} className="line-clamp-2 text-[15px] font-semibold leading-snug transition-colors hover:text-acid sm:line-clamp-1">
                  {names(m)}
                </StoryLink>
                <p className="mt-0.5 truncate text-[12.5px] text-dim">
                  <span className="num text-chalk sm:hidden">{formatTime(m.ts)} · </span>
                  {league(m)}
                  {chanceOnButton ? null : (
                    <>
                      {' '}
                      · шанс <span className="num text-chalk">{pct(p.prob)}</span>
                    </>
                  )}
                  <span className="hidden sm:inline">
                    {' '}
                    · честный кэф <span className="num text-chalk">{p.fair.toFixed(2)}</span>
                  </span>
                </p>
                {p.why && why ? (
                  <p className="mt-0.5 truncate text-[12.5px] text-mute" title={p.why.reason}>
                    <span className={HASH[why.kind]}>#</span>
                    <span className="text-dim">{why.label.replace(/^#/, '')}</span> · {p.why.reason}
                  </p>
                ) : null}
              </div>
              <BetButton p={p} />
            </li>
          )
        })}
      </ol>
      <div className="mt-auto space-y-1 pt-4">
        <p className="text-[11.5px] text-mute">
          {value
            ? 'Перевес = кэф × шанс − 1. Это цена, а не гарантия выигрыша.'
            : modelReady
              ? 'Шанс — по модели tag.bet. Это оценка, а не гарантия выигрыша.'
              : 'Шанс — по коэффициентам без маржи букмекера. Это оценка, а не гарантия выигрыша.'}
        </p>
        <AdMarks partners={partners} />
      </div>
    </Card>
  )
}

// ─── Сейчас в игре / ближайшие ───────────────────────────────────────────────

function LiveCard({ s }: { s: Summary }) {
  if (s.liveCount) {
    return (
      <Card
        title={
          <>
            <span className="h-2 w-2 animate-pulse-live rounded-full bg-live" />
            Сейчас в игре
          </>
        }
        sub={`${s.liveCount} ${plural(s.liveCount, ['матч идёт', 'матча идут', 'матчей идут'])}`}
        more={{ href: '#live', label: 'Все' }}
      >
        <ul>
          {s.live.map(({ match: m }) => (
            <li key={m.id} className={`grid grid-cols-[2.25rem_minmax(0,1fr)] items-baseline gap-x-2 ${ROW}`}>
              <span className="num text-[13px] font-semibold text-live">{m.statusCode === 4 ? 'Пер' : m.elapsed ? `${m.elapsed}′` : ''}</span>
              <div className="min-w-0">
                <StoryLink id={m.id} href={matchHref(m)} className="block truncate text-[14px] font-medium transition-colors hover:text-acid">
                  {m.home.name} <span className="num font-bold text-fg">{m.score ? `${m.score.home}:${m.score.away}` : '–'}</span> {m.away.name}
                </StoryLink>
                <p className="truncate text-[12px] text-mute">{league(m)}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    )
  }
  if (!s.upcoming.length) return null
  return (
    <Card title="Ближайшие матчи" sub="Что начнётся первым" more={{ href: '#matches', label: 'Все' }}>
      <ul>
        {s.upcoming.map(({ match: m }) => (
          <li key={m.id} className={`grid grid-cols-[2.75rem_minmax(0,1fr)] items-baseline gap-x-2 ${ROW}`}>
            <span className="num text-[13px] font-semibold text-chalk">{formatTime(m.ts)}</span>
            <div className="min-w-0">
              <StoryLink id={m.id} href={matchHref(m)} className="block truncate text-[14px] font-medium transition-colors hover:text-acid">
                {names(m)}
              </StoryLink>
              <p className="truncate text-[12px] text-mute">{league(m)}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

// ─── Прогрузы ────────────────────────────────────────────────────────────────

function DropsCard({ s }: { s: Summary }) {
  return (
    <Card title="Прогрузы" sub="Кэф резко упал — на исход идут деньги" more={{ href: '/tag/progruz', label: 'Все' }}>
      <ul>
        {s.drops.map((d) => (
          <li key={d.item.match.id} className={`flex min-w-0 items-center gap-3 ${ROW}`}>
            <div className="min-w-0 flex-1">
              <StoryLink id={d.item.match.id} href={matchHref(d.item.match)} className="block truncate text-[14px] font-medium transition-colors hover:text-acid">
                {names(d.item.match)}
              </StoryLink>
              <p className="num truncate text-[12px] text-mute">
                {SIDE[d.side]} {d.from.toFixed(2)} → <span className="font-semibold text-chalk">{d.to.toFixed(2)}</span>
              </p>
            </div>
            <span className="num shrink-0 rounded-full bg-hot/10 px-2.5 py-1 text-[13px] font-bold text-hot">−{Math.round(d.drop * 100)}%</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/**
 * «Главное за день» — первый экран главной: ставки дня (главный блок), что идёт
 * сейчас (или ближайшие матчи) и прогрузы. Каждый виджет отвечает на один вопрос
 * посетителя; матчи открывают сторис, кнопки ставок ведут к букмекерам.
 * «Где ставить» здесь нет: он есть в шапке («Бонус») и в боковой колонке списка матчей.
 */
export function DaySummary({ s, className = '' }: { s: Summary; className?: string }) {
  const hasLive = s.liveCount > 0 || s.upcoming.length > 0
  if (!s.picks.length && !hasLive && !s.drops.length) return null
  const side = (
    <>
      <LiveCard s={s} />
      {s.drops.length ? <DropsCard s={s} /> : null}
    </>
  )
  if (!s.picks.length) return <div className={`grid gap-3 md:grid-cols-2 ${className}`}>{side}</div>
  if (!hasLive && !s.drops.length) return <PicksCard picks={s.picks} className={className} />
  return (
    <div className={`grid gap-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] ${className}`}>
      <PicksCard picks={s.picks} />
      {/* правая колонка тянется по высоте ставок: последний виджет занимает остаток */}
      <div className="flex min-w-0 flex-col gap-3 [&>*:last-child]:flex-1">{side}</div>
    </div>
  )
}
