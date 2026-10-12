'use client'

import { useEffect, useState } from 'react'
import { formatTime } from '@/lib/format'
import type { StoryGroup } from '@/lib/story-groups'
import type { Match } from '@/lib/types'
import { Tick } from './Live'
import { TeamLogo } from './TeamLogo'
import { openStory } from './story/events'
import { circleQueue } from './story/queue'
import { readSeen, SEEN_EVENT } from './story/seen'
import { ShelfIcon } from './story/StorySymbol'
import { Shelf } from './Shelf'

/**
 * Подпись простыми словами: технический повод тега «Выгодно» («Победа «X» за 2.73 (Winline) при честной цене 2.53:
 * выгода +8.1%») — коротко «Выгодно: победа «X», +8%» (владелец: «текст плохо читается, грязно»). Остальное — как есть.
 */
function plainFact(t: string): string {
  const v = /^(.+?) за [\d.]+ \([^)]*\) при честной цене [\d.]+: выгода \+([\d.,]+)%/.exec(t)
  if (v) return `Выгодно: ${v[1].charAt(0).toLowerCase()}${v[1].slice(1)}, +${Math.round(Number(v[2].replace(',', '.')))}%`
  return t
}

const live = (m: Match) => m.status === 'live' || m.status === 'suspended'
type Tint = { home: string; away: string }

/** Команда на карточке: эмблема на светлом круге (настоящий размер эмблемы — чёткая) и название под ней. */
function Team({ t, dim }: { t: Match['home']; dim: boolean }) {
  return (
    <span className={`flex min-w-0 flex-col items-center gap-2 text-center ${dim ? 'opacity-60' : ''}`}>
      <span className="grid h-[68px] w-[68px] place-items-center rounded-full bg-white/[0.14] ring-1 ring-white/15 transition-transform duration-300 group-hover:scale-105">
        <TeamLogo name={t.name} src={t.logo} size={46} />
      </span>
      <span className="line-clamp-2 w-full text-balance text-[15px] font-semibold leading-tight">{t.name}</span>
    </span>
  )
}

/**
 * Карточка-сторис: турнир и время / LIVE с минутой, эмблемы и названия, счёт; внизу — факт, ради которого матч стоит
 * открыть («Обе забивали в 70% последних матчей команд»), и кэфы. Вся карточка — переход: клик открывает сторис.
 */
function Card({
  m,
  href,
  fact,
  tint,
  onOpen,
}: {
  m: Match
  href: string
  fact: string | null
  tint: Tint | null
  onOpen: (e: React.MouseEvent<HTMLAnchorElement>) => void
}) {
  const played = Boolean(m.score) && (live(m) || m.status === 'finished')
  const lead = played && m.score!.home !== m.score!.away ? (m.score!.home > m.score!.away ? 'home' : 'away') : null
  return (
    <a href={href} onClick={onOpen} className="group flex w-[82%] shrink-0 snap-start flex-col sm:w-[290px]">
      <span
        className="card flex flex-1 flex-col p-4 transition-colors group-hover:bg-panel-3"
        // мягкий свет цветами клубов сверху: слева хозяева, справа гости (владелец: «все карточки одинаково серые»)
        style={
          tint
            ? {
                backgroundImage: `radial-gradient(80% 65% at 0% 0%, color-mix(in oklab, ${tint.home} 42%, transparent), transparent 75%), radial-gradient(80% 65% at 100% 0%, color-mix(in oklab, ${tint.away} 42%, transparent), transparent 75%)`,
              }
            : undefined
        }
      >
        <span className="flex items-center justify-between gap-3 text-[13px]">
          <span className="flex min-w-0 items-center gap-1.5 text-dim">
            <span aria-hidden className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-ink">
              <svg viewBox="0 0 24 24" className="ml-px h-2.5 w-2.5" fill="currentColor">
                <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" />
              </svg>
            </span>
            <span className="truncate">{m.league.name}</span>
          </span>
          {live(m) ? (
            <span className="flex shrink-0 items-center gap-1.5 font-semibold text-live">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
              {m.statusCode === 4 ? 'перерыв' : m.elapsed ? `${m.elapsed}′` : 'LIVE'}
            </span>
          ) : m.status === 'finished' ? (
            <span className="shrink-0 text-mute">итог</span>
          ) : null}
        </span>

        <span className="mt-4 grid grid-cols-[1fr_auto_1fr] items-start gap-2">
          <Team t={m.home} dim={lead === 'away'} />
          <span className="flex h-[68px] items-center">
            {played ? (
              <span className="num display-num whitespace-nowrap text-[30px] leading-none text-white">
                <Tick v={m.score!.home} />
                <span className="mx-0.5 text-mute">:</span>
                <Tick v={m.score!.away} />
              </span>
            ) : (
              <span className="num display-num text-[26px] leading-none">{formatTime(m.ts)}</span>
            )}
          </span>
          <Team t={m.away} dim={lead === 'home'} />
        </span>

      </span>
      {/* факт — под карточкой, подписью, как название под обложкой (владелец: «факт о матче выносить под матч») */}
      {fact ? (
        <span className="mt-3 line-clamp-2 h-[2.8em] px-1 text-[14.5px] leading-snug text-fg/85 first-letter:uppercase transition-colors group-hover:text-white">
          {plainFact(fact)}
        </span>
      ) : null}
    </a>
  )
}

