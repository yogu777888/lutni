'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useFavorites } from './favorites'
import { Tick } from './Live'
import { TeamLogo } from './TeamLogo'
import { Icon } from '@/components/Icon'
import { TitleMark } from '@/components/Section'

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
  // эти матчи ниже не повторяем (владелец: «лучше в центре не дублировать один и тот же матч»): избранное — в браузере, а
  // список рисует сервер, поэтому прячем стилем — строки с `data-mid` и блок, где кроме них строк нет
  const own = items.map((m) => `[data-mid="${m.id}"]`).join(',')
  const hide = `#matches :is(${own}){display:none}#matches [data-block]:not(:has([data-mid]:not(${own}))){display:none}#matches .divide-y>:has(+:is(${own}):last-child){border-bottom-width:0}`
  return (
    // заголовок над карточкой, как у блоков лиг
    <section className="min-w-0" aria-label="Ваши команды">
      <style>{hide}</style>
      <div className="mb-2.5 flex items-center gap-2.5 px-4 sm:px-5">
        <TitleMark>
          <Icon k="star-fill" size={22} />
        </TitleMark>
        <h2 className="text-[20px] font-bold leading-tight tracking-[-0.01em]">Ваши команды</h2>
      </div>
      {/* строки — той же разметкой, что `MatchRow` в блоках ниже (владелец: «смотри как отличается матч сохраненной команды»):
          время Oswald 18px, эмблемы 22px, названия 16px, счёт Oswald 24px белым по центру колонки кэфов, клик — страница матча */}
      <ul className="card divide-y divide-edge overflow-hidden">
        {items.map((m) => {
          const lost = (a: number, b: number) => m.finished && a < b
          const name = (t: Item['home'], dim: boolean) => (
            <span className={`flex min-w-0 items-center gap-2 ${dim ? 'text-fg/55' : ''}`}>
              <span className={`shrink-0 ${dim ? 'opacity-60' : ''}`}>
                <TeamLogo name={t.name} src={t.logo} size={22} />
              </span>
              <span className="truncate">{t.name}</span>
            </span>
          )
          return (
            <li
              key={m.id}
              className="relative grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-2.5 transition-colors hover:bg-white/[0.02] sm:grid-cols-[3.75rem_minmax(0,1fr)_11.25rem] sm:gap-x-4 sm:px-5"
            >
              <span className="self-start pt-0.5 sm:self-center sm:pt-0">
                <span className={`num display-num relative -top-0.5 block whitespace-nowrap text-[18px] leading-none ${m.live ? 'text-live' : m.finished ? 'text-mute' : 'text-fg'}`}>
                  {m.live ? m.minute : m.time}
                  {m.finished ? <span className="sr-only"> · итог</span> : null}
                </span>
              </span>
              <span className="min-w-0">
                <Link
                  href={m.href}
                  prefetch={false}
                  className="flex min-w-0 flex-col items-start gap-0.5 text-[15px] font-semibold after:absolute after:inset-0 after:content-[''] sm:flex-row sm:items-center sm:gap-0 sm:text-[16px]"
                >
                  {name(m.home, Boolean(m.score && lost(m.score[0], m.score[1])))}
                  <span className="mx-1.5 hidden shrink-0 font-normal text-mute sm:inline">—</span>
                  {name(m.away, Boolean(m.score && lost(m.score[1], m.score[0])))}
                </Link>
                <span className="mt-1 block truncate text-[13px] text-mute">{m.league}</span>
              </span>
              <span className="flex items-center justify-end sm:h-[34px] sm:justify-center">
                {m.score ? (
                  <span className="num display-num whitespace-nowrap text-center text-[24px] leading-none text-fg">
                    <Tick v={m.score[0]} />
                    <span className="mx-1.5 text-mute">:</span>
                    <Tick v={m.score[1]} />
                  </span>
                ) : null}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
