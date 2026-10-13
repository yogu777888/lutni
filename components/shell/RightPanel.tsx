'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { CompactMatch } from '@/lib/compact'
import type { DayPicks } from '@/lib/day-picks'
import { TeamLogo } from '../TeamLogo'
import { openStory } from '../story/events'
import { circleQueue } from '../story/queue'
import { readSeen, SEEN_EVENT } from '../story/seen'
import { StorySymbol } from '../story/StorySymbol'
import { PanelToggle } from './PanelToggle'

const Play = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" />
  </svg>
)

/** Справа в строке матча: главная цифра подборки («−17%», «62%»), иначе минута и счёт / время / итог. */
function Right({ m, stat, hot }: { m: CompactMatch; stat?: string; hot: boolean }) {
  // главная цифра подборки важнее счёта («Кэф упал» — «−17%»); идущий матч — красной точкой рядом
  if (stat)
    return (
      <span className={`num flex shrink-0 items-center gap-1.5 text-[13px] font-semibold ${hot ? 'text-hot' : 'text-fg'}`}>
        {m.live ? <span className="h-1.5 w-1.5 rounded-full bg-live" title="Идёт" /> : null}
        {stat}
      </span>
    )
  if (m.live)
    return (
      <span className="num shrink-0 text-right text-[13px] font-semibold leading-tight text-live">
        {m.score ? `${m.score[0]}:${m.score[1]}` : ''}
        <span className="block text-[11.5px] font-medium">{m.minute}</span>
      </span>
    )
  if (m.finished && m.score) return <span className="num shrink-0 text-[13px] text-dim">{`${m.score[0]}:${m.score[1]}`}</span>
  return <span className="num shrink-0 text-[13px] text-dim">{m.time}</span>
}

/**
 * Правая панель каркаса (от xl) — «Подборки дня» (владелец: «в центре просто матчи по лигам, а сортированные — в
 * боковой виджет; название, рядом кнопка просмотра историй, снизу раскрытие матчей»): строка подборки — знак, название,
 * число матчей и белая ▶ (сторис по всей подборке подряд, с первого непросмотренного); клик по названию раскрывает
 * матчи строками (эмблемы, команды, главная цифра / время / счёт) и «Все N матчей →» (страница тега).
 * Свёрнута — полоска со значками подборок.
 */
/** Сколько подборок видно сразу, если их больше `FOLD_FROM`; остальные — под «Ещё N» (прятать одну-две нет смысла). */
const SHOWN = 7
const FOLD_FROM = 10

