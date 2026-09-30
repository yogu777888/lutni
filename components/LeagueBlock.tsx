import Link from 'next/link'
import type { FeedItem } from '@/lib/data'
import { pluralN } from '@/lib/format'
import { leagueHref } from '@/lib/links'
import type { League } from '@/lib/types'
import { MatchRow } from './MatchRow'

export function LeagueBlock({ league, items, featured }: { league: League; items: FeedItem[]; featured?: boolean }) {
  return (
    <section className="card overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-edge px-3 py-2.5 sm:px-4">
        <Link href={leagueHref(league)} prefetch={false} className="flex min-w-0 items-center gap-2 text-[14px] font-bold hover:text-acid">
          {featured ? <span className="h-2 w-2 shrink-0 rounded-sm bg-acid" aria-hidden /> : null}
          <span className="truncate">{league.name}</span>
        </Link>
        <span className="shrink-0 text-[12px] text-mute">{pluralN(items.length, ['матч', 'матча', 'матчей'])}</span>
      </header>
      <div className="divide-y divide-edge/70">
        {items.map((it) => (
          <MatchRow key={it.match.id} m={it.match} tags={it.tags} summary={it.summary} />
        ))}
      </div>
    </section>
  )
}

export function LiveBlock({ items, total }: { items: FeedItem[]; total: number }) {
  return (
    <section className="card overflow-hidden ring-1 ring-live/20">
      <header className="flex items-center justify-between gap-3 border-b border-edge px-3 py-2.5 sm:px-4">
        <span className="flex items-center gap-2 text-[14px] font-bold">
          <span className="h-2 w-2 animate-pulse-live rounded-full bg-live" aria-hidden />
          Сейчас в игре
        </span>
        <span className="text-[12px] text-mute">
          {total > items.length ? `${items.length} из ${total}` : pluralN(total, ['матч', 'матча', 'матчей'])}
        </span>
      </header>
      <div className="divide-y divide-edge/70">
        {items.map((it) => (
          <MatchRow key={it.match.id} m={it.match} tags={it.tags} summary={it.summary} showLeague />
        ))}
      </div>
    </section>
  )
}
