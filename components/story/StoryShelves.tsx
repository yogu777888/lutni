'use client'

import { useEffect, useState } from 'react'
import type { StoryGroup } from '@/lib/story-groups'
import type { Match } from '@/lib/types'
import { LiveCardBody, MatchCardBody, PosterCardBody, StatCardBody } from '../MatchCard'
import { SHELF_BASE, SHELF_W, Shelf } from '../Shelf'
import { openStory } from './events'
import { circleQueue } from './queue'
import { readSeen, SEEN_EVENT, seenKey } from './seen'
import { discBackground, StorySymbol, symbolColor } from './StorySymbol'

/**
 * Истории дня — полками, как «Скоро начнутся» (владелец: «чтобы всё в одном стиле»): «В игре» с идущими матчами,
 * «Топ дня» с его матчами, дальше по полке на тег. Заголовок — со знаком истории, карточки — матчи с «обложкой» из
 * эмблем, под ней матч и страна с турниром — как на всех полках (повод, почему матч в истории, — внутри сторис). Клик по карточке открывает сторис с этого
 * матча, дальше — остальные матчи истории и следующие истории (та же очередь, что была у кружков); просмотренные
 * в этой истории карточки — с отметкой «✓ Просмотрено». Без JS карточка — обычная ссылка на страницу матча.
 */
export function StoryShelves({
  groups,
  show,
  matches,
  more,
  stats = {},
}: {
  /** все истории по порядку — для очереди просмотра */
  groups: StoryGroup[]
  /** какие из них показать здесь полками (ключи) */
  show: string[]
  /** матчи историй по id */
  matches: Record<number, Match>
  /** «Показать все» у полки по ключу истории */
  more: Record<string, string | undefined>
  /** главная цифра матча в истории (`statFor`) по ключу «история:матч» — метка в углу обложки */
  stats?: Record<string, string>
}) {
  const [seen, setSeen] = useState<Set<string>>(() => new Set())
  useEffect(() => {
    const update = () => setSeen(readSeen())
    update()
    window.addEventListener(SEEN_EVENT, update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener(SEEN_EVENT, update)
      window.removeEventListener('storage', update)
    }
  }, [])

  const open = (gi: number, id: number, e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    const { queue } = circleQueue(groups, gi, seen)
    openStory({ id, href: e.currentTarget.href, opener: e.currentTarget, queue })
  }

  return (
    <>
      {groups.map((g, gi) => {
        if (!show.includes(g.key)) return null
        const items = g.items.filter((it) => matches[it.id]).slice(0, 12)
        if (!items.length) return null
        return (
          <Shelf
            key={g.key}
            title={g.label}
            icon={
              <span aria-hidden className="story-disc grid h-8 w-8 shrink-0 place-items-center rounded-full" style={{ background: discBackground(symbolColor(g.key)) }}>
                <StorySymbol k={g.key} tone="#ffffff" className="h-[58%] w-[58%]" />
              </span>
            }
            more={more[g.key] ? { href: more[g.key]! } : undefined}
          >
            {items.map((it) => {
              const m = matches[it.id]
              const isSeen = seen.has(seenKey(g.key, it.id))
              const stat = stats[`${g.key}:${it.id}`]
              // у каждой полки свой вид карточек (владелец: «блоки игр в подборках все одинаково выглядят»)
              const kind = g.key === 'top' ? 'poster' : g.key === 'live' ? 'live' : stat ? 'stat' : 'cover'
              return (
                <a
                  key={it.id}
                  href={it.href}
                  onClick={(e) => open(gi, it.id, e)}
                  className={`${SHELF_BASE} ${kind === 'poster' ? SHELF_W.poster : SHELF_W.card} group ${kind === 'live' || kind === 'stat' ? 'p-4' : 'gap-3 p-3'} transition-colors hover:bg-panel-3`}
                >
                  {kind === 'live' ? (
                    <LiveCardBody m={m} seen={isSeen} />
                  ) : kind === 'poster' ? (
                    <PosterCardBody m={m} seen={isSeen} />
                  ) : kind === 'stat' ? (
                    <StatCardBody m={m} stat={stat} hot={g.key === 'progruz'} seen={isSeen} />
                  ) : (
                    <MatchCardBody m={m} sub={m.league.name} seen={isSeen} />
                  )}
                </a>
              )
            })}
          </Shelf>
        )
      })}
    </>
  )
}
