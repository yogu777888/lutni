import Link from 'next/link'
import type { FeedItem } from '@/lib/data'
import { formatTime } from '@/lib/format'
import { leagueHref } from '@/lib/links'
import type { X12Line } from '@/lib/lines'
import type { League } from '@/lib/types'
import { flagCode, leagueTitle } from '@/lib/flags'
import { Flag } from './Flag'
import { MatchRow } from './MatchRow'

/**
 * Порядок строк в блоке лиги: идущие (если не попали в «Сейчас в игре»), потом предстоящие — ближайший первым, потом
 * перенесённые, сыгранные — в конце (владелец согласился: днём сверху стояли итоги, а матчи с кэфами уходили вниз).
 * Внутри — по времени начала.
 */
const STATE_ORDER: Record<string, number> = { live: 0, suspended: 0, scheduled: 1, postponed: 2, cancelled: 2, finished: 3 }
const byState = (a: FeedItem, b: FeedItem) =>
  (STATE_ORDER[a.match.status] ?? 2) - (STATE_ORDER[b.match.status] ?? 2) || a.match.ts - b.match.ts

/** Пометка рекламы у кэфов-ссылок: «Кэфы Winline · Реклама» — какие букмекеры стоят в строках блока (закон о рекламе). */
function AdNote({ items, lines }: { items: FeedItem[]; lines: Record<number, X12Line> }) {
  const books = [...new Set(items.map((i) => lines[i.match.id]?.bookmaker).filter(Boolean))]
  if (!books.length) return null
  return (
    // на телефоне — коротко «Реклама» (места мало), но пометка видна везде
    <span className="text-mute" title={`Кэфы ${books.join(', ')} — ссылки к букмекеру-партнёру`}>
      <span className="hidden sm:inline">Кэфы {books.join(', ')} · </span>Реклама
    </span>
  )
}

export function LeagueBlock({
  league,
  items,
  lines = {},
  live = 0,
}: {
  league: League
  items: FeedItem[]
  featured?: boolean
  /** линия партнёра по матчам: кэфы в строках — ссылки к нему */
  lines?: Record<number, X12Line>
  live?: number
}) {
  return (
    // id — для «Турниров дня» в левой панели (клик прокручивает сюда)
    <section id={`league-${league.id}`} className="card scroll-mt-24 overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-edge px-4 py-4 sm:px-5">
        <Link href={leagueHref(league)} prefetch={false} className="group flex min-w-0 items-center gap-2.5">
          <Flag league={league} />
          {/* страну говорит флаг — в названии без неё («Испания. Ла Лига» → «Ла Лига»; владелец: «название страны убрать, если есть флаг?») */}
          <span className="truncate text-[20px] font-bold tracking-tight" title={league.name}>
            {flagCode(league) ? leagueTitle(league.name) : league.name}
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-4 text-[13px] font-medium">
          <AdNote items={items} lines={lines} />
          {/* идущие матчи лиги — наверху, в «Сейчас в игре»: здесь только пометка со ссылкой туда */}
          {live ? (
            <a href="#live" className="flex items-center gap-1.5 text-live transition-opacity hover:opacity-80">
              <span className="h-1.5 w-1.5 rounded-full bg-live" />
              {live} в игре
            </a>
          ) : null}
          {/* вместо безымянной стрелки — понятная ссылка: страница турнира с таблицей */}
          <Link href={leagueHref(league)} prefetch={false} className="group/t flex items-center gap-1 text-dim transition-colors hover:text-fg">
            Таблица
            <span aria-hidden className="transition-transform duration-300 group-hover/t:translate-x-0.5">
              →
            </span>
          </Link>
        </div>
      </header>
      <div className="divide-y divide-edge">
        {[...items].sort(byState).map((it) => (
          <MatchRow key={it.match.id} m={it.match} tags={it.tags} summary={it.summary} line={lines[it.match.id] ?? null} />
        ))}
      </div>
    </section>
  )
}

export function LiveBlock({ items, total }: { items: FeedItem[]; total: number }) {
  return (
    <section id="live" className="card scroll-mt-24 overflow-hidden">
      <header className="flex items-baseline justify-between gap-3 border-b border-edge px-4 py-4 sm:px-5">
        {/* без плашки LIVE — «LIVE» и «Сейчас в игре» говорили одно и то же */}
        <span className="flex items-center gap-2.5 text-[20px] font-bold tracking-tight">
          <span className="h-2 w-2 animate-pulse-live rounded-full bg-live" aria-hidden />
          Сейчас в игре
        </span>
        {/* число матчей не пишем (владелец: «число матчей справа убрать?») — только если показаны не все */}
        {total > items.length ? <span className="text-[12px] text-mute">{`${items.length} из ${total}`}</span> : null}
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
export function TimeBlock({ items, lines = {} }: { items: FeedItem[]; lines?: Record<number, X12Line> }) {
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
            <span className="text-[12px]">
              <AdNote items={list} lines={lines} />
            </span>
          </h3>
          <div className="divide-y divide-edge border-b border-edge last:border-b-0">
            {list.map((it) => (
              <MatchRow key={it.match.id} m={it.match} tags={it.tags} summary={it.summary} line={lines[it.match.id] ?? null} showLeague />
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
