import Link from 'next/link'
import type { FeedItem } from '@/lib/data'
import { formatTime, pluralN } from '@/lib/format'
import { leagueHref } from '@/lib/links'
import type { League } from '@/lib/types'
import { Flag } from './Flag'
import { MatchRow } from './MatchRow'

export function LeagueBlock({ league, items }: { league: League; items: FeedItem[]; featured?: boolean }) {
  return (
    <section className="card overflow-hidden">
      <header className="flex items-baseline justify-between gap-3 border-b border-edge px-4 py-4 sm:px-5">
        <Link href={leagueHref(league)} prefetch={false} className="group flex min-w-0 items-center gap-2.5">
          <Flag league={league} />
          <span className="truncate text-[20px] font-bold tracking-tight">{league.name}</span>
          <span className="text-mute transition-transform duration-300 group-hover:translate-x-1" aria-hidden>
            →
          </span>
        </Link>
        <span className="shrink-0 text-[12px] text-mute">{pluralN(items.length, ['матч', 'матча', 'матчей'])}</span>
      </header>
      <div className="divide-y divide-edge">
        {items.map((it) => (
          <MatchRow key={it.match.id} m={it.match} tags={it.tags} summary={it.summary} />
        ))}
      </div>
    </section>
  )
}

export function LiveBlock({ items, total }: { items: FeedItem[]; total: number }) {
  return (
    <section id="live" className="card scroll-mt-24 overflow-hidden">
      <header className="flex items-baseline justify-between gap-3 border-b border-edge px-4 py-4 sm:px-5">
        <span className="flex items-center gap-2.5 text-[20px] font-bold tracking-tight">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-live/10 px-2 py-0.5 text-[11px] font-bold tracking-wide text-live">
            <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-live" aria-hidden />
            LIVE
          </span>
          Сейчас в игре
        </span>
        <span className="text-[12px] text-mute">
          {total > items.length ? `${items.length} из ${total}` : pluralN(total, ['матч', 'матча', 'матчей'])}
        </span>
      </header>
      <div className="divide-y divide-edge">
        {items.map((it) => (
          <MatchRow key={it.match.id} m={it.match} tags={it.tags} summary={it.summary} />
        ))}
      </div>
    </section>
  )
}

/**
 * Все матчи дня по времени начала — одной карточкой, по часам: «14:00 · 5 матчей».
 * У каждой строки — турнир, раз они вперемешку.
 */
export function TimeBlock({ items }: { items: FeedItem[] }) {
  const hours = new Map<string, FeedItem[]>()
  for (const it of items) {
    const h = `${formatTime(it.match.ts).slice(0, 2)}:00`
    hours.set(h, [...(hours.get(h) ?? []), it])
  }
  return (
    <section className="card overflow-hidden">
      {[...hours].map(([h, list]) => (
        <div key={h}>
          <h3 className="flex items-baseline justify-between gap-3 border-b border-edge bg-white/[0.02] px-4 py-2.5 sm:px-5">
            <span className="num text-[15px] font-bold">{h}</span>
            <span className="text-[12px] text-mute">{pluralN(list.length, ['матч', 'матча', 'матчей'])}</span>
          </h3>
          <div className="divide-y divide-edge border-b border-edge last:border-b-0">
            {list.map((it) => (
              <MatchRow key={it.match.id} m={it.match} tags={it.tags} summary={it.summary} showLeague />
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
