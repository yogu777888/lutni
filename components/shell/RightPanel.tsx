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

/** Значок Telegram (бумажный самолётик) — одним цветом. */
function TgIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M21.4 4.3 2.9 11.5c-1.3.5-1.3 1.2-.2 1.6l4.7 1.5 1.8 5.6c.2.6.1.8.8.8.5 0 .7-.2 1-.5l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.7c.3-1.3-.5-1.9-1.4-1.5ZM8.9 14.2l9.4-5.9c.4-.3.9-.1.5.2l-8 7.3-.3 3.3-1.6-4.9Z" />
    </svg>
  )
}

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
 * матчи строками (эмблемы, команды, главная цифра / время / счёт) и «Все N матчей →» (страница тега). Внизу —
 * компактная карточка «Войти через Telegram» (входа пока нет — «Скоро»). Свёрнута — полоска со значками подборок.
 */
export function RightPanel({ picks }: { picks: DayPicks }) {
  const [open, setOpen] = useState<string | null>(null)
  const [soon, setSoon] = useState(false)
  const [seen, setSeen] = useState<Set<string>>(() => new Set())
  useEffect(() => {
    const update = () => setSeen(readSeen())
    update()
    window.addEventListener(SEEN_EVENT, update)
    return () => window.removeEventListener(SEEN_EVENT, update)
  }, [])

  const { groups, matches, stats, totals } = picks
  const play = (gi: number, e: React.MouseEvent<HTMLButtonElement>) => {
    const { queue, startId } = circleQueue(groups, gi, seen)
    const first = groups[gi].items.find((it) => it.id === startId) ?? groups[gi].items[0]
    openStory({ id: startId, href: first.href, opener: e.currentTarget, queue })
  }
  const moreHref = (key: string) => (key === 'live' ? '/matches' : key === 'soon' ? '/matches?sort=time' : key === 'top' ? null : `/tag/${key}`)

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
                const on = open === g.key
                const more = moreHref(g.key)
                return (
                  <li key={g.key}>
                    <div className={`-mx-2 flex items-center gap-1 rounded-tile pr-1.5 transition-colors ${on ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'}`}>
                      <button
                        type="button"
                        onClick={() => setOpen(on ? null : g.key)}
                        aria-expanded={on}
                        className="flex min-w-0 flex-1 items-center gap-3 py-2 pl-2 text-left"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.06]">
                          <StorySymbol k={g.key} tone="currentColor" className="h-[18px] w-[18px]" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium">{g.label}</span>
                        <span className="text-[13px] text-mute">{totals[g.key] ?? g.items.length}</span>
                        <span aria-hidden className={`text-[11px] text-mute transition-transform ${on ? 'rotate-180' : ''}`}>
                          ▾
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => play(gi, e)}
                        aria-label={`${g.label}: смотреть разбор матчей`}
                        title="Смотреть разбор"
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-ink transition-transform hover:scale-105"
                      >
                        <Play className="ml-0.5 h-3.5 w-3.5" />
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
            </ul>
          ) : (
            <p className="mt-2 text-[13.5px] text-dim">Подборки появятся, когда будут матчи дня.</p>
          )}
        </div>

        {/* вход — компактной карточкой внизу (входа пока нет — бэкенд следующим шагом) */}
        <div className="m-3 mt-0 rounded-tile bg-[linear-gradient(150deg,#7fb21a_0%,#1f9b7a_50%,#1f5f9e_100%)] p-4 text-white">
          <p className="text-[15px] font-semibold leading-snug">Следи за своими командами</p>
          <p className="mt-1 text-[12.5px] leading-snug text-white/80">Избранное на всех устройствах и напоминания о матчах</p>
          <button
            type="button"
            onClick={() => setSoon(true)}
            className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-white text-[14px] font-semibold text-[#0b0f14] transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <TgIcon className="h-4 w-4 text-[#229ed9]" />
            Войти через Telegram
          </button>
          <p className="mt-2 text-center text-[12px] text-white/75" aria-live="polite">
            {soon ? 'Скоро — уже делаем вход' : 'Бесплатно, без пароля'}
          </p>
        </div>
      </div>
    </div>
  )
}