export function RightPanel({ picks }: { picks: DayPicks }) {
  const [open, setOpen] = useState<string | null>(null)
  const [all, setAll] = useState(false)
  const [seen, setSeen] = useState<Set<string>>(() => new Set())
  useEffect(() => {
    const update = () => setSeen(readSeen())
    update()
    window.addEventListener(SEEN_EVENT, update)
    return () => window.removeEventListener(SEEN_EVENT, update)
  }, [])

  const { groups, matches, stats, totals } = picks
  const fold = groups.length >= FOLD_FROM
  const play = (gi: number, e: React.MouseEvent<HTMLButtonElement>) => {
    const { queue, startId } = circleQueue(groups, gi, seen)
    const first = groups[gi].items.find((it) => it.id === startId) ?? groups[gi].items[0]
    openStory({ id: startId, href: first.href, opener: e.currentTarget, queue })
  }
  const moreHref = (key: string) => (key === 'soon' ? '/matches?sort=time' : key === 'top' ? null : `/tag/${key}`)

  return (
    <div className="relative h-full overflow-hidden rounded-card bg-panel">
      {/* свёрнута — полоска: «развернуть» и значки подборок (тап — сторис подборки) */}
      <div className="shell-r-rail scrollbar-none h-full flex-col items-center gap-2 overflow-y-auto py-3">
        <PanelToggle side="r" open={false} />
        {groups.map((g, gi) => (
          <button
            key={g.key}
            type="button"
            onClick={(e) => play(gi, e)}
            title={`${g.label}: смотреть разбор`}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[0.06] transition-colors hover:bg-white/[0.12]"
          >
            <StorySymbol k={g.key} tone="currentColor" className="h-5 w-5" />
          </button>
        ))}
      </div>

      <div className="shell-r-full flex h-full flex-col">
        <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto p-4">
          <h2 className="flex items-center justify-between text-[15px] font-semibold">
            Подборки дня
            <PanelToggle side="r" open />
          </h2>
          {groups.length ? (
            <ul className="mt-2 space-y-0.5">
              {groups.map((g, gi) => {
                // первые SHOWN — сразу, остальные — под «Ещё N» (владелец: список без иерархии не помещался в экран)
                if (fold && gi >= SHOWN && !all) return null
                const on = open === g.key
                const more = moreHref(g.key)
                return (
                  <li key={g.key}>
                    <div className={`group -mx-2 flex items-center gap-1 rounded-tile pr-2 transition-colors ${on ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'}`}>
                      {/* значок подборки; при наведении на строку на его месте белая ▶ — смотреть разбор, как у Spotify
                          (14 белых кнопок разом были ярче всего на странице) */}
                      <button
                        type="button"
                        onClick={(e) => play(gi, e)}
                        aria-label={`${g.label}: смотреть разбор матчей`}
                        title="Смотреть разбор"
                        className="relative my-1.5 ml-2 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.06]"
                      >
                        <StorySymbol k={g.key} tone="currentColor" className="h-[18px] w-[18px] transition-opacity group-hover:opacity-0 group-focus-within:opacity-0" />
                        <span className="absolute inset-0 grid place-items-center rounded-full bg-white text-ink opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                          <Play className="ml-0.5 h-3.5 w-3.5" />
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpen(on ? null : g.key)}
                        aria-expanded={on}
                        className="flex min-w-0 flex-1 items-center gap-3 self-stretch pl-2 text-left"
                      >
                        <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium">{g.label}</span>
                        <span className="num text-[13px] text-mute">{totals[g.key] ?? g.items.length}</span>
                        {/* шеврон справа — видно, что строка раскрывается */}
                        <svg
                          viewBox="0 0 24 24"
                          aria-hidden
                          className={`h-4 w-4 shrink-0 text-mute transition-transform duration-200 ${on ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                    </div>
                    {on ? (
                      <div className="pb-2 pt-1">
                        {g.items.map((it) => {
                          const m = matches[it.id]
                          if (!m) return null
                          return (
                            <a
                              key={it.id}
                              href={m.href}
                              onClick={(e) => {
                                if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
                                e.preventDefault()
                                openStory({ id: it.id, href: m.href, opener: e.currentTarget, queue: circleQueue(groups, gi, seen).queue })
                              }}
                              className="-mx-2 flex items-center gap-2.5 rounded-tile px-2 py-1.5 transition-colors hover:bg-white/[0.05]"
                            >
                              <span className="flex shrink-0 -space-x-2">
                                {[m.home, m.away].map((t) => (
                                  <span key={t.id} className="grid h-7 w-7 place-items-center rounded-full bg-panel-3 ring-2 ring-panel">
                                    <TeamLogo name={t.name} src={t.logo} size={18} />
                                  </span>
                                ))}
                              </span>
                              <span className="min-w-0 flex-1 text-[13px] leading-tight">
                                <span className="block truncate">{m.home.name}</span>
                                <span className="block truncate">{m.away.name}</span>
                              </span>
                              <Right m={m} stat={stats[`${g.key}:${it.id}`]} hot={g.key === 'progruz'} />
                            </a>
                          )
                        })}
                        {more && (totals[g.key] ?? 0) > 0 ? (
                          <Link href={more} prefetch={false} className="mt-1 inline-block px-0 text-[13px] font-medium text-dim transition-colors hover:text-fg">
                            Все {totals[g.key]} →
                          </Link>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                )
              })}
              {fold ? (
                <li>
                  <button
                    type="button"
                    onClick={() => setAll((v) => !v)}
                    className="-mx-2 mt-1 flex w-[calc(100%+1rem)] items-center gap-3 rounded-tile px-2 py-2 text-left text-[13.5px] font-medium text-dim transition-colors hover:bg-white/[0.04] hover:text-fg"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center">
                      <svg viewBox="0 0 24 24" aria-hidden className={`h-4 w-4 transition-transform ${all ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </span>
                    {all ? 'Свернуть' : `Ещё ${groups.length - SHOWN}`}
                  </button>
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="mt-2 text-[13.5px] text-dim">Подборки появятся, когда будут матчи дня.</p>
          )}
        </div>
      </div>
    </div>
  )
}
