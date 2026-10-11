'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { CompactMatch } from '@/lib/compact'
import { TeamLogo } from '../TeamLogo'

/**
 * Правая панель каркаса (как «Сейчас играет» у Spotify; от xl): «Сейчас в игре» — идущие матчи со счётом и минутой,
 * главные первыми, раз в 30 с, только пока вкладка на экране; ничего не идёт — «Скоро начнутся» со временем.
 * Ниже — `children` (карточка бонуса, приходит с сервера).
 */
export function RightPanel({ children }: { children?: React.ReactNode }) {
  const [data, setData] = useState<{ items: CompactMatch[]; upcoming: boolean } | null>(null)

  useEffect(() => {
    let stop = false
    const load = () => {
      if (document.visibilityState !== 'visible') return
      fetch('/api/live')
        .then((r) => r.json())
        .then((d) => !stop && setData(d))
        .catch(() => {})
    }
    load()
    const t = setInterval(load, 30_000)
    return () => {
      stop = true
      clearInterval(t)
    }
  }, [])

  const items = data?.items ?? []
  return (
    <div className="flex flex-col gap-2">
      <section className="rounded-card bg-panel p-4">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold">
          {data?.upcoming ? null : <span className="h-2 w-2 animate-pulse-live rounded-full bg-live" />}
          {data?.upcoming ? 'Скоро начнутся' : 'Сейчас в игре'}
        </h2>
        {items.length ? (
          <ul className="mt-2 divide-y divide-edge">
            {items.map((m) => (
              <li key={m.id}>
                <Link href={m.href} prefetch={false} className="-mx-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 rounded-tile px-2 py-2 transition-colors hover:bg-white/[0.05]">
                  <span className="min-w-0 space-y-1">
                    {[m.home, m.away].map((t) => (
                      <span key={t.id} className="flex min-w-0 items-center gap-2 text-[13.5px]">
                        <TeamLogo name={t.name} src={t.logo} size={16} />
                        <span className="truncate">{t.name}</span>
                      </span>
                    ))}
                  </span>
                  <span className="text-right">
                    {m.live && m.score ? (
                      <>
                        <span className="num block text-[15px] font-semibold leading-tight">
                          {m.score[0]}
                          <br />
                          {m.score[1]}
                        </span>
                      </>
                    ) : (
                      <span className="num text-[14px] font-semibold text-chalk">{m.time}</span>
                    )}
                  </span>
                  <span className="col-span-2 mt-1 truncate text-[11.5px] text-mute">
                    {m.live ? <span className="text-live">{m.minute} · </span> : null}
                    {m.league}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[13px] text-dim">{data ? 'Сегодня матчей больше нет.' : 'Загружаем…'}</p>
        )}
      </section>
      {children}
    </div>
  )
}
