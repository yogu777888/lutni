'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { CompactMatch } from '@/lib/compact'
import { toggleFavorite, useFavorites, type FavTeam } from '../favorites'
import { TeamLogo } from '../TeamLogo'
import { PanelToggle } from './PanelToggle'
import { toggleShell } from './shell-state'

/**
 * Левая панель каркаса (как «Моя медиатека» у Spotify; от xl): «Мои команды» — избранные команды и их матч сегодня
 * (время, счёт и минута в игре, раз в минуту). Пока избранных нет — короткая подсказка и команды из главных матчей
 * дня (`suggest`) с кнопкой «+»: нажал — команда в избранном, без перехода на страницу матча. Избранное — в памяти
 * браузера (components/favorites.ts), без регистрации. Свёрнута — полоска с эмблемами избранных.
 */
export function LeftPanel({ today, suggest }: { today: string; suggest: FavTeam[] }) {
  const favs = useFavorites()
  const [games, setGames] = useState<CompactMatch[]>([])
  const ids = favs.map((t) => t.id).join(',')

  useEffect(() => {
    if (!ids) return
    let stop = false
    const load = () =>
      fetch(`/api/favorites?teams=${ids}&date=${today}`)
        .then((r) => r.json())
        .then((d) => !stop && setGames(d.items ?? []))
        .catch(() => {})
    load()
    const t = setInterval(load, 60_000)
    return () => {
      stop = true
      clearInterval(t)
    }
  }, [ids, today])

  const gameOf = (id: number) => (ids ? games.find((g) => g.home.id === id || g.away.id === id) : undefined)
  const lineOf = (g: CompactMatch | undefined) =>
    g ? (g.live ? `${g.score?.[0] ?? 0} : ${g.score?.[1] ?? 0} · ${g.minute}` : g.finished && g.score ? `${g.score[0]} : ${g.score[1]} · итог` : `Сегодня в ${g.time}`) : 'Сегодня не играет'
  const rest = suggest.filter((t) => !favs.some((f) => f.id === t.id))

  return (
    <div className="h-full rounded-card bg-panel">
      {/* свёрнута — полоска, как у Spotify: кнопка «развернуть» и эмблемы избранных команд (красная точка — идёт матч) */}
      <div className="shell-l-rail scrollbar-none h-full flex-col items-center gap-2 overflow-y-auto py-3">
        <PanelToggle side="l" open={false} />
        {favs.map((t) => {
          const g = gameOf(t.id)
          return (
            <Link
              key={t.id}
              href={g?.href ?? '#'}
              prefetch={false}
              title={t.name}
              onClick={(e) => (g ? null : (e.preventDefault(), toggleShell('l')))}
              className="relative grid h-10 w-10 place-items-center rounded-full bg-white/[0.06] transition-colors hover:bg-white/[0.12]"
            >
              <TeamLogo name={t.name} src={t.logo ?? null} size={24} />
              {g?.live ? <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-live ring-2 ring-panel" /> : null}
            </Link>
          )
        })}
      </div>

      <div className="shell-l-full scrollbar-none h-full overflow-y-auto p-4">
        <h2 className="flex items-center justify-between text-[15px] font-semibold">
          Мои команды
          <PanelToggle side="l" open />
        </h2>

        {favs.length ? (
          <ul className="mt-2 space-y-0.5">
            {favs.map((t) => {
              const g = gameOf(t.id)
              const body = (
                <>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[0.08]">
                    <TeamLogo name={t.name} src={t.logo ?? null} size={24} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium">{t.name}</span>
                    <span className={`block truncate text-[12.5px] ${g?.live ? 'text-live' : 'text-dim'}`}>{lineOf(g)}</span>
                  </span>
                </>
              )
              return (
                <li key={t.id}>
                  {g ? (
                    <Link href={g.href} prefetch={false} className="-mx-2 flex items-center gap-3 rounded-tile px-2 py-1.5 transition-colors hover:bg-white/[0.05]">
                      {body}
                    </Link>
                  ) : (
                    <div className="-mx-2 flex items-center gap-3 px-2 py-1.5">{body}</div>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-1.5 text-[13px] leading-snug text-dim">Добавьте команды — здесь будут их матчи, счёт и время.</p>
        )}

        {/* пока избранных мало — команды главных матчей дня, добавить одной кнопкой */}
        {favs.length < 3 && rest.length ? (
          <section className={favs.length ? 'mt-5' : 'mt-4'}>
            <h3 className="text-[12px] font-medium text-mute">Популярные сегодня</h3>
            <ul className="mt-1.5 space-y-0.5">
              {rest.slice(0, 8).map((t) => (
                <li key={t.id} className="-mx-2 flex items-center gap-3 rounded-tile px-2 py-1.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[0.08]">
                    <TeamLogo name={t.name} src={t.logo ?? null} size={24} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[14px]">{t.name}</span>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(t)}
                    aria-label={`Добавить «${t.name}» в мои команды`}
                    title="Добавить в мои команды"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-dim ring-1 ring-white/20 transition-colors hover:bg-white/10 hover:text-fg"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden>
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  )
}