/** Сколько карточек в ряду категории; дальше — «Показать все». */
const LIMIT = 12

/**
 * Матчи дня по категориям (владелец: «вернуть категории текстом и чтоб матчи были в один ряд»; сетка с кнопками-
 * фильтрами выглядела как сортировка, которой нет): заголовок категории («В игре», «Топ дня», «Скоро», теги дня) со
 * значком и числом матчей, «Показать все», под ним один ряд карточек вбок. Карточка — сторис: клик открывает разбор
 * с этого матча и дальше по категории. Под карточкой — факт, ради которого матч в категории.
 */
export function MatchGrid({
  groups,
  matches,
  facts,
  tints: initialTints,
  more,
  ymd,
}: {
  /** категории по порядку: «В игре», «Топ дня», «Скоро», теги дня */
  groups: StoryGroup[]
  matches: Record<number, Match>
  /** самый яркий факт матча — если у категории нет своего повода */
  facts: Record<number, string>
  /** цвета клубов, что сервер успел посчитать; остальные догружаем одним запросом */
  tints: Record<number, Tint>
  /** «Показать все» у категории */
  more: Record<string, string | undefined>
  ymd: string
}) {
  const [tints, setTints] = useState(initialTints)
  const [seen, setSeen] = useState<Set<string>>(() => new Set())
  useEffect(() => {
    const update = () => setSeen(readSeen())
    update()
    window.addEventListener(SEEN_EVENT, update)
    return () => window.removeEventListener(SEEN_EVENT, update)
  }, [])

  const shown = groups.filter((g) => g.items.some((it) => matches[it.id]))
  const rows = shown.map((g) => ({ g, items: g.items.filter((it) => matches[it.id]).slice(0, LIMIT) }))

  // цвета, которые сервер не успел посчитать (эмблемы с чужого сервера), — одним запросом
  const missingKey = [...new Set(rows.flatMap((r) => r.items.map((it) => it.id)))]
    .filter((id) => !tints[id])
    .slice(0, 60)
    .join(',')
  useEffect(() => {
    if (!missingKey) return
    let stop = false
    // эмблемы считаются на сервере не сразу (чужой сервер картинок, холодный кэш) — спрашиваем ещё, до 4 раз через 3 с
    const ask = (left: number) =>
      fetch(`/api/tint?ids=${missingKey}&d=${ymd}`)
        .then((r) => r.json())
        .then((d: { tints?: Record<number, Tint> }) => {
          if (stop) return
          const got = d.tints ?? {}
          if (Object.keys(got).length) setTints((t) => ({ ...t, ...got }))
          if (Object.keys(got).length < missingKey.split(',').length && left > 0) setTimeout(() => !stop && ask(left - 1), 3000)
        })
        .catch(() => left > 0 && setTimeout(() => !stop && ask(left - 1), 3000))
    ask(4)
    return () => {
      stop = true
    }
  }, [missingKey, ymd])

  const open = (gi: number, id: number, e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    openStory({ id, href: e.currentTarget.href, opener: e.currentTarget, queue: circleQueue(shown, gi, seen).queue })
  }

  return (
    <>
      {rows.map(({ g, items }, gi) => (
        <Shelf
          key={g.key}
          title={
            <>
              {g.label}
              <span className="font-sans text-[15px] font-medium normal-case tracking-normal text-mute">{g.items.length}</span>
            </>
          }
          icon={<ShelfIcon k={g.key} />}
          more={more[g.key] ? { href: more[g.key]! } : undefined}
        >
          {items.map((it) => (
            <Card
              key={it.id}
              m={matches[it.id]}
              href={it.href}
              fact={it.focus?.reason ?? facts[it.id] ?? null}
              tint={tints[it.id] ?? null}
              onOpen={(e) => open(gi, it.id, e)}
            />
          ))}
        </Shelf>
      ))}
    </>
  )
}
