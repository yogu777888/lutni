'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { formatTime } from '@/lib/format'
import type { StoryGroup } from '@/lib/story-groups'
import type { Match } from '@/lib/types'
import { Tick } from './Live'
import { TeamLogo } from './TeamLogo'
import { openStory } from './story/events'
import { circleQueue } from './story/queue'
import { readSeen, SEEN_EVENT } from './story/seen'
import { StorySymbol } from './story/StorySymbol'

const live = (m: Match) => m.status === 'live' || m.status === 'suspended'
/** Сколько карточек в сетке у одного фильтра; дальше — «Все матчи дня» на странице «Матчи». */
const LIMIT = 24

/** Ключ фильтра «Все» — матчи всех историй по порядку, без повторов. */
const ALL = 'all'

/** Главная кнопка-фильтр: значок истории, подпись и число матчей; выбранная — светлее и с белой рамкой. */
function Chip({ k, label, n, on, onClick }: { k: string; label: string; n: number; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`flex h-[84px] w-[104px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-tile px-2 text-center transition-colors ${on ? 'bg-white/[0.12] ring-2 ring-white/80' : 'bg-panel-2 hover:bg-panel-3'}`}
    >
      {k === ALL ? (
        <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6" fill="currentColor">
          <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2" />
          <rect x="13" y="3.5" width="7.5" height="7.5" rx="2" />
          <rect x="3.5" y="13" width="7.5" height="7.5" rx="2" />
          <rect x="13" y="13" width="7.5" height="7.5" rx="2" />
        </svg>
      ) : (
        <StorySymbol k={k} tone="currentColor" className="h-6 w-6" />
      )}
      <span className="w-full truncate text-[13px] font-medium leading-none">{label}</span>
      <span className="sr-only">: {n}</span>
    </button>
  )
}

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
function Card({ m, href, fact, onOpen }: { m: Match; href: string; fact: string | null; onOpen: (e: React.MouseEvent<HTMLAnchorElement>) => void }) {
  const played = Boolean(m.score) && (live(m) || m.status === 'finished')
  const lead = played && m.score!.home !== m.score!.away ? (m.score!.home > m.score!.away ? 'home' : 'away') : null
  const x = m.odds?.x12
  const odds = x?.home && x.draw && x.away && m.status === 'scheduled' ? [x.home.value, x.draw.value, x.away.value] : null
  return (
    <a href={href} onClick={onOpen} className="card group flex flex-col p-4 transition-colors hover:bg-panel-3">
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
        ) : (
          <span className="num shrink-0 font-semibold">{m.status === 'finished' ? 'итог' : formatTime(m.ts)}</span>
        )}
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
            <span aria-hidden className="h-8 w-px bg-white/15" />
          )}
        </span>
        <Team t={m.away} dim={lead === 'home'} />
      </span>

      <span className="mt-auto block pt-4">
        {fact ? <span className="line-clamp-2 text-[13.5px] leading-snug text-fg/80 first-letter:uppercase">{fact}</span> : null}
        {odds ? (
          <span className="mt-3 grid grid-cols-3 gap-1.5 text-center">
            {(['Хозяева', 'Ничья', 'Гости'] as const).map((l, i) => (
              <span key={l} className="rounded-ctl bg-white/[0.05] px-1 py-1.5">
                <span className="block text-[11.5px] leading-none text-mute">{l}</span>
                <span className="num mt-1 block text-[14px] font-semibold leading-none">{odds[i].toFixed(2)}</span>
              </span>
            ))}
          </span>
        ) : null}
      </span>
    </a>
  )
}

/**
 * Матчи дня сеткой с фильтрами (идея владельца, сделанная в ChatGPT: «матч = сторис», одна сетка вместо десятка
 * полок): ряд кнопок-фильтров («Все», «В игре», «Топ дня», «Скоро», теги дня) и под ним карточки по 3 в ряд.
 * Фильтр меняет сетку на месте; факт в карточке — повод этой истории (у «Все» — самый яркий факт матча). Клик —
 * сторис с этого матча и дальше по очереди выбранной истории.
 */
export function MatchGrid({
  groups,
  matches,
  facts,
  listHref,
}: {
  /** истории дня по порядку (и псевдо-история «Скоро начнутся») */
  groups: StoryGroup[]
  matches: Record<number, Match>
  /** самый яркий факт матча — для фильтра «Все» */
  facts: Record<number, string>
  listHref: string
}) {
  const [key, setKey] = useState(ALL)
  const [seen, setSeen] = useState<Set<string>>(() => new Set())
  useEffect(() => {
    const update = () => setSeen(readSeen())
    update()
    window.addEventListener(SEEN_EVENT, update)
    return () => window.removeEventListener(SEEN_EVENT, update)
  }, [])

  const shown = groups.filter((g) => g.items.some((it) => matches[it.id]))
  const gi = shown.findIndex((g) => g.key === key)
  const group = gi >= 0 ? shown[gi] : null
  const all: { id: number; href: string; fact: string | null }[] = []
  if (!group) {
    const ids = new Set<number>()
    for (const g of shown)
      for (const it of g.items)
        if (matches[it.id] && !ids.has(it.id)) {
          ids.add(it.id)
          all.push({ id: it.id, href: it.href, fact: facts[it.id] ?? null })
        }
  }
  const cards = (group ? group.items.filter((it) => matches[it.id]).map((it) => ({ id: it.id, href: it.href, fact: it.focus?.reason ?? facts[it.id] ?? null })) : all).slice(
    0,
    LIMIT,
  )

  const open = (id: number, e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    const queue = group ? circleQueue(shown, gi, seen).queue : undefined
    openStory({ id, href: e.currentTarget.href, opener: e.currentTarget, queue })
  }

  return (
    <section aria-label="Матчи дня" className="mt-10">
      <div className="scrollbar-none -mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <Chip k={ALL} label="Все" n={all.length} on={!group} onClick={() => setKey(ALL)} />
        {shown.map((g) => (
          <Chip key={g.key} k={g.key} label={g.label} n={g.items.length} on={group?.key === g.key} onClick={() => setKey(g.key)} />
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[repeat(auto-fill,minmax(270px,1fr))]">
        {cards.map((c) => (
          <Card key={c.id} m={matches[c.id]} href={c.href} fact={c.fact} onOpen={(e) => open(c.id, e)} />
        ))}
      </div>

      <div className="mt-5 flex justify-center">
        <Link href={listHref} prefetch={false} className="inline-flex h-11 items-center rounded-full bg-white/[0.08] px-5 text-[14px] font-semibold transition-colors hover:bg-white/[0.14]">
          Все матчи дня →
        </Link>
      </div>
    </section>
  )
}
