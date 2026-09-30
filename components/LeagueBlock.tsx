import Link from 'next/link'
import type { FeedItem } from '@/lib/data'
import { leagueHref } from '@/lib/links'
import type { League } from '@/lib/types'
import { MatchRow } from './MatchRow'

export function LeagueBlock({ league, items, featured }: { league: League; items: FeedItem[]; featured?: boolean }) {
  return (
    <section className="card overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-edge bg-panel-2/60 px-3 py-2">
        <Link href={leagueHref(league)} prefetch={false} className="flex min-w-0 items-center gap-2 text-[13px] font-bold hover:text-acid">
          {featured ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-acid" aria-hidden /> : null}
          <span className="truncate">{league.name}</span>
        </Link>
        <span className="shrink-0 text-[11px] text-mute">{items.length}</span>
      </header>
      <div className="divide-y divide-edge/70">
        {items.map((it) => (
          <MatchRow key={it.match.id} m={it.match} tags={it.tags} summary={it.summary} />
        ))}
      </div>
    </section>
  )
}
