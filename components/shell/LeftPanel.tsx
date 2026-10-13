'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { SITE } from '@/config/site'
import type { CompactMatch } from '@/lib/compact'
import type { DayLeague, DayLeagues } from '@/lib/day-leagues'
import { useFavorites } from '../favorites'
import { TeamLogo } from '../TeamLogo'
import { StorySymbol } from '../story/StorySymbol'
import { PanelToggle } from './PanelToggle'

/** «в 1 турнире», «в 3 турнирах» — подпись у «Сейчас в игре». */
const inLeagues = (n: number) => `в ${n} ${n % 10 === 1 && n % 100 !== 11 ? 'турнире' : 'турнирах'}`

/** Блок на странице: раскрыть свёрнутые «Другие турниры» вокруг него и плавно прокрутить к нему. */
function reveal(id: string): boolean {
  const el = document.getElementById(id)
  if (!el) return false
  for (let d = el.parentElement?.closest('details'); d; d = d.parentElement?.closest('details')) d.open = true
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  return true
}

/** Флаг турнира кругом в плашке 36px — как значки подборок в правой панели; нет флага (еврокубки) — первая буква. */
function LeagueFlag({ l }: { l: Pick<DayLeague, 'flag' | 'name'> }) {
  return (
    <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.06]">
      {l.flag ? (
        // eslint-disable-next-line @next/next/no-img-element -- маленький SVG
        <img src={`/flags/${l.flag}.svg`} alt="" width={20} height={20} loading="lazy" className="h-5 w-5 rounded-full object-cover ring-1 ring-white/15" />
      ) : (
        <span className="text-[12px] font-semibold text-dim">{l.name.charAt(0)}</span>
      )}
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
/**
 * Правовая часть внизу панели — как у Spotify (юридические ссылки мелко внизу левой панели), вместо подвала в центре
 * (владелец: «может не в центральном блоке его делать?»). Обязательное: 18+ и «ставки — это риск», раскрытие
 * партнёрских ссылок, политика cookie (152-ФЗ), источник данных. Ниже xl панелей нет — там прежний подвал (Footer).
 */
function Legal({ demo }: { demo: string | null }) {
  const link = 'transition-colors hover:text-fg'
  return (
    <div className="border-t border-edge pt-3 text-[11.5px] leading-snug text-mute">
      <p className="flex items-center gap-2 text-dim">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[9.5px] font-semibold ring-1 ring-edge-2">18+</span>
        Ставки — это риск. Играйте ответственно.
      </p>
      <nav aria-label="Информация" className="mt-2 flex flex-wrap gap-x-2.5 gap-y-1 tracking-[-0.01em]">
        <Link href="/about" className={link}>Как мы считаем</Link>
        <Link href="/responsible-gaming" className={link}>Ответственная игра</Link>
        <Link href="/privacy" className={link}>Cookie</Link>
      </nav>
      <p className="mt-2">Не призыв делать ставки. Партнёрские ссылки на легальных букмекеров: сайт может получать вознаграждение.</p>
      {demo ? <p className="mt-1">{demo}</p> : null}
      {/* подпись сайта последней строкой, как принято в конце страницы; год — текущий */}
      <p className="mt-2">
        © {new Date().getFullYear()} {SITE.name} · Данные — SStats.net
      </p>
    </div>
  )
}

export function LeftPanel({ today, day, demo = null }: { today: string; day: DayLeagues; demo?: string | null }) {
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
        // пока страницу не листали — ничего не подсвечено (иначе «Сейчас в игре» выглядит выбранным пунктом)
        if (window.scrollY < 40) return setActive(null)
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (top) setActive(top.target.id)
      },
      // «текущая» — та, что пересекает полосу чуть ниже шапки и липкой строки дней
      { rootMargin: '-150px 0px -70% 0px' },
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
  // строки — как в правой панели: значок в круге 36px, название 14,5px, справа число
  const row = 'flex items-center gap-3 rounded-tile py-1.5 pl-2 pr-2.5 text-[14.5px] font-medium transition-colors'
  // справа всегда число матчей, тихо (один столбец — один смысл); сколько идёт — красным в подписи
  const Count = ({ n }: { n: number }) => <span className="num shrink-0 text-[13px] text-mute">{n}</span>
  // подпись под названием, как в «Подборках дня»: страна и что с турниром — «3 в игре» красным / «с 22:00» / «в 22:00» (следующий, когда часть сыграна) / «все сыграны»
  const Sub = ({ l }: { l: DayLeague }) => {
    const state = l.live ? null : l.next ? `${l.started ? 'в' : 'с'} ${l.next}` : l.started ? 'все сыграны' : ''
    return (
      <span className="mt-0.5 block truncate text-[12.5px] font-normal text-mute">
        {l.country}
        {l.country && (l.live || state) ? ' · ' : ''}
        {l.live ? <span className="text-live">{l.live} в игре</span> : state}
      </span>
    )
  }
  const Name = ({ l }: { l: DayLeague }) => (
    <span className="min-w-0 flex-1 leading-tight">
      <span className="block truncate">{l.name}</span>
      <Sub l={l} />
    </span>
  )
  const League = ({ l, jump = true }: { l: DayLeague; jump?: boolean }) => {
    const id = `league-${l.id}`
    const on = jump && active === id
    return (
      <li>
        <a
          href={l.href}
          onClick={jump ? go(id, l.href) : undefined}
          title={l.full}
          aria-current={on ? 'location' : undefined}
          className={`-mx-2 ${row} ${on ? 'bg-white/[0.07] text-fg' : 'text-fg/85 hover:bg-white/[0.04] hover:text-fg'}`}
        >
          <LeagueFlag l={l} />
          <Name l={l} />
          <Count n={l.total} />
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
            className="relative shrink-0 rounded-full transition-opacity hover:opacity-80"
          >
            <LeagueFlag l={l} />
            {l.live ? <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-live ring-2 ring-panel" /> : null}
          </a>
        ))}
        {/* свёрнута — 18+ внизу полоски, ведёт на «Ответственную игру» */}
        <Link
          href="/responsible-gaming"
          title="18+ · Ставки — это риск. Играйте ответственно."
          className="mt-auto grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-mute ring-1 ring-edge-2 transition-colors hover:text-fg"
        >
          18+
        </Link>
      </div>

      <div className="shell-l-full flex h-full flex-col">
      <div className="scrollbar-none flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
        <h2 className="sticky -top-4 z-10 -mx-4 -mt-4 flex items-center justify-between bg-panel px-4 pb-2 pt-4 text-[15px] font-semibold after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-4 after:bg-linear-to-b after:from-panel after:to-transparent after:content-['']">
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
                <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.06]">
                  <StorySymbol k="live" tone="currentColor" className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate">Сейчас в игре</span>
                  <span className="mt-0.5 block truncate text-[12.5px] font-normal text-mute">{inLeagues(day.leagues.filter((l) => l.live).length)}</span>
                </span>
                <Count n={day.live} />
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

        {/* завтра — турниры следующего дня: клик — список «Матчи» на завтра, сразу к блоку лиги */}
        {day.tomorrow.length ? (
          <section className="mt-5">
            <h3 className="text-[12px] font-medium text-mute">Завтра</h3>
            <ul className="mt-1.5 space-y-0.5">
              {day.tomorrow.map((l) => (
                <League key={l.id} l={l} jump={false} />
              ))}
            </ul>
          </section>
        ) : null}

        {!day.leagues.length ? <p className="mt-2 text-[13px] text-dim">Сегодня матчей нет.</p> : null}
        {/* правовой блок — в конце списка: короткий список — прижат к низу панели, длинный — ровно через 24px после
            последней строки (раньше блок был приклеен к низу и отрезал список со случайным зазором) */}
        <div className="mt-auto shrink-0 pt-6">
          <Legal demo={demo} />
        </div>
      </div>
      </div>
    </div>
  )
}
