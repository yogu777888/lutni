'use client'

import { useEffect, useState } from 'react'
import type { Ticker } from '@/lib/ticker'
import { StoryLink } from './story/StoryLink'

/**
 * Бегущая строка матчей в шапке: «● Барселона 2 : 0 Леванте 59′ · …» — идущие матчи (главные первыми), нет идущих —
 * «Ближайшие» сегодня. Медленно едет по кругу, при наведении и фокусе стоит; при «уменьшить движение» не едет —
 * её можно прокрутить. Клик — разбор матча (сторис). Данные — /api/ticker, обновляются раз в минуту.
 */
export function LiveTicker({ className = '' }: { className?: string }) {
  const [data, setData] = useState<Ticker | null>(null)

  useEffect(() => {
    let alive = true
    const load = () =>
      fetch('/api/ticker')
        .then((r) => (r.ok ? r.json() : null))
        .then((d: Ticker | null) => alive && d && setData(d))
        .catch(() => {})
    load()
    const t = window.setInterval(load, 60_000)
    return () => {
      alive = false
      window.clearInterval(t)
    }
  }, [])

  if (!data || !data.items.length) return <div className={className} />

  const row = (copy: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={copy || undefined}>
      {data.items.map((it) => (
        <li key={it.id} className="flex items-center">
          <StoryLink
            id={it.id}
            href={it.href}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-[8px] px-2.5 py-1 text-[13.5px] text-fg/90 transition-colors hover:bg-white/15 hover:text-fg"
          >
            <span>{it.home}</span>
            {it.score ? (
              <span className="num font-semibold text-fg">
                {it.score[0]} : {it.score[1]}
              </span>
            ) : (
              <span className="text-fg/60">—</span>
            )}
            <span>{it.away}</span>
            <span className={`num text-[12.5px] ${it.live ? 'text-[#ffd0d2]' : 'text-fg/65'}`}>{it.note}</span>
          </StoryLink>
          <span aria-hidden className="text-fg/35">
            ·
          </span>
        </li>
      ))}
    </ul>
  )

  const secs = Math.max(30, data.items.length * 7)
  return (
    // полоска-табло: тёмное стекло на голубом, как бегущая строка счёта на стадионе
    <div
      role="region"
      aria-label={data.mode === 'live' ? 'Матчи в игре' : 'Ближайшие матчи'}
      className={`flex h-9 min-w-0 items-center rounded-[12px] bg-[rgb(8_40_80/0.22)] pl-3 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)] ${className}`}
    >
      <span className="flex shrink-0 items-center gap-1.5 pr-1.5 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-fg/80">
        {data.mode === 'live' ? <span className="h-2 w-2 animate-pulse rounded-full bg-[#ff5c63]" /> : null}
        {/* на телефоне — только точка: место нужнее матчам */}
        <span className={data.mode === 'live' ? 'max-sm:sr-only' : 'max-sm:hidden'}>{data.mode === 'live' ? 'Live' : 'Ближайшие'}</span>
      </span>
      {/* лента едет по кругу: две одинаковые строки подряд, сдвиг на половину — шов не виден; края тают */}
      <div className="ticker min-w-0 flex-1 overflow-hidden">
        <div className="ticker-track flex w-max" style={{ animationDuration: `${secs}s` }}>
          {row(false)}
          {row(true)}
        </div>
      </div>
    </div>
  )
}
