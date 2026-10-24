'use client'

import { useEffect, useState } from 'react'
import { useFavorites } from './favorites'
import { Tick } from './Live'
import { StoryLink } from './story/StoryLink'
import { TeamLogo } from './TeamLogo'

type Item = {
  id: number
  href: string
  league: string
  home: { name: string; logo: string | null }
  away: { name: string; logo: string | null }
  time: string
  live: boolean
  finished: boolean
  minute: string | null
  score: [number, number] | null
}

/**
 * «Ваши команды» — матчи избранных команд (звёздочка на странице матча) первыми в «Все матчи дня». Избранное —
 * в браузере, матчи — /api/favorites за выбранный день, обновляются раз в минуту. Нет избранных — блока нет;
 * команды в этот день не играют — одна тихая строка.
 */
export function FavMatches({ ymd }: { ymd: string }) {
  const fav = useFavorites()
  const [items, setItems] = useState<Item[] | null>(null)
  const ids = fav.map((t) => t.id).join(',')

  useEffect(() => {
    if (!ids) return
    let alive = true
    const load = () =>
      fetch(`/api/favorites?teams=${ids}&date=${ymd}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { items: Item[] } | null) => alive && d && setItems(d.items))
        .catch(() => {})
    load()
    const t = window.setInterval(load, 60_000)
    return () => {
      alive = false
      window.clearInterval(t)
    }
  }, [ids, ymd])

  if (!fav.length || !items) return null
  if (!items.length)
    return (
      <p className="px-1 text-[13px] text-mute">
        ★ Ваши команды в этот день не играют: {fav.map((t) => t.name).join(', ')}.
      </p>
    )
  return (
    // заголовок над карточкой, как у блоков лиг
    <section className="min-w-0" aria-label="Ваши команды">
      <div className="mb-2.5 flex items-center gap-2 px-4 sm:px-5">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-fg" fill="currentColor" aria-hidden>
          <path d="M12 3.6l2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 16.5l-5.1 2.8 1.1-5.7-4.3-4 5.8-.7z" />
        </svg>
        <h2 className="text-[20px] font-bold leading-tight tracking-[-0.01em]">Ваши команды</h2>
      </div>
      <ul className="card overflow-hidden">
        {items.map((m) => (
          <li key={m.id} className="relative border-b border-edge last:border-b-0 transition-colors hover:bg-white/[0.02]">
            <StoryLink id={m.id} href={m.href} className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-5">
              <span className={`num text-[14px] font-semibold ${m.live ? 'text-live' : m.finished ? 'text-mute' : 'text-fg'}`}>
                {m.live ? m.minute : m.finished ? 'итог' : m.time}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2 truncate text-[15px] font-semibold">
                  <TeamLogo name={m.home.name} src={m.home.logo} size={20} />
                  <span className="truncate">{m.home.name}</span>
                  <span className="text-mute">—</span>
                  <TeamLogo name={m.away.name} src={m.away.logo} size={20} />
                  <span className="truncate">{m.away.name}</span>
                </span>
                <span className="block truncate text-[12.5px] text-mute">{m.league}</span>
              </span>
              {m.score ? (
                <span className={`num text-[16px] font-bold ${m.live ? 'text-live' : ''}`}>
                  <Tick v={m.score[0]} /> : <Tick v={m.score[1]} />
                </span>
              ) : (
                <span />
              )}
            </StoryLink>
          </li>
        ))}
      </ul>
    </section>
  )
}
