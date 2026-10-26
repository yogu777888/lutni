'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { SITE } from '@/config/site'
import type { CompactMatch } from '@/lib/compact'
import type { DayLeague, DayLeagues } from '@/lib/day-leagues'
import { leagueColor, leagueLogo } from '@/lib/league-logos'
import { useFavorites } from '../favorites'
import { LeagueMark } from '../LeagueMark'
import { TeamLogo } from '../TeamLogo'
import type { StoryGroup } from '@/lib/story-groups'
import { openStory, type StoryRow } from '../story/events'
import { circleQueue } from '../story/queue'
import { readSeen, SEEN_EVENT } from '../story/seen'
import { StorySymbol } from '../story/StorySymbol'
import { PanelToggle } from './PanelToggle'
import { useRailTip } from './RailTip'
import { matchesN, StateLine } from './StateLine'
import { LIVE, StoryRing } from './StoryRing'
import { Icon } from '@/components/Icon'

/** Кольцо турнира — оттенок логотипа, светлота и насыщенность общие (OKLCH L 0,74, C 0,12), как подборки справа
 * (владелец: «остальные истории в левом меню тоже как-то не очень» — цвета логотипов разной силы, красные спорили с «В игре») */
const ringTone = (id: number) => {
  const h = leagueColor(id)?.match(/oklch\([\d.]+ [\d.]+ ([\d.]+)\)/)?.[1]
  // чёрно-белый логотип или флаг — серый той же светлоты (белое кольцо было ярче цветных)
  return h ? `oklch(0.74 0.12 ${h})` : 'oklch(0.74 0 0)'
}
/** заливка круга турнира — оттенок кольца 14%, как круги подборок справа; без цвета (чёрно-белый логотип, флаг) — серый круг, как был */
const discFill = (id: number) => (leagueColor(id) ? `color-mix(in oklch, ${ringTone(id)} 14%, transparent)` : undefined)
/** заливка круга «Сейчас идут» — красным 14%, как круги подборок справа их цветом */
const LIVE_FILL = { background: `color-mix(in oklch, ${LIVE} 14%, transparent)` }

/** «в 1 турнире», «в 3 турнирах» — подпись у «Сейчас идут». */
const inLeagues = (n: number) => `в ${n} ${n % 10 === 1 && n % 100 !== 11 ? 'турнире' : 'турнирах'}`

