'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { SITE } from '@/config/site'
import type { CompactMatch } from '@/lib/compact'
import type { DayLeague, DayLeagues } from '@/lib/day-leagues'
import { leagueLogo } from '@/lib/league-logos'
import { useFavMatches, useFavorites } from '../favorites'
import { ymdInTz } from '@/lib/format'
import { LeagueMark, PLATE, ShadowCrest } from '../LeagueMark'
import { PlateMark } from '../story/GroupMark'
import { CrestPlate } from '../CrestPlate'
import type { StoryGroup } from '@/lib/story-groups'
import { openStory, type StoryRow } from '../story/events'
import { circleQueue } from '../story/queue'
import { readSeen, SEEN_EVENT } from '../story/seen'
import { edgeScroll } from './edge-scroll'
import { PanelToggle } from './PanelToggle'
import { useRailTip } from './RailTip'
import { matchesN, StateLine } from './StateLine'
import { LIVE, StoryRing } from './StoryRing'
import { Icon } from '@/components/Icon'

/** круг «Сейчас идут» — на светлой подложке, как все круги историй (владелец: «и идут с выгодно тоже подложку»); красный — у знака и кольца */
/** «в 1 турнире», «в 3 турнирах» — подпись у «Сейчас идут». */
const inLeagues = (n: number) => `в ${n} ${n % 10 === 1 && n % 100 !== 11 ? 'турнире' : 'турнирах'}`

