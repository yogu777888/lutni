'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { CompactMatch } from '@/lib/compact'
import type { DayLeague, DayLeagues } from '@/lib/day-leagues'
import { useFavorites } from '../favorites'
import { TeamLogo } from '../TeamLogo'
import { PanelToggle } from './PanelToggle'

/** Блок на странице: раскрыть свёрнутые «Другие турниры» вокруг него и плавно прокрутить к нему. */
function reveal(id: string): boolean {
  const el = document.getElementById(id)
  if (!el) return false
  for (let d = el.parentElement?.closest('details'); d; d = d.parentElement?.closest('details')) d.open = true
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  return true
}

/** Флаг турнира; нет флага (еврокубки) — тихий кружок с первой буквой. */
function LeagueFlag({ l }: { l: Pick<DayLeague, 'flag' | 'name'> }) {
  return l.flag ? (
    // eslint-disable-next-line @next/next/no-img-element -- маленький SVG
    <img src={`/flags/${l.flag}.svg`} alt="" width={22} height={16} loading="lazy" className="h-4 w-[22px] shrink-0 rounded-[3px] object-cover ring-1 ring-white/10" />
  ) : (
    <span aria-hidden className="grid h-4 w-[22px] shrink-0 place-items-center rounded-[3px] bg-white/[0.08] text-[10px] font-semibold text-dim">
      {l.name.charAt(0)}
    </span>
  )
}

/**
 * Левая панель каркаса (от xl) — «Турниры дня», оглавление списка в центре (владелец согласился: вместо «Моих команд»
 * с пустым экраном для новичка): «Сейчас в игре», топ-лиги и другие турниры с флагом, справа — сколько идёт (красным)
 * или сколько всего матчей. Клик прокручивает центр к блоку лиги (свёрнутые «Другие турниры» раскрываются); блока на
 * странице нет — страница турнира. Пока листаешь центр, текущая лига подсвечена. Избранные команды (звёздочка на странице
 * матча) — сверху, если есть. Свёрнута — полоска с флагами топ-лиг.
 */
export function LeftPanel({ today, day }: { today: string; day: DayLeagues }) {
  const favs = useFavorites()
  const [games, setGames] = useState<CompactMatch[]>([])
  const [active, setActive] = useState<string | null>(null)
  const pathname = usePathname()
  const router = useRouter()
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

  // пришли по ссылке «/#league-…» — раскрыть и прокрутить; дальше — какая лига сейчас вверху центра
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (hash.startsWith('league-') || hash === 'live') setTimeout(() => reveal(hash), 50)
    const blocks = [...document.querySelectorAll<HTMLElement>('#live, [id^="league-"]')]
    if (!blocks.length) return setActive(null)
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (top) setActive(top.target.id)
      },
      // «текущая» — та, что пересекает полосу чуть ниже шапки
      { rootMargin: '-90px 0px -75% 0px' },
    )
    blocks.forEach((b) => io.observe(b))
    return () => io.disconnect()
  }, [pathname])

  const go = (id: string, href: string) => (e: React.MouseEvent) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    if (reveal(id)) {
      setActive(id)
      history.replaceState(null, '', `#${id}`)
    } else router.push(href)
  }

  const gameOf = (id: number) => (ids ? games.find((g) => g.home.id === id || g.away.id === id) : undefined)
  const lineOf = (g: CompactMatch | undefined) =>
    g ? (g.live ? `${g.score?.[0] ?? 0} : ${g.score?.[1] ?? 0} · ${g.minute}` : g.finished && g.score ? `${g.score[0]} : ${g.score[1]} · итог` : `Сегодня в ${g.time}`) : 'Сегодня не играет'

  const top = day.leagues.filter((l) => l.top)
  const rest = day.leagues.filter((l) => !l.top)
  const row = 'flex items-center gap-3 rounded-tile px-2 py-2 text-[14px] transition-colors'
  const Count = ({ live, total }: { live: number; total: number }) =>
    live ? (
      <span className="num flex shrink-0 items-center gap-1.5 text-[12.5px] font-semibold text-live">
        <span className="h-1.5 w-1.5 rounded-full bg-live" />
        {live}
      </span>
    ) : (
      <span className="num shrink-0 text-[12.5px] text-mute">{total}</span>
    )
  const League = ({ l }: { l: DayLeague }) => {
    const id = `league-${l.id}`
    const on = active === id
    return (
      <li>
        <a
          href={l.href}
          onClick={go(id, l.href)}
          title={l.full}
          aria-current={on ? 'location' : undefined}
          className={`-mx-2 ${row} ${on ? 'bg-white/[0.07] text-fg' : 'text-fg/85 hover:bg-white/[0.04] hover:text-fg'}`}
        >
          <LeagueFlag l={l} />
          <span className="min-w-0 flex-1 truncate">{l.name}</span>
          <Count live={l.live} total={l.total} />
        </a>
      </li>
    )
  }

  return (
    <div className="h-full rounded-card bg-panel">
      {/* свёрнута — полоска: «развернуть» и флаги топ-лиг (красная точка — идут матчи) */}
      <div className="shell-l-rail scrollbar-none h-full flex-col items-center gap-2 overflow-y-auto py-3">
        <PanelToggle side="l" open={false} />
        {top.map((l) => (
          <a
            key={l.id}
            href={l.href}
            onClick={go(`league-${l.id}`, l.href)}
            title={l.full}
            className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[0.06] transition-colors hover:bg-white/[0.12]"
          >
            <LeagueFlag l={l} />
            {l.live ? <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-live ring-2 ring-panel" /> : null}
          </a>
        ))}
      </div>

      <div className="shell-l-full scrollbar-none h-full overflow-y-auto p-4">
        <h2 className="flex items-center justify-between text-[15px] font-semibold">
          Турниры дня
          <PanelToggle side="l" open />
        </h2>

        <ul className="mt-2 space-y-0.5">
          {day.live ? (
            <li>
              <a
                href="/#live"
                onClick={go('live', '/#live')}
                aria-current={active === 'live' ? 'location' : undefined}
                className={`-mx-2 ${row} ${active === 'live' ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'}`}
              >
                <span aria-hidden className="grid h-4 w-[22px] shrink-0 place-items-center">
                  <span className="h-2 w-2 animate-pulse-live rounded-full bg-live" />
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">Сейчас в игре</span>
                <Count live={day.live} total={day.live} />
              </a>
            </li>
          ) : null}
          {top.map((l) => (
            <League key={l.id} l={l} />
          ))}
        </ul>

        {/* избранные команды (звёздочка на странице матча) — если есть */}
        {favs.length ? (
          <section className="mt-5">
            <h3 className="text-[12px] font-medium text-mute">Мои команды</h3>
            <ul className="mt-1.5 space-y-0.5">
              {favs.map((t) => {
                const g = gameOf(t.id)
                const body = (
                  <>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.08]">
                      <TeamLogo name={t.name} src={t.logo ?? null} size={20} />
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
          </section>
        ) : null}

        {rest.length ? (
          <section className="mt-5">
            <h3 className="text-[12px] font-medium text-mute">Другие турниры</h3>
            <ul className="mt-1.5 space-y-0.5">
              {rest.map((l) => (
                <League key={l.id} l={l} />
              ))}
            </ul>
          </section>
        ) : null}

        {!day.leagues.length ? <p className="mt-2 text-[13px] text-dim">Сегодня матчей нет.</p> : null}
      </div>
    </div>
  )
}