/** При наведении на строку — белая ▶ на месте значка, как у подборок справа. */
function PlayOverlay() {
  return (
    <span aria-hidden className="absolute inset-0 grid place-items-center rounded-full bg-white text-ink opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
      <Icon k="play-fill" className="ml-0.5 h-3.5 w-3.5" />
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

/** Знак турнира в плашке 36px — как значки подборок в правой панели: логотип лиги кругом во всю плашку, флаг — 20px; нет ни того, ни другого (еврокубки без логотипа) — первая буква. */
function LeagueFlag({ l }: { l: Pick<DayLeague, 'id' | 'flag' | 'name'> }) {
  if (leagueLogo(l.id)) return <LeagueMark id={l.id} flag={l.flag} size={36} fill={discFill(l.id)} />
  return (
    <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.1]">
      <LeagueMark id={l.id} flag={l.flag} size={20} fallback={<span className="text-[12px] font-semibold text-dim">{l.name.charAt(0)}</span>} />
    </span>
  )
}

/**
 * Левая панель каркаса (от xl) — «Турниры дня», оглавление списка в центре (владелец согласился: вместо «Моих команд»
 * с пустым экраном для новичка): «Сейчас идут», топ-лиги и другие турниры с флагом, справа — сколько идёт (красным)
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
      {/* по строке на смысл (владелец: «как тебе футер, если честно?»): предупреждения вместе (были разорваны ссылками),
          раскрытие партнёрства простыми словами, ссылки, копирайт */}
      <p>
        <span className="font-semibold text-dim">18+</span> · Ставки — это риск. Не призыв делать ставки.
      </p>
      <p>Ссылки на букмекеров — партнёрские: мы можем получать вознаграждение.</p>
      {/* «·» приклеена к концу ссылки (nowrap): при переносе строка кончается точкой, а не начинается с «· Cookie»;
          без точек три ссылки одного цвета с текстом читались одной фразой «Как мы считаем Ответственная игра» */}
      <nav aria-label="Информация" className="flex flex-wrap gap-x-1">
        {[
          ['/about', 'Как мы считаем'],
          ['/o-proekte', 'О проекте'],
          ['/responsible-gaming', 'Ответственная игра'],
          ['/privacy', 'Cookie'],
        ].map(([href, label], i, all) => (
          <span key={href} className="whitespace-nowrap">
            <Link href={href} className={link}>
              {label}
            </Link>
            {i < all.length - 1 ? <span aria-hidden> ·</span> : null}
          </span>
        ))}
      </nav>
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
        // пока страницу не листали — ничего не подсвечено (иначе «Сейчас идут» выглядит выбранным пунктом)
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
  const SubText = ({ l }: { l: DayLeague }) => <StateLine total={l.total} live={l.live} next={l.next} started={l.started} pending={l.pending} same={l.same} />
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
      data-story-key={`league-${l.id}`}
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
      <StoryRing group={`league-${l.id}`} ids={l.items.map((m) => m.id)} seen={seen} color={ringTone(l.id)} />
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
  const liveGroup = (): StoryGroup => ({ key: 'live', label: 'Сейчас идут', short: 'Идут', kind: 'live', hint: '', href: '/#live', stat: '', items: day.liveItems.map((m) => ({ ...m, focus: null })) })
  // ряд кружков над историей на компьютере — те же круги, что в панели: «Сейчас идут» и турниры дня; у «Завтра» — свои, серыми кольцами
  const todayRow = (): StoryRow => ({
    title: 'Турниры дня',
    groups: [...(day.live ? [liveGroup()] : []), ...asGroups(day.leagues)],
    disc: (g, s) => storyDisc(g, s, false),
  })
  const storyDisc = (g: StoryGroup, s: Set<string>, muted: boolean) => {
    const ids = g.items.map((m) => m.id)
    if (g.key === 'live')
      return (
        <span className="relative grid h-9 w-9 place-items-center rounded-full" style={LIVE_FILL}>
          <StorySymbol k="live" tone={LIVE} className="h-[18px] w-[18px]" />
          <StoryRing group="live" ids={ids} seen={s} live />
        </span>
      )
    const l = [...day.leagues, ...day.tomorrow].find((x) => `league-${x.id}` === g.key)
    return (
      <span className="relative block h-9 w-9 rounded-full">
        {l ? <LeagueFlag l={l} /> : null}
        <StoryRing group={g.key} ids={ids} seen={s} muted={muted} color={l ? ringTone(l.id) : null} />
      </span>
    )
  }
  const play = (ls: DayLeague[], i: number) => (e: React.MouseEvent<HTMLButtonElement>) => {
    const groups = asGroups(ls)
    const { queue, startId } = circleQueue(groups, i, seen)
    const first = groups[i].items.find((m) => m.id === startId) ?? groups[i].items[0]
    const circles: StoryRow =
      ls === day.leagues ? todayRow() : { title: 'Завтра', groups, disc: (g, s) => storyDisc(g, s, true) }
    if (first) openStory({ id: startId, href: first.href, opener: e.currentTarget, queue, circles })
  }
  const playLive = (e: React.MouseEvent<HTMLButtonElement>) => {
    const live = liveGroup()
    const groups = [live, ...asGroups(day.leagues)]
    const { queue, startId } = circleQueue(groups, 0, seen)
    const first = live.items.find((m) => m.id === startId) ?? live.items[0]
    if (first) openStory({ id: startId, href: first.href, opener: e.currentTarget, queue, circles: todayRow() })
  }
  // строка: флаг — кнопка сторис (кольцо — непросмотренные матчи, при наведении — белая ▶), название — переход к блоку лиги
  const League = ({ l, list, jump = true }: { l: DayLeague; list: DayLeague[]; jump?: boolean }) => {
    const id = `league-${l.id}`
    const on = jump && active === id
    return (
      <li>
        {/* «Завтра» (jump=false) — тише сегодняшних (владелец согласился: 17 одинаково белых колец, четыре — про завтра):
            название серым, кольцо серое, флаг прозрачнее; при наведении — обычной яркости */}
        <div
          className={`group -mx-2 ${row} ${
            on ? 'bg-white/[0.07] text-fg' : jump ? 'text-fg/85 hover:bg-white/[0.04] hover:text-fg' : 'text-dim hover:bg-white/[0.04] hover:text-fg'
          }`}
        >
          <button
            type="button"
            data-story-key={`league-${l.id}`}
      onClick={play(list, list.indexOf(l))}
            aria-label={`${l.name}: смотреть разбор матчей`}
            className="relative shrink-0 rounded-full"
          >
            <span className={jump ? undefined : 'block opacity-60 transition-opacity group-hover:opacity-100'}>
              <LeagueFlag l={l} />
            </span>
            <PlayOverlay />
            <StoryRing group={id} ids={l.items.map((m) => m.id)} seen={seen} muted={!jump} color={ringTone(l.id)} />
          </button>
          <a
            href={l.href}
            onClick={jump ? go(id, l.href) : undefined}
            title={`${l.full} · ${matchesN(l.total)}${!jump && l.next ? ` · начало в ${l.next}` : ''}`}
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
      {/* свёрнута — полоска: «развернуть», «Сейчас идут» и флаги — истории с кольцами, как в правой полоске */}
      <div className="shell-l-rail scrollbar-none h-full flex-col items-center gap-3 overflow-y-auto py-3">
        <PanelToggle side="l" open={false} />
        {/* «Сейчас идут» — первым, как в развёрнутой */}
        {day.live ? (
          <button
            type="button"
            data-story-key="live"
            onClick={playLive}
            {...tipProps('Сейчас идут', `${matchesN(day.live)} ${inLeagues(day.liveLeagues)} · нажмите — разбор`)}
            aria-label="Сейчас идут: смотреть разбор матчей"
            style={LIVE_FILL}
            className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full transition-[filter] hover:brightness-150"
          >
            <StorySymbol k="live" tone={LIVE} className="h-[18px] w-[18px]" />
            <StoryRing group="live" ids={day.liveItems.map((m) => m.id)} seen={seen} live />
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
      <div className="scrollbar-none flex min-h-0 flex-1 flex-col overflow-y-auto p-4 edge-fade">
        <h2 className="sticky -top-4 z-10 -mx-4 -mt-4 flex items-center justify-between bg-panel px-4 pb-2 pt-4 text-[15px] font-semibold after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-4 after:bg-linear-to-b after:from-panel after:to-transparent after:content-['']">
          Турниры дня
          <PanelToggle side="l" open />
        </h2>

        {/* избранные команды (звёздочка на странице матча) — первыми, как «Ваши команды» в центре (владелец: «было бы логичнее если
            бы в левом меню мои команды были сверху») */}
        {favs.length ? (
          <section className="mt-2">
            <h3 className="text-[12px] font-medium text-mute">Мои команды</h3>
            <ul className="mt-1.5 space-y-0.5">
              {favs.map((t) => {
                const g = gameOf(t.id)
                const body = (
                  <>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.06]">
                      <TeamLogo name={t.name} src={t.logo ?? null} size={20} />
                    </span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate">{t.name}</span>
                      <span className={`mt-0.5 block truncate text-[12.5px] font-normal ${g?.live ? 'text-live' : 'text-dim'}`}>{lineOf(g)}</span>
                    </span>
                  </>
                )
                return (
                  <li key={t.id}>
                    {g ? (
                      <Link href={g.href} prefetch={false} className={`-mx-2 ${row} hover:bg-white/[0.04]`}>
                        {body}
                      </Link>
                    ) : (
                      <div className={`-mx-2 ${row}`}>{body}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}

        {/* с избранными сверху — подпись «Сегодня», иначе турниры читались бы продолжением «Моих команд» */}
        {favs.length ? <h3 className="mt-5 text-[12px] font-medium text-mute">Сегодня</h3> : null}
        <ul className={`${favs.length ? 'mt-1.5' : 'mt-2'} space-y-0.5`}>
          {day.live ? (
            // «Сейчас идут» — тоже история (владелец: «а почему у сейчас в игре нет сторис?»): значок — сторис идущих
            // матчей подряд (группа 'live', как у прежних кружков), кольцо — непросмотренные; название — к блоку
            <li>
              <div className={`group -mx-2 ${row} ${active === 'live' ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'}`}>
                <button type="button" data-story-key="live"
            onClick={playLive} aria-label="Сейчас идут: смотреть разбор матчей" className="relative shrink-0 rounded-full">
                  <span aria-hidden className="grid h-9 w-9 place-items-center rounded-full" style={LIVE_FILL}>
                    <StorySymbol k="live" tone={LIVE} className="h-[18px] w-[18px]" />
                  </span>
                  <PlayOverlay />
                  <StoryRing group="live" ids={day.liveItems.map((m) => m.id)} seen={seen} live />
                </button>
                <a
                  href="/#live"
                  onClick={go('live', '/#live')}
                  aria-current={active === 'live' ? 'location' : undefined}
                  className="flex min-w-0 flex-1 items-center self-stretch"
                >
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate">Сейчас идут</span>
                    <span className="mt-0.5 block truncate text-[12.5px] font-normal text-mute">{`${matchesN(day.live)} ${inLeagues(day.liveLeagues)}`}</span>
                  </span>
                </a>
              </div>
            </li>
          ) : null}
          {top.map((l) => (
            <League key={l.id} l={l} list={day.leagues} />
          ))}
        </ul>

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
