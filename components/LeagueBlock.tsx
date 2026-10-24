import Link from 'next/link'
import type { FeedItem } from '@/lib/data'
import { formatTime, pluralN } from '@/lib/format'
import { leagueHref } from '@/lib/links'
import type { X12Line } from '@/lib/lines'
import type { League } from '@/lib/types'
import { flagCode, leagueTitle } from '@/lib/flags'
import { Flag } from './Flag'
import { MatchRow } from './MatchRow'
import { BlockTitle } from './Section'
import { liveText } from './shell/StateLine'

/**
 * Порядок строк в блоке лиги: идущие (если не попали в «Сейчас в игре»), потом предстоящие — ближайший первым, потом
 * перенесённые, сыгранные — в конце (владелец согласился: днём сверху стояли итоги, а матчи с кэфами уходили вниз).
 * Внутри — по времени начала.
 */
const STATE_ORDER: Record<string, number> = { live: 0, suspended: 0, scheduled: 1, postponed: 2, cancelled: 2, finished: 3 }
const byState = (a: FeedItem, b: FeedItem) =>
  (STATE_ORDER[a.match.status] ?? 2) - (STATE_ORDER[b.match.status] ?? 2) || a.match.ts - b.match.ts

/** Пометка рекламы у кэфов-ссылок: «Кэфы Winline · Реклама» — какие букмекеры стоят в строках блока (закон о рекламе). */
function AdNote({ items, lines, full }: { items: FeedItem[]; lines: Record<number, X12Line>; full?: boolean }) {
  const books = [...new Set(items.map((i) => lines[i.match.id]?.bookmaker).filter(Boolean))]
  if (!books.length) return null
  return (
    // `full` — строкой под названием на телефоне: «Кэфы PARI · Реклама · 18+»
    <span className="text-mute" title={`Кэфы ${books.join(', ')} — ссылки к букмекеру-партнёру`}>
      Кэфы {books.join(', ')} · Реклама{full ? ' · 18+' : ''}
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
    // заголовок — над карточкой, на фоне страницы, как разделы страницы матча (владелец: «как визуально сделать блоки на
    // главной похожими на блоки в матче чтоб заголовок вне блока»): в карточке — только строки матчей
    <section data-block id={`league-${league.id}`} className="min-w-0 scroll-mt-36 xl:scroll-mt-24">
      {/* справа — на линии названия (под ним на телефоне ещё строка «Кэфы PARI · Реклама»: по центру двух строк «● 3 · Таблица» висели посередине) */}
      <header className="mb-2.5 flex items-start justify-between gap-3 px-4 sm:items-center sm:px-5">
        <div className="min-w-0">
          <Link href={leagueHref(league)} prefetch={false} className="group flex min-w-0 items-center gap-2.5">
            <Flag league={league} />
            {/* страну говорит флаг — в названии без неё («Испания. Ла Лига» → «Ла Лига»; владелец: «название страны убрать, если есть флаг?») */}
            <h2 className="truncate text-[20px] font-bold leading-tight tracking-[-0.01em]" title={league.name}>
              {flagCode(league) ? leagueTitle(league.name) : league.name}
            </h2>
          </Link>
          {/* на телефоне пометка — строкой под названием: справа она вместе с «идут 3 матча» и «Таблицей» сжимала «Ла Лигу» до «Л…» */}
          <div className="mt-1 pl-[32px] text-[12px] sm:hidden">
            <AdNote items={items} lines={lines} full />
          </div>
        </div>
        <div className="mt-[3px] flex shrink-0 items-center gap-3 text-[13px] font-medium sm:mt-0 sm:gap-4">
          <span className="hidden sm:inline">
            <AdNote items={items} lines={lines} />
          </span>
          {/* идущие матчи лиги — наверху, в «Сейчас в игре»: здесь только пометка со ссылкой туда */}
          {live ? (
            // серым, как «Таблица →», красная — только точка (как в боковых панелях; красные слова тянули взгляд сильнее названия лиги);
            // на телефоне — «● 3», полностью — в подсказке
            <a href="#live" title={liveText(live)} className="flex items-center gap-1.5 text-dim transition-colors hover:text-fg">
              <span className="h-1.5 w-1.5 rounded-full bg-live" />
              <span className="sm:hidden">{live}</span>
              <span className="hidden sm:inline">{liveText(live)}</span>
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
      <div className="card divide-y divide-edge overflow-hidden">
        {[...items].sort(byState).map((it) => (
          <MatchRow key={it.match.id} m={it.match} tags={it.tags} summary={it.summary} line={lines[it.match.id] ?? null} />
        ))}
      </div>
    </section>
  )
}

/**
 * «Сейчас в игре»: сверху — идущие матчи топ-турниров (`items`), ниже под раскрывашкой — идущие в остальных (`rest`,
 * с турниром под командами: «Petřín Plzeň — Rokycany» без него ни о чём не говорит). Нет идущих в топ-турнирах — блок
 * из шапки и одной строки «42 матча идут в других турнирах», а не первый экран низших лиг.
 */
export function LiveBlock({ items, total, rest = [] }: { items: FeedItem[]; total: number; rest?: FeedItem[] }) {
  return (
    <section data-block id="live" className="min-w-0 scroll-mt-36 xl:scroll-mt-24">
      {/* заголовок над карточкой, как у лиг и разделов матча; без плашки LIVE — «LIVE» и «Сейчас в игре» говорили одно и то же */}
      <BlockTitle
        rows
        title={
          <span className="flex items-center gap-2.5">
            <span className="h-2 w-2 animate-pulse-live rounded-full bg-live" aria-hidden />
            Сейчас в игре
          </span>
        }
        // число матчей не пишем (владелец: «число матчей справа убрать?») — только если показаны не все
        aside={total > items.length ? `${items.length} из ${total}` : null}
      />
      <div className="card overflow-hidden">
        <div className="divide-y divide-edge">
          {items.map((it) => (
            <MatchRow key={it.match.id} m={it.match} tags={it.tags} summary={it.summary} />
          ))}
        </div>
      {rest.length ? (
        <details className={`group/rest ${items.length ? 'border-t border-edge' : ''}`}>
          <summary className="flex items-center justify-between gap-3 px-4 py-3.5 text-[14px] text-dim transition-colors hover:text-fg sm:px-5">
            <span>
              {items.length
                ? `Ещё ${pluralN(rest.length, ['матч', 'матча', 'матчей'])} в других турнирах`
                : `${pluralN(rest.length, ['матч идёт', 'матча идут', 'матчей идут'])} в других турнирах`}
            </span>
            <span aria-hidden className="text-mute transition-transform group-open/rest:rotate-180">
              ▾
            </span>
          </summary>
          <div className="divide-y divide-edge border-t border-edge">
            {rest.map((it) => (
              <MatchRow key={it.match.id} m={it.match} tags={it.tags} summary={it.summary} showLeague />
            ))}
          </div>
        </details>
      ) : null}
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
    <section data-block className="card overflow-hidden">
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
