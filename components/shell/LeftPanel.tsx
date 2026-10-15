'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { SITE } from '@/config/site'
import type { CompactMatch } from '@/lib/compact'
import type { DayLeague, DayLeagues } from '@/lib/day-leagues'
import { useFavorites } from '../favorites'
import { TeamLogo } from '../TeamLogo'
import type { StoryGroup } from '@/lib/story-groups'
import { openStory } from '../story/events'
import { circleQueue } from '../story/queue'
import { readSeen, SEEN_EVENT } from '../story/seen'
import { StorySymbol } from '../story/StorySymbol'
import { PanelToggle } from './PanelToggle'
import { useRailTip } from './RailTip'
import { matchesN, StateLine } from './StateLine'
import { StoryRing } from './StoryRing'

/** «в 1 турнире», «в 3 турнирах» — подпись у «Сейчас в игре». */
const inLeagues = (n: number) => `в ${n} ${n % 10 === 1 && n % 100 !== 11 ? 'турнире' : 'турнирах'}`

/** При наведении на строку — белая ▶ на месте значка, как у подборок справа. */
function PlayOverlay() {
  return (
    <span aria-hidden className="absolute inset-0 grid place-items-center rounded-full bg-white text-ink opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
      <svg viewBox="0 0 24 24" className="ml-0.5 h-3.5 w-3.5" fill="currentColor">
        <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" />
      </svg>
    </span>
  )
}

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
function Legal() {
  const link = 'transition-colors hover:text-fg'
  // под чертой — 16px, как под чертой «Выгодно сегодня» справа (владелец: «в левом и правом блоке отличаются отступы от
  // нижней линии» — было 12px); одна система строк: один размер, один серый, одинаковые отступы и «·» между частями — без кружка 18+ и абзаца
  // в три строки (владелец: «футер уродливый»); «Играйте ответственно» — ссылкой «Ответственная игра» ниже
  return (
    <div className="space-y-1.5 border-t border-edge pt-4 text-[11.5px] leading-snug text-mute">
      <p>
        <span className="font-semibold text-dim">18+</span> · Ставки — это риск
      </p>
      {/* ссылки — через отступ, без «·»: в узкой панели перенос начинал строку с «· Cookie» */}
      <nav aria-label="Информация" className="flex flex-wrap gap-x-3">
        <Link href="/about" className={link}>Как мы считаем</Link>
        <Link href="/responsible-gaming" className={link}>Ответственная игра</Link>
        <Link href="/privacy" className={link}>Cookie</Link>
      </nav>
      <p>Не призыв делать ставки. Партнёрские ссылки на легальных букмекеров: сайт может получать вознаграждение.</p>
      {/* подпись сайта последней строкой, как принято в конце страницы; год — текущий */}
      <p>
        © {new Date().getFullYear()} {SITE.name}
      </p>
    </div>
  )
}

