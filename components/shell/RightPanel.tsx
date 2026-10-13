'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { CompactMatch } from '@/lib/compact'
import type { DayPicks, ValueRow } from '@/lib/day-picks'
import { goHref, SPONSORED_REL } from '@/lib/affiliate'
import { TeamLogo } from '../TeamLogo'
import { openStory } from '../story/events'
import { circleQueue } from '../story/queue'
import { readSeen, SEEN_EVENT } from '../story/seen'
import { StorySymbol } from '../story/StorySymbol'
import { pluralN } from '@/lib/format'
import { PanelToggle } from './PanelToggle'
import { useRailTip } from './RailTip'
import { StateLine } from './StateLine'
import { StoryRing } from './StoryRing'

const BETS = ['ставка', 'ставки', 'ставок'] as const

const Play = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" />
  </svg>
)

/**
 * Справа в строке матча — одно правило (владелец согласился: в «Топ дня» стояли «1·4», «8», «+7» без подписи): сверху —
 * главная цифра подборки (только у подборок-тегов: «−17%»), без неё — счёт или время; ниже мелко — состояние:
 * минута красным / «итог» / время начала. Одинокой красной точки рядом с цифрой нет — она читалась частью сигнала.
 */
function Right({ m, stat, hot }: { m: CompactMatch; stat?: string; hot: boolean }) {
  const score = m.score ? `${m.score[0]}:${m.score[1]}` : ''
  const top = stat ?? (m.live || m.finished ? score : m.time)
  const topTone = stat ? (hot ? 'text-hot' : 'text-fg') : m.live ? 'text-fg' : 'text-dim'
  const state = m.live ? m.minute : m.finished ? 'итог' : stat ? m.time : null
  return (
    <span className="num shrink-0 text-right leading-tight">
      <span className={`block text-[13px] font-semibold ${topTone}`}>{top}</span>
      {state ? <span className={`block text-[11.5px] font-medium ${m.live ? 'text-live' : 'text-mute'}`}>{state}</span> : null}
    </span>
  )
}

/**
 * Правая панель каркаса (от xl) — «Подборки дня» (владелец: «в центре просто матчи по лигам, а сортированные — в
 * боковой виджет; название, рядом кнопка просмотра историй, снизу раскрытие матчей»): строка подборки — знак, название,
 * число матчей и белая ▶ (сторис по всей подборке подряд, с первого непросмотренного); клик по названию раскрывает
 * матчи строками (эмблемы, команды, главная цифра / время / счёт) и «Все N матчей →» (страница тега).
 * Свёрнута — полоска со значками подборок.
 */
/**
 * «Выгодно сегодня» внизу панели (владелец согласился: блок ушёл из центра, а нижняя половина панели пустовала):
 * до трёх лучших выгодных ставок дня — матч, исход словами и лаймовый кэф партнёра; кэф — ссылка к букмекеру
 * (`goHref(…, 'panel')`, rel=sponsored), пометка «Реклама» — в заголовке; внизу «Все выгодные →» (/tag/value).
 */