/** При наведении на строку — белая ▶ на месте значка, как у подборок справа. */
function PlayOverlay() {
  return (
    // лёгкая вуаль и «плей» в тёмном кружке — логотип под ними виден (владелец: «наводишь — а лого не видно»)
    <span aria-hidden className="absolute inset-0 grid place-items-center rounded-full bg-white/25 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
      <span className="grid h-5 w-5 place-items-center rounded-full bg-ink/55 text-white">
        <Icon k="play-fill" className="ml-px h-2.5 w-2.5" />
      </span>
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
  // все круги историй — на светлой подложке `PLATE`, как эмблемы подборок справа (владелец: «давай на все истории подложку»)
  if (leagueLogo(l.id)) return <LeagueMark id={l.id} flag={l.flag} size={36} light />
  // флаг — кругом с той же длинной тенью, что у логотипов (владелец: «если вместо логотипа лиги флаг — сделать им тень тоже»)
  if (l.flag)
    return (
      <span aria-hidden className="grid h-9 w-9 shrink-0 grid-cols-1 grid-rows-1 place-items-center overflow-hidden rounded-full" style={{ background: PLATE }}>
        <ShadowCrest src={`/flags/${l.flag}.svg`} tile="round" style={{ width: 20, height: 20 }} />
      </span>
    )
  return (
    <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: PLATE }}>
      <span className="text-[12px] font-semibold text-ink/70">{l.name.charAt(0)}</span>
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
  // избранные матчи сегодня (звёздочка в шапке матча)
  const favGames = useFavMatches()
    .filter((g) => ymdInTz(g.ts) === today)
    .map((g) => g.id)
    .join(',')
  const [games, setGames] = useState<CompactMatch[]>([])
  // «текущая» лига подсвечивается напрямую в DOM (`data-on` у строки, `aria-current` у ссылки), без состояния React: при
  // прокрутке она меняется часто, и перерисовка всей панели (кольца, эмблемы с тенью) давала задачи по 20–30 мс — центр
  // подлагивал (владелец: «всё равно подлагивает, а я хочу чтоб летало»)
  const setActive = (id: string | null) => {
    document.querySelectorAll<HTMLElement>('[data-row][data-on]').forEach((el) => {
      if (el.dataset.row === id) return
      delete el.dataset.on
      el.querySelector('a[aria-current]')?.removeAttribute('aria-current')
    })
    const el = id ? document.querySelector<HTMLElement>(`[data-row="${id}"]`) : null
    if (el && !('on' in el.dataset)) {
      el.dataset.on = ''
      el.querySelector('a')?.setAttribute('aria-current', 'location')
    }
  }
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
    if (!ids && !favGames) return
    let stop = false
    const load = () =>
      fetch(`/api/favorites?teams=${ids}&matches=${favGames}&date=${today}`)
        .then((r) => r.json())
        .then((d) => !stop && setGames(d.items ?? []))
        .catch(() => {})
    load()
    const t = setInterval(load, 60_000)
    return () => {
      stop = true
      clearInterval(t)
    }
  }, [ids, favGames, today])

  // пришли по ссылке «/#league-…» — раскрыть и прокрутить; дальше — какая лига сейчас вверху центра
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (hash.startsWith('league-') || hash === 'live') setTimeout(() => reveal(hash), 50)
    const blocks = [...document.querySelectorAll<HTMLElement>('#live, [id^="league-"]')]
    if (!blocks.length) return setActive(null)
    // какие блоки сейчас в полосе: колбэк получает только изменившиеся, и без общего набора подсветка «залипала» —
    // вернулись наверх к «Избранному», «Сейчас идут» ушёл из полосы вниз, а в панели оставался выбранным (скриншот владельца)
    const inBand = new Map<string, number>()
    // пока страницу не листали — ничего не подсвечено (иначе «Сейчас идут» выглядит выбранным пунктом)
    const pick = () => {
      if (window.scrollY < 40) return setActive(null)
      const top = [...inBand].sort((a, b) => a[1] - b[1])[0]
      setActive(top ? top[0] : null)
    }
    // переход через 40px сверху колбэк не вызывает (блок как был в полосе, так и остался) — пересчитываем сами, только на
    // пересечении порога, а не на каждом кадре прокрутки
    let low = window.scrollY < 40
    const onScroll = () => {
      if (window.scrollY < 40 !== low) {
        low = !low
        pick()
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) inBand.set(e.target.id, e.boundingClientRect.top)
          else inBand.delete(e.target.id)
        }
        pick()
      },
      // «текущая» — та, что пересекает полосу чуть ниже шапки и липкой строки дней
      { rootMargin: '-150px 0px -70% 0px' },
    )
    blocks.forEach((b) => io.observe(b))
    return () => {
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
    }
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
  // избранные матчи — отдельными строками, кроме матчей избранных команд: они и так в строке команды
  const favSet = new Set(favs.map((t) => t.id))
  const starred = favGames
    ? games.filter((g) => favGames.split(',').includes(String(g.id)) && !favSet.has(g.home.id) && !favSet.has(g.away.id))
    : []
  const anyFav = favs.length > 0 || starred.length > 0
  const lineOf = (g: CompactMatch | undefined) =>
    // идёт — счёт серым, как вся подпись, красная только минута (красный — «идёт», счёт в строках центра тоже не красный)
    g ? (g.live ? (<>{`${g.score?.[0] ?? 0} : ${g.score?.[1] ?? 0} · `}<span className="text-live">{g.minute}</span></>) : g.finished && g.score ? `${g.score[0]} : ${g.score[1]} · итог` : `Сегодня в ${g.time}`) : 'Сегодня не играет'

  const top = day.leagues.filter((l) => l.top)
  const rest = day.leagues.filter((l) => !l.top)
  // строки — как в правой панели: значок в круге 36px, название 14,5px, справа число
  // без `transition-colors`: подсветка «текущей» лиги меняется на ходу прокрутки, и плавная смена фона перерисовывала
  // строку каждый кадр вместе с тенями эмблем (SVG-фильтр) — центр подлагивал (замер: растр при прокрутке ×4)
  const row = 'flex items-center gap-3 rounded-tile py-1.5 pl-2 pr-2.5 text-[14.5px] font-medium'
  // справа всегда число матчей, тихо (один столбец — один смысл); сколько идёт — красным в подписи
  // подпись под названием — сколько матчей и что с турниром (`StateLine`, общая с правой панелью); страны нет — её
  // говорит флаг, полное название — в подсказке; цифры справа нет — голая «10» читалась как счётчик непрочитанных
  const subText = (l: DayLeague) => <StateLine total={l.total} live={l.live} next={l.next} started={l.started} pending={l.pending} same={l.same} />
  const sub = (l: DayLeague) => (
    <span className="mt-0.5 block truncate text-[12.5px] font-normal text-mute">
      {subText(l)}
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
          {subText(l)} · нажмите — разбор
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
  const name = (l: DayLeague, withSub = true) => (
    <span className="min-w-0 flex-1 leading-tight">
      <span className="block truncate">{l.name}</span>
      {withSub ? sub(l) : null}
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
        <span className="relative grid h-9 w-9 place-items-center rounded-full">
          <PlateMark sym="live" logo={day.liveLogo} className="h-[18px] w-[18px]" crest="h-[22px] w-[22px]" />
          <StoryRing group="live" ids={ids} seen={s} live />
        </span>
      )
    const l = [...day.leagues, ...day.tomorrow].find((x) => `league-${x.id}` === g.key)
    return (
      <span className="relative block h-9 w-9 rounded-full">
        {l ? <LeagueFlag l={l} /> : null}
        <StoryRing group={g.key} ids={ids} seen={s} muted={muted} />
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
  // строки — функциями, а не компонентами (`<League/>`, объявленный в рендере, — новый тип на каждую отрисовку: при
  // смене подсвеченной лиги во время прокрутки React пересоздавал все строки с кольцами и тенями эмблем — центр подлагивал)
  // строка: флаг — кнопка сторис (кольцо — непросмотренные матчи, при наведении — белая ▶), название — переход к блоку лиги
  const league = (l: DayLeague, list: DayLeague[], jump = true) => {
    const id = `league-${l.id}`
    return (
      <li key={l.id}>
        {/* «Завтра» (jump=false) — тише сегодняшних (владелец согласился: 17 одинаково белых колец, четыре — про завтра):
            название серым, кольцо серое, флаг прозрачнее; при наведении — обычной яркости */}
        <div
          data-row={jump ? id : undefined}
          className={`group -mx-2 ${row} ${
            jump ? 'text-fg/85 hover:bg-white/[0.04] hover:text-fg data-[on]:bg-white/[0.07] data-[on]:text-fg' : 'text-dim hover:bg-white/[0.04] hover:text-fg'
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
            <StoryRing group={id} ids={l.items.map((m) => m.id)} seen={seen} muted={!jump} />
          </button>
          <a
            href={l.href}
            onClick={jump ? go(id, l.href) : undefined}
            title={`${l.full} · ${matchesN(l.total)}${!jump && l.next ? ` · начало в ${l.next}` : ''}`}
            className="flex min-w-0 flex-1 items-center self-stretch"
          >
            {name(l, jump)}
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
            className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full transition-[filter] hover:brightness-150"
          >
            <PlateMark sym="live" logo={day.liveLogo} className="h-[18px] w-[18px]" crest="h-[22px] w-[22px]" />
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
      <div ref={edgeScroll} className="scrollbar-none flex min-h-0 flex-1 flex-col overflow-y-auto p-4 edge-fade">
        <h2 className="sticky -top-4 z-10 -mx-4 -mt-4 flex items-center justify-between bg-panel px-4 pb-2 pt-4 text-[15px] font-semibold edge-top">
          Турниры дня
          <PanelToggle side="l" open />
        </h2>

        {/* избранное — первым, как «Избранное» в центре (владелец: «было бы логичнее если бы в левом меню мои команды были
            сверху»): избранные матчи сегодня (звёздочка в шапке матча) — эмблемы внахлёст, «Барселона — Леванте» и время или
            счёт; ниже избранные команды (звёздочка у названия команды) и их матч сегодня */}
        {anyFav ? (
          <section className="mt-2">
            <h3 className="text-[12px] font-medium text-mute">Избранное</h3>
            <ul className="mt-1.5 space-y-0.5">
              {starred.map((g) => (
                <li key={`m${g.id}`}>
                  <Link href={g.href} prefetch={false} className={`-mx-2 ${row} hover:bg-white/[0.04]`}>
                    {/* две подложки по диагонали в квадрате 36px — как круг избранной команды ниже: названия начинаются с одного
                        места (в ряд внахлёст пара выходила 44px, и «Бетис — Хетафе» стоял правее «Осасуны» — скриншот владельца) */}
                    <span aria-hidden className="relative h-9 w-9 shrink-0">
                      <CrestPlate name={g.home.name} logo={g.home.logo} size={22} crest={0.72} className="absolute left-0 top-0" />
                      <CrestPlate name={g.away.name} logo={g.away.logo} size={22} crest={0.72} className="absolute bottom-0 right-0 ring-2 ring-panel" />
                    </span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="line-clamp-2">
                        {g.home.name} — {g.away.name}
                      </span>
                      <span className={`mt-0.5 block truncate text-[12.5px] font-normal text-dim`}>{lineOf(g)}</span>
                    </span>
                  </Link>
                </li>
              ))}
              {favs.map((t) => {
                const g = gameOf(t.id)
                const body = (
                  <>
                    <CrestPlate name={t.name} logo={t.logo} size={36} />
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate">{t.name}</span>
                      <span className={`mt-0.5 block truncate text-[12.5px] font-normal text-dim`}>{lineOf(g)}</span>
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

        {/* с избранным сверху — подпись «Сегодня», иначе турниры читались бы продолжением «Избранного» */}
        {anyFav ? <h3 className="mt-5 text-[12px] font-medium text-mute">Сегодня</h3> : null}
        <ul className={`${anyFav ? 'mt-1.5' : 'mt-2'} space-y-0.5`}>
          {day.live ? (
            // «Сейчас идут» — тоже история (владелец: «а почему у сейчас в игре нет сторис?»): значок — сторис идущих
            // матчей подряд (группа 'live', как у прежних кружков), кольцо — непросмотренные; название — к блоку
            <li>
              <div data-row="live" className={`group -mx-2 ${row} hover:bg-white/[0.04] data-[on]:bg-white/[0.07]`}>
                <button type="button" data-story-key="live"
            onClick={playLive} aria-label="Сейчас идут: смотреть разбор матчей" className="relative shrink-0 rounded-full">
                  <span aria-hidden className="relative block h-9 w-9 rounded-full">
                    <PlateMark sym="live" logo={day.liveLogo} className="h-[18px] w-[18px]" crest="h-[22px] w-[22px]" />
                  </span>
                  <PlayOverlay />
                  <StoryRing group="live" ids={day.liveItems.map((m) => m.id)} seen={seen} live />
                </button>
                <a
                  href="/#live"
                  onClick={go('live', '/#live')}
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
          {top.map((l) => league(l, day.leagues))}
        </ul>

        {rest.length ? (
          <section className="mt-5">
            <h3 className="text-[12px] font-medium text-mute">Другие турниры</h3>
            <ul className="mt-1.5 space-y-0.5">
              {rest.map((l) => league(l, day.leagues))}
            </ul>
          </section>
        ) : null}

        {/* завтра — турниры следующего дня: клик — список «Матчи» на завтра, сразу к блоку лиги */}
        {day.tomorrow.length ? (
          <section className="mt-5">
            <h3 className="text-[12px] font-medium text-mute">Завтра</h3>
            <ul className="mt-1.5 space-y-0.5">
              {day.tomorrow.map((l) => league(l, day.tomorrow, false))}
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