export function LeftPanel({ today, day }: { today: string; day: DayLeagues }) {
  const favs = useFavorites()
  const [games, setGames] = useState<CompactMatch[]>([])
  const [active, setActive] = useState<string | null>(null)
  // просмотренные сторис — для колец вокруг флагов (те же отметки, что у подборок)
  const [seen, setSeen] = useState<Set<string>>(() => new Set())
  useEffect(() => {
    const update = () => setSeen(readSeen())
    update()
    window.addEventListener(SEEN_EVENT, update)
    return () => window.removeEventListener(SEEN_EVENT, update)
  }, [])
  const { tipProps, tipNode } = useRailTip('l', 'shell-l-rail')
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
  // подпись под названием — сколько матчей и что с турниром (`StateLine`, общая с правой панелью); страны нет — её
  // говорит флаг, полное название — в подсказке; цифры справа нет — голая «10» читалась как счётчик непрочитанных
  const SubText = ({ l }: { l: DayLeague }) => <StateLine total={l.total} live={l.live} next={l.next} started={l.started} pending={l.pending} />
  const Sub = ({ l }: { l: DayLeague }) => (
    <span className="mt-0.5 block truncate text-[12.5px] font-normal text-mute">
      <SubText l={l} />
    </span>
  )
  // свёрнутая панель — как правая полоска (владелец: «в левом блоке, когда он свёрнут, нет индикатора историй, а в правом
  // есть — это норм?»): флаг — то же, что в развёрнутой, — кнопка сторис матчей лиги с кольцом непросмотренных; подсказка —
  // название, подпись и «нажмите — разбор». Перейти к блоку лиги — названием в развёрнутой панели. Функция, а не компонент:
  // компонент, объявленный в рендере, пересоздаётся при показе подсказки (фокус по нажатию) — кнопка менялась под мышью, клик терялся
  const railFlag = (l: DayLeague, list: DayLeague[]) => (
    <button
      key={l.id}
      type="button"
      onClick={play(list, list.indexOf(l))}
      {...tipProps(
        l.name,
        <>
          <SubText l={l} /> · нажмите — разбор
        </>,
      )}
      aria-label={`${l.name}: смотреть разбор матчей`}
      className="relative shrink-0 rounded-full transition-opacity hover:opacity-80"
    >
      <LeagueFlag l={l} />
      <StoryRing group={`league-${l.id}`} ids={l.items.map((m) => m.id)} seen={seen} />
    </button>
  )
  // у турниров «Завтра» подписи нет (владелец: «не слишком много мелкого текста из-за подписей?» — пять одинаковых
  // «10 матчей · начало в 16:00» подряд; про завтра в панели это мало кому нужно) — она в подсказке
  const Name = ({ l, sub = true }: { l: DayLeague; sub?: boolean }) => (
    <span className="min-w-0 flex-1 leading-tight">
      <span className="block truncate">{l.name}</span>
      {sub ? <Sub l={l} /> : null}
    </span>
  )
  // турниры как истории: клик по флагу — сторис матчей лиги подряд, дальше — следующих лиг (как у подборок справа)
  const asGroups = (ls: DayLeague[]): StoryGroup[] =>
    ls.map((l) => ({ key: `league-${l.id}`, label: l.name, kind: 'top', hint: '', href: l.href, stat: '', items: l.items.map((m) => ({ ...m, focus: null })) }))
  const play = (ls: DayLeague[], i: number) => (e: React.MouseEvent<HTMLButtonElement>) => {
    const groups = asGroups(ls)
    const { queue, startId } = circleQueue(groups, i, seen)
    const first = groups[i].items.find((m) => m.id === startId) ?? groups[i].items[0]
    if (first) openStory({ id: startId, href: first.href, opener: e.currentTarget, queue })
  }
  const playLive = (e: React.MouseEvent<HTMLButtonElement>) => {
    const live: StoryGroup = { key: 'live', label: 'В игре', kind: 'live', hint: '', href: '/#live', stat: '', items: day.liveItems.map((m) => ({ ...m, focus: null })) }
    const groups = [live, ...asGroups(day.leagues)]
    const { queue, startId } = circleQueue(groups, 0, seen)
    const first = live.items.find((m) => m.id === startId) ?? live.items[0]
    if (first) openStory({ id: startId, href: first.href, opener: e.currentTarget, queue })
  }
  // строка: флаг — кнопка сторис (кольцо — непросмотренные матчи, при наведении — белая ▶), название — переход к блоку лиги
  const League = ({ l, list, jump = true }: { l: DayLeague; list: DayLeague[]; jump?: boolean }) => {
    const id = `league-${l.id}`
    const on = jump && active === id
    return (
      <li>
        <div className={`group -mx-2 ${row} ${on ? 'bg-white/[0.07] text-fg' : 'text-fg/85 hover:bg-white/[0.04] hover:text-fg'}`}>
          <button
            type="button"
            onClick={play(list, list.indexOf(l))}
            aria-label={`${l.name}: смотреть разбор матчей`}
            className="relative shrink-0 rounded-full"
          >
            <LeagueFlag l={l} />
            <PlayOverlay />
            <StoryRing group={id} ids={l.items.map((m) => m.id)} seen={seen} />
          </button>
          <a
            href={l.href}
            onClick={jump ? go(id, l.href) : undefined}
            title={jump ? l.full : `${l.full} · ${matchesN(l.total)}${l.next ? ` · начало в ${l.next}` : ''}`}
            aria-current={on ? 'location' : undefined}
            className="flex min-w-0 flex-1 items-center self-stretch"
          >
            <Name l={l} sub={jump} />
          </a>
        </div>
      </li>
    )
  }


  return (
    // overflow-hidden — иначе квадратный фон закреплённого заголовка перекрывает скруглённые углы панели
    <div className="h-full overflow-hidden rounded-card bg-panel">
      {/* свёрнута — полоска: «развернуть», «Сейчас в игре» и флаги — истории с кольцами, как в правой полоске */}
      <div className="shell-l-rail scrollbar-none h-full flex-col items-center gap-3 overflow-y-auto py-3">
        <PanelToggle side="l" open={false} />
        {/* «Сейчас в игре» — первым, как в развёрнутой */}
        {day.live ? (
          <button
            type="button"
            onClick={playLive}
            {...tipProps('Сейчас в игре', `${matchesN(day.live)} ${inLeagues(day.leagues.filter((l) => l.live).length)} · нажмите — разбор`)}
            aria-label="Сейчас в игре: смотреть разбор матчей"
            className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.06] transition-colors hover:bg-white/[0.12]"
          >
            <StorySymbol k="live" tone="currentColor" className="h-[18px] w-[18px]" />
            <StoryRing group="live" ids={day.liveItems.map((m) => m.id)} seen={seen} />
          </button>
        ) : null}
        {top.map((l) => railFlag(l, day.leagues))}
        {/* другие турниры дня — после тонкой черты (до 12, полоска узкая) */}
        {rest.length ? <span aria-hidden className="my-1 h-px w-6 shrink-0 bg-edge" /> : null}
        {rest.slice(0, 12).map((l) => railFlag(l, day.leagues))}
        {/* свёрнута — 18+ внизу полоски, ведёт на «Ответственную игру» */}
        <Link
          href="/responsible-gaming"
          title="18+ · Ставки — это риск. Играйте ответственно."
          className="mt-auto grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-mute ring-1 ring-edge-2 transition-colors hover:text-fg"
        >
          18+
        </Link>
      </div>
      {tipNode}

      <div className="shell-l-full flex h-full flex-col">
      <div className="scrollbar-none flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
        <h2 className="sticky -top-4 z-10 -mx-4 -mt-4 flex items-center justify-between bg-panel px-4 pb-2 pt-4 text-[15px] font-semibold after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-4 after:bg-linear-to-b after:from-panel after:to-transparent after:content-['']">
          Турниры дня
          <PanelToggle side="l" open />
        </h2>

        <ul className="mt-2 space-y-0.5">
          {day.live ? (
            // «Сейчас в игре» — тоже история (владелец: «а почему у сейчас в игре нет сторис?»): значок — сторис идущих
            // матчей подряд (группа 'live', как у прежних кружков), кольцо — непросмотренные; название — к блоку
            <li>
              <div className={`group -mx-2 ${row} ${active === 'live' ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'}`}>
                <button type="button" onClick={playLive} aria-label="Сейчас в игре: смотреть разбор матчей" className="relative shrink-0 rounded-full">
                  <span aria-hidden className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.06]">
                    <StorySymbol k="live" tone="currentColor" className="h-[18px] w-[18px]" />
                  </span>
                  <PlayOverlay />
                  <StoryRing group="live" ids={day.liveItems.map((m) => m.id)} seen={seen} />
                </button>
                <a
                  href="/#live"
                  onClick={go('live', '/#live')}
                  aria-current={active === 'live' ? 'location' : undefined}
                  className="flex min-w-0 flex-1 items-center self-stretch"
                >
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate">Сейчас в игре</span>
                    <span className="mt-0.5 block truncate text-[12.5px] font-normal text-mute">{`${matchesN(day.live)} ${inLeagues(day.leagues.filter((l) => l.live).length)}`}</span>
                  </span>
                </a>
              </div>
            </li>
          ) : null}
          {top.map((l) => (
            <League key={l.id} l={l} list={day.leagues} />
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
                <League key={l.id} l={l} list={day.leagues} />
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
                <League key={l.id} l={l} list={day.tomorrow} jump={false} />
              ))}
            </ul>
          </section>
        ) : null}

        {!day.leagues.length ? <p className="mt-2 text-[13px] text-dim">Сегодня матчей нет.</p> : null}
        {/* правовой блок — ровно через 24px после последней строки, как «Выгодно сегодня» справа (владелец: «а отступы от
            историй до линии» — прижатый к низу панели блок давал над чертой то 24px, то 50px в зависимости от списка) */}
        <div className="shrink-0 pt-6">
          <Legal />
        </div>
      </div>
      </div>
    </div>
  )
}
