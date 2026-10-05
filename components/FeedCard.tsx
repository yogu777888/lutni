import type { FeedItem } from '@/lib/data'
import { dayLabel, formatOdd, formatTime, todayYmd, ymdInTz } from '@/lib/format'
import { matchHref } from '@/lib/links'
import { StoryLink } from './story/StoryLink'
import { TagPill } from './TagPill'
import { TeamLogo } from './TeamLogo'

/** Карточка матча в ленте тега: время, команды, почему тег, прогноз. */
export function FeedCard({ item, tagSlug }: { item: FeedItem; tagSlug: string }) {
  const { match: m, tags, summary } = item
  const hit = tags.find((t) => t.slug === tagSlug)
  const x = m.odds?.x12
  const live = m.status === 'live'
  return (
    <article className="card relative flex flex-col p-4 transition-colors hover:bg-panel-3">
      <div className="flex items-center justify-between gap-2 text-[12px] text-mute">
        <span className={`shrink-0 font-medium ${live ? 'text-live' : 'text-dim'}`}>
          {live ? `LIVE ${m.elapsed ?? ''}′` : `${dayLabel(ymdInTz(m.ts), todayYmd()).split(',')[0]} · ${formatTime(m.ts)}`}
        </span>
        <span className="truncate">{m.league.name}</span>
      </div>
      <StoryLink id={m.id} href={matchHref(m)} className="mt-2 block after:absolute after:inset-0 after:content-['']">
        {[m.home, m.away].map((t) => (
          <span key={t.id} className="flex items-center gap-2 py-0.5 text-[15px] font-medium">
            <TeamLogo name={t.name} src={t.logo} size={20} />
            <span className="truncate">{t.name}</span>
          </span>
        ))}
      </StoryLink>
      {hit ? <p className="mt-2.5 text-[13px] leading-snug text-dim">{hit.reason}</p> : null}
      <div className="relative z-10 mt-auto flex flex-wrap items-center gap-1 pt-3">
        {summary?.pick ? (
          <span
            className={`inline-flex h-6 items-center rounded-full px-2 text-[12px] font-medium ${
              summary.pick.kind === 'value' ? 'bg-acid/[0.12] text-acid' : 'bg-white/[0.06] text-fg/85'
            }`}
          >
            Прогноз {summary.pick.label}
            {summary.pick.odd ? <span className="num ml-1 font-semibold">{summary.pick.odd.toFixed(2)}</span> : null}
          </span>
        ) : null}
        {tags
          .filter((t) => t.slug !== tagSlug)
          .slice(0, 3)
          .map((t) => (
            <TagPill key={t.slug} slug={t.slug} reason={t.reason} />
          ))}
        {x ? (
          <span className="num ml-auto text-[12px] text-mute">
            {formatOdd(x.home?.value)} · {formatOdd(x.draw?.value)} · {formatOdd(x.away?.value)}
          </span>
        ) : null}
      </div>
    </article>
  )
}