function ValueBlock({ rows }: { rows: ValueRow[] }) {
  if (!rows.length) return null
  return (
    <section className="mt-6 border-t border-edge pt-4">
      <h3 className="flex items-baseline justify-between text-[15px] font-semibold">
        Выгодно сегодня
        <span className="text-[11.5px] font-normal text-mute">Реклама · 18+</span>
      </h3>
      <ul className="mt-2 space-y-1">
        {rows.map((r) => (
          <li key={r.id} className="-mx-2 flex items-center gap-3 rounded-tile px-2 py-1.5 transition-colors hover:bg-white/[0.04]">
            {/* эмблемы внахлёст в круге 36px — как значки подборок выше: у всех строк панели слева круг */}
            <span aria-hidden className="relative h-9 w-9 shrink-0 rounded-full bg-white/[0.06]">
              <span className="absolute left-1 top-1">
                <TeamLogo name={r.home} src={r.homeLogo} size={16} />
              </span>
              <span className="absolute bottom-1 right-1">
                <TeamLogo name={r.away} src={r.awayLogo} size={16} />
              </span>
            </span>
            {/* главное — на что ставка (сверху, белым, в узкой панели — в две строки, не обрезаем); матч и время — ниже серым: обрезается второстепенное */}
            <Link href={r.href} prefetch={false} className="min-w-0 flex-1 leading-tight">
              <span className="line-clamp-2 text-[13.5px] font-medium first-letter:uppercase">{r.outcome}</span>
              {/* букмекер — здесь, а не в плашке: плашка — такая же ячейка, как лаймовая в списке */}
              <span className="mt-0.5 block truncate text-[12.5px] text-dim">
                {r.bookmaker} · {r.time} · {r.home} — {r.away}
              </span>
            </Link>
            <a
              href={goHref(r.slug, 'panel', r.id)}
              target="_blank"
              rel={SPONSORED_REL}
              title={`${r.outcome}: ${r.odd.toFixed(2)} в ${r.bookmaker}${r.ev ? ` — выгода +${Math.round(r.ev * 100)}%` : ''} · Реклама 18+`}
              // как лаймовая ячейка кэфа в строке списка (34px, 15px): три высоких плашки с букмекером были ярче всего на странице
              className="num grid h-[34px] w-14 shrink-0 place-items-center rounded-ctl bg-acid text-[15px] font-semibold text-acid-ink transition-colors hover:bg-acid/85"
            >
              {r.odd.toFixed(2)}
            </a>
          </li>
        ))}
      </ul>
      <Link href="/tag/value" prefetch={false} className="mt-2 inline-block text-[13px] font-medium text-dim transition-colors hover:text-fg">
        Все выгодные →
      </Link>
    </section>
  )
}

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

  const { groups, matches, stats, totals, states } = picks
  const { tipProps, tipNode } = useRailTip('r', 'shell-r-rail')
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
      <div className="shell-r-rail scrollbar-none h-full flex-col items-center gap-3 overflow-y-auto py-3">
        <PanelToggle side="r" open={false} />
        {/* значки — круги 36px, как флаги в левой полоске; подсказка — название, число матчей и что внутри, клик — разбор */}
        {groups.map((g, gi) => (
          <button
            key={g.key}
            type="button"
            onClick={(e) => play(gi, e)}
            {...tipProps(
              g.label,
              states[g.key] ? (
                <>
                  <StateLine total={totals[g.key] ?? g.items.length} {...states[g.key]} /> · нажмите — разбор
                </>
              ) : (
                'Нажмите — разбор'
              ),
            )}
            className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.06] transition-colors hover:bg-white/[0.12]"
          >
            <StorySymbol k={g.key} tone="currentColor" className="h-[18px] w-[18px]" />
            <StoryRing group={g.key} ids={g.items.map((it) => it.id)} seen={seen} />
          </button>
        ))}
        {/* «Выгодно сегодня» не пропадает целиком: лаймовый круг со знаком процента внизу (лайм — деньги и «выгодно») */}
        {picks.values.length ? (
          <>
            <span aria-hidden className="my-1 h-px w-6 shrink-0 bg-edge" />
            <Link
              href="/tag/value"
              prefetch={false}
              {...tipProps(`Выгодно сегодня · ${pluralN(picks.values.length, BETS)}`, 'Кэф выше честной цены · Реклама 18+')}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-acid text-acid-ink transition-colors hover:bg-acid/85"
            >
              <StorySymbol k="value" tone="currentColor" className="h-[18px] w-[18px]" />
            </Link>
          </>
        ) : null}
      </div>
      {tipNode}

      <div className="shell-r-full flex h-full flex-col">
        <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto p-4">
          <h2 className="sticky -top-4 z-10 -mx-4 -mt-4 flex items-center justify-between bg-panel px-4 pb-2 pt-4 text-[15px] font-semibold after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-4 after:bg-linear-to-b after:from-panel after:to-transparent after:content-['']">
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
                  // раскрытая подборка — одной плашкой: заголовок, матчи и ссылка на общем фоне (иначе матчи сливались со строками подборок ниже)
                  <li key={g.key} className={on ? '-mx-2 rounded-tile bg-white/[0.05] px-2 pb-1' : ''}>
                    <div className={`group -mx-2 flex items-center gap-1 rounded-tile pr-2 transition-colors ${on ? '' : 'hover:bg-white/[0.04]'}`}>
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
                        {/* кольцо, как вокруг сторис: непросмотренные матчи подборки — лайм, просмотренные — серые */}
                        <StoryRing group={g.key} ids={g.items.map((it) => it.id)} seen={seen} />
                        {/* точки «идёт» на значках подборок нет: при многих идущих их было шесть подряд; «3 в игре» — в подписи,
                            а сигнал «идёт» — в центре и у турниров слева (владелец согласился) */}
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpen(on ? null : g.key)}
                        aria-expanded={on}
                        className="flex min-w-0 flex-1 items-center gap-3 self-stretch pl-2 text-left"
                      >
                        {/* название само объясняет подборку («Аутсайдер в форме», а не «Может удивить»), под ним — что с её матчами
                            сейчас, как у турниров слева (`StateLine`): статичное описание повторяло название (владелец согласился) */}
                        <span className="min-w-0 flex-1 leading-tight">
                          <span className="block truncate text-[14.5px] font-medium">{g.label}</span>
                          {states[g.key] ? (
                            <span className="mt-0.5 block truncate text-[12.5px] text-mute">
                              <StateLine total={totals[g.key] ?? g.items.length} {...states[g.key]} />
                            </span>
                          ) : null}
                        </span>
                        {/* шеврон — только у раскрытой и при наведении: восемь одинаковых шевронов повторяли одно и то же */}
                        <svg
                          viewBox="0 0 24 24"
                          aria-hidden
                          className={`h-4 w-4 shrink-0 text-mute transition-[transform,opacity] duration-200 ${on ? 'rotate-180' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'}`}
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
                      <div className="pb-2">
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
                        {/* «Все 12 →» — только если показаны не все; иначе — на страницу подборки («Все 4 →» при четырёх видимых обещал больше) */}
                        {more ? (
                          <Link href={more} prefetch={false} className="mt-1 inline-block text-[13px] font-medium text-dim transition-colors hover:text-fg">
                            {(totals[g.key] ?? 0) > g.items.length ? `Все ${totals[g.key]} →` : 'Открыть подборку →'}
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
          <ValueBlock rows={picks.values} />
        </div>
      </div>
    </div>
  )
}
