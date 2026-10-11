'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { CompactMatch } from '@/lib/compact'
import { useFavorites } from '../favorites'
import { TeamLogo } from '../TeamLogo'

export type PanelLeague = { id: number; short: string; href: string }

/**
 * Левая панель каркаса (как «Моя медиатека» у Spotify; от xl): «Мои команды» — избранные звёздочкой команды и их
 * матч сегодня (время, счёт и минута в игре), раз в минуту; нет избранных — подсказка, как добавить. Ниже —
 * топ-турниры. Избранное — в памяти браузера (components/favorites.ts), без регистрации.
 */
export function LeftPanel({ leagues, today }: { leagues: PanelLeague[]; today: string }) {
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

  return (
    // одна панель на всю высоту, как «Моя медиатека» у Spotify: свои команды, под чертой — турниры
    <div className="scrollbar-none h-full overflow-y-auto rounded-card bg-panel p-4">
      <section>
        <h2 className="flex items-center gap-2 text-[15px] font-semibold">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-acid" fill="currentColor" aria-hidden>
            <path d="M12 3.6l2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 16.5l-5.1 2.8 1.1-5.7-4.3-4 5.8-.7z" />
          </svg>
          Мои команды
        </h2>
        {favs.length ? (
          <ul className="mt-3 space-y-1">
            {favs.map((t) => {
              const g = gameOf(t.id)
              const line = g
                ? g.live
                  ? `${g.score?.[0] ?? 0} : ${g.score?.[1] ?? 0} · ${g.minute}`
                  : g.finished && g.score
                    ? `${g.score[0]} : ${g.score[1]} · итог`
                    : `сегодня в ${g.time}`
                : 'сегодня не играет'
              const body = (
                <>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.06]">
                    <TeamLogo name={t.name} src={t.logo ?? null} size={22} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium">{t.name}</span>
                    <span className={`block truncate text-[12.5px] ${g?.live ? 'text-live' : 'text-dim'}`}>{line}</span>
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
          <div className="mt-3 rounded-tile bg-white/[0.04] p-3.5">
            <p className="text-[14px] font-medium">Добавьте любимые команды</p>
            <p className="mt-1 text-[13px] leading-snug text-dim">
              Нажмите «☆ В избранное» на странице матча — здесь появятся их матчи, счёт и время.
            </p>
          </div>
        )}
      </section>
      <section className="mt-4 border-t border-edge pt-4">
        <h2 className="text-[15px] font-semibold">Топ-турниры</h2>
        <ul className="mt-2">
          {leagues.map((l) => (
            <li key={l.id}>
              <Link href={l.href} prefetch={false} className="-mx-2 block rounded-tile px-2 py-1.5 text-[14px] text-dim transition-colors hover:bg-white/[0.05] hover:text-fg">
                {l.short}
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/leagues" className="mt-2 inline-block text-[13px] font-semibold text-dim transition-colors hover:text-fg">
          Все турниры →
        </Link>
      </section>
    </div>
  )
}
