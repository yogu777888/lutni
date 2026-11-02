'use client'

import Link from 'next/link'
import { BlockMore } from '../BlockMore'
import { useEffect, useState } from 'react'
import type { CompactMatch } from '@/lib/compact'
import type { DayPicks, ValueRow } from '@/lib/day-picks'
import { goHref, SPONSORED_REL } from '@/lib/affiliate'
import { CrestPlate } from '../CrestPlate'
import { PartnerBadge } from '../PartnerBadge'
import { openStory, type StoryRow } from '../story/events'
import { circleQueue } from '../story/queue'
import { readSeen, SEEN_EVENT } from '../story/seen'
import { symbolSoft } from '../story/StorySymbol'
import { GroupBadge, GroupMark, PlateMark } from '../story/GroupMark'

const valueLogo = (v: ValueRow) => (v.side === 'away' ? v.awayLogo || v.homeLogo : v.homeLogo || v.awayLogo)
import { PLATE } from '../LeagueMark'
import { pluralN } from '@/lib/format'
import { edgeScroll } from './edge-scroll'
import { PanelToggle } from './PanelToggle'
import { useRailTip } from './RailTip'
import { matchesN, StateLine, stateText } from './StateLine'
import { StoryRing } from './StoryRing'
import { Icon } from '@/components/Icon'
import { Hint } from '@/components/match/Hint'
import { TitleIcon } from '@/components/Section'

/** Заглавная первая буква строкой, а не `first-letter:uppercase`: Safari не применяет `::first-letter` у `line-clamp`
 * (`-webkit-box`) — «победа Аякс» со строчной. */
const capFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const BETS = ['ставка', 'ставки', 'ставок'] as const
/** «Выгодно сегодня» — названия без кавычек (владелец: «может в блоке выгодно сегодня не писать названия команд в скобках?»):
 *  в узкой панели кавычки вокруг каждого названия — лишний шум; в подсказке плашки — как было */
const plain = (s: string) => s.replace(/[«»]/g, '')

const Play = ({ className = '' }: { className?: string }) => (
  <Icon k="play-fill" className={className} />
)

/**
 * Справа в строке матча — одно правило (владелец согласился: в «Топ дня» стояли «1·4», «8», «+7» без подписи): сверху —
 * главная цифра подборки (только у подборок-тегов: «−17%»), без неё — счёт или время; ниже мелко — состояние:
 * минута красным / «итог» / время начала. Одинокой красной точки рядом с цифрой нет — она читалась частью сигнала.
 */
function Right({ m, stat, hot }: { m: CompactMatch; stat?: string; hot: boolean }) {
  const score = m.score ? `${m.score[0]}:${m.score[1]}` : ''
  const top = stat ?? (m.live || m.finished ? score : m.time)
  const topTone = stat ? (hot ? 'text-hot' : 'text-fg') : m.live ? 'text-fg' : 'text-dim'
  const state = m.live ? m.minute : m.finished ? 'итог' : stat ? m.time : null
  return (
    <span className="num shrink-0 text-right leading-tight">
      <span className={`block text-[13px] font-semibold ${topTone}`}>{top}</span>
      {state ? <span className={`block text-[11.5px] font-medium ${m.live ? 'text-live' : 'text-mute'}`}>{state}</span> : null}
    </span>
  )
}

/**
 * Правая панель каркаса (от xl) — «Подборки дня» (владелец: «в центре просто матчи по лигам, а сортированные — в
 * боковой виджет; название, рядом кнопка просмотра историй, снизу раскрытие матчей»): строка подборки — знак, название,
 * число матчей и белая ▶ (сторис по всей подборке подряд, с первого непросмотренного); клик по названию раскрывает
 * матчи строками (эмблемы, команды, главная цифра / время / счёт) и «Все N матчей →» (страница тега).
 * Свёрнута — полоска со значками подборок.
 */
/**
 * «Выгодно сегодня» внизу панели (владелец согласился: блок ушёл из центра, а нижняя половина панели пустовала):
 * до трёх лучших выгодных ставок дня — сначала по линии PARI, не хватает — у других легальных партнёров (владелец: «а можно
 * блок выгодно сегодня сделать только про пари?», потом «сначала PARI, потом остальные»: у PARI выгодные бывают редко,
 * и блок почти всегда пустовал): исход словами и лаймовый кэф — ссылка к букмекеру (`goHref(…, 'panel')`, rel=sponsored);
 * все — PARI: он в заголовке («PARI · Реклама · 18+»), иначе букмекер подписан под каждой плашкой; у PARI
 * пусто, а у других есть — строка «У PARI сегодня выгодных нет…»; совсем нет — так и пишем, а не прячем блок (пропадающий
 * блок выглядит поломкой); внизу «Все выгодные ставки →» — по всем легальным партнёрам (/tag/value).
 */
/** `card` — отдельной панелью (ниже xl правой панели нет, блок стоит в боковой колонке списка — `Sidebar`). */
/**
 * «Выгодно сегодня» с выбором букмекера (`OddsPick`; владелец: «если выбираешь марафон то блок выгодное сегодня показывает
 * кэфы марафон?»): выбора нет — как было (сначала PARI, потом другие); выбран партнёр — только его выгодные (`by`, по его
 * линии), нет у него — «Сегодня у Марафон выгодных ставок нет»; «Без кэфов» — блока нет. Варианты — все в разметке
 * (`data-bk`), нужный показывает CSS (lib/odds-pick.ts), как кэфы в строках.
 */
export function ValueBlock({ rows, by = {}, card = false }: { rows: ValueRow[]; by?: DayPicks['valuesBy']; card?: boolean }) {
  const slugs = Object.keys(by)
  if (!slugs.length) return <ValueBody rows={rows} card={card} />
  return (
    <>
      <div data-bk="*" data-bk-first="">
        <ValueBody rows={rows} card={card} />
      </div>
      {slugs.map((slug) => (
        <div key={slug} data-bk={slug}>
          <ValueBody rows={by[slug].rows} card={card} book={by[slug].name} />
        </div>
      ))}
    </>
  )
}

function ValueBody({ rows, card = false, book }: { rows: ValueRow[]; card?: boolean; book?: string }) {
  // все ставки одного букмекера: он назван в заголовке, как было; есть другие — подписан каждый кэф (имя другого букмекера в
  // заголовке не влезало в 288px: «Марафон · Реклама · 18+» переносилось вместе с «Выгодно сегодня»)
  const one = book ?? (rows.length > 0 && rows.every((r) => r.slug === 'pari') ? 'PARI' : null)
  return (
    // карточкой (под списком ниже xl) — заголовок над ней, на фоне страницы, как блоки лиг и разделы матча
    <section className={card ? 'relative min-w-0' : 'relative mt-6 border-t border-edge pt-4'}>
      <h3 className={`relative flex justify-between ${card ? 'mb-2.5 items-center px-4 text-[20px] font-bold leading-tight tracking-[-0.01em] sm:px-5' : 'items-baseline text-[15px] font-semibold'}`}>
        {/* ⓘ — почему «выгодно» (владелец согласился: объяснение было только в подсказке плашки, её почти никто не находит);
            простыми словами и с примером, без «заработать»: оценка, а не гарантия. `Hint` — по нажатию тоже (владелец: «на
            телефоне в блоке выгодно сегодня не работает значок пояснение» — окошко открывалось только наведением и фокусом,
            а Safari на iPhone кнопку по нажатию в фокус не ставит); окошко — под заголовком (`relative` у h3) */}
        <span className="flex items-baseline whitespace-nowrap">
          Выгодно сегодня
          <span className="text-[15px] font-normal">
            <Hint
              title="Почему «выгодно»"
              text="Кэф выше, чем стоит исход по кэфам всех букмекеров без маржи. Например, у победы шанс 40% — честный кэф 2.50, а букмекер платит 2.68. Расчёт, а не гарантия · 18+"
            />
          </span>
        </span>
        {/* карточкой — справа значок раздела, как у «Интересно сегодня» (владелец: «а справа от выгодно сегодня будем иконку
            делать как у интересное сегодня?» — «да»); в узкой правой панели — нет: там у заголовков значков нет */}
        {card ? <TitleIcon href="/tag/value" label="Все выгодные ставки" /> : null}
      </h3>
      {/* в узкой панели пометка — строкой под заголовком: справа от него «Марафон · Реклама · 18+» в 288px переносилось,
          заголовок ломался в две строки, а ⓘ прилипал к пометке (владелец прислал скриншот: «блок выгодно сегодня
          немного пофиксить надо») */}
      {rows.length && !card ? <p className="mt-0.5 text-[12px] text-mute">{one ? `${one} · ` : ''}Реклама · 18+</p> : null}
      {/* карточкой — строки через черту от края до края карточки, как «Где ставить» под ним и все списки (владелец: «правильно
          что в ставках разделительные линии не до конца?»), и крупнее: 15/13px и плашка 40px (владелец прислал вариант
          ChatGPT; в узкой правой панели — как было) */}
      <div className={card ? 'card px-4 pb-4 sm:px-5' : ''}>
      {rows.length ? null : <p className={`${card ? 'py-4' : 'mt-2'} text-[13px] text-dim`}>{book ? `Сегодня у ${book} выгодных ставок нет.` : 'Сегодня выгодных ставок нет.'}</p>}
      {/* у PARI пусто, а у других есть — так и пишем: главного партнёра в блоке не видно, и это не поломка */}
      {!book && rows.length && !rows.some((r) => r.slug === 'pari') ? (
        <p className={`${card ? 'pt-3 text-[13px]' : 'mt-1.5 text-[12.5px]'} leading-snug text-mute`}>У PARI сегодня выгодных нет — у других легальных букмекеров:</p>
      ) : null}
      <ul className={card ? '-mx-4 divide-y divide-edge sm:-mx-5' : 'mt-2 space-y-1'}>
        {rows.map((r) => (
          // без круга с эмблемами слева (владелец согласился: эмблемы по 16px внахлёст не различить, а круг съедал место —
          // вторая строка не влезала даже как «с «Мидлсбро»», и «с» после времени читалось как «с 21:00» строкой выше)
          <li key={r.id} className={card ? 'flex items-center gap-3 px-4 py-3.5 sm:px-5' : '-mx-2 flex items-center gap-3 rounded-tile px-2 py-1.5 transition-colors hover:bg-white/[0.04]'}>
            {/* главное — на что ставка (сверху, белым, в узкой панели — в две строки, не обрезаем); матч и время — ниже серым: обрезается второстепенное */}
            <Link href={r.href} prefetch={false} className="min-w-0 flex-1 leading-tight">
              <span className={`line-clamp-2 ${card ? 'text-[15px] font-semibold' : 'text-[13.5px] font-medium'} `}>{capFirst(plain(r.outcome))}</span>
              {/* вторая строка — время и матч (владелец: «как тебе выгодно сегодня, только честно?» — «Марафон · 22:00 ·
                  Саутгемпт…» обрезало матч, а букмекер посетителю важен меньше всего) */}
              <span className={`mt-0.5 line-clamp-2 ${card ? 'text-[13px]' : 'text-[12.5px]'} text-dim`}>
                {/* ставка на победу команды — она уже названа строкой выше, здесь только соперник («с «Мидлсбро»»): в 288px
                    «Саутгемптон — Мидлсбро» и даже «против «Мидлсбро»» обрезались; длинное — переносом, не многоточием */}
                {r.time} · {r.side === 'home' ? `против ${r.away}` : r.side === 'away' ? `против ${r.home}` : `${r.home} — ${r.away}`}
              </span>
            </Link>
            {/* кнопка — как в «Выгодных ставках» (владелец: «давай в блоке выгодно сегодня так же кнопки сделаем?»): знак букмекера
                рядом на цвете карточки, лаймовая рамка — только вокруг кэфа; наведение и фокус — кэф заливается лаймом, нажатие —
                сжимается. Имени букмекера под кнопкой больше нет — его говорит знак (полное — в подсказке и для диктора) */}
            <a
              href={goHref(r.slug, 'panel', r.id)}
              target="_blank"
              rel={SPONSORED_REL}
              title={`${r.outcome}: ${r.odd.toFixed(2)} в ${r.bookmaker}${r.ev ? ` — выше честной цены на ${Math.round(r.ev * 100)}%` : ''} · Реклама 18+`}
              aria-label={`${r.odd.toFixed(2)} в ${r.bookmaker}`}
              className={`group/odd flex shrink-0 items-center transition-transform duration-150 active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100 ${card ? 'h-11 w-[108px] gap-2' : 'h-9 w-[92px] gap-1.5'}`}
            >
              <PartnerBadge partner={{ slug: r.slug }} size={card ? 36 : 28} />
              <span className="flex h-full flex-1 rounded-tile bg-acid p-1">
                <span className={`num grid flex-1 place-items-center rounded-lg bg-panel font-bold text-fg transition-colors duration-150 group-hover/odd:bg-acid group-hover/odd:text-ink group-focus-visible/odd:bg-acid group-focus-visible/odd:text-ink ${card ? 'text-[17px]' : 'text-[15px]'}`}>
                  {r.odd.toFixed(2)}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      <BlockMore href="/tag/value" panel={!card} className={card ? '-mx-4 -mb-4 sm:-mx-5' : ''}>
        Все выгодные ставки
      </BlockMore>
      </div>
      {/* карточкой — пометка под карточкой справа, как «PARI · Реклама · 18+» под блоками лиг (владелец: «может бк реклама вниз
          перенести? а то ломает блок изза марафона» — справа от заголовка «Марафон · Реклама · 18+» на телефоне переносилось) */}
      {rows.length && card ? <p className="mt-2 px-4 text-right text-[12px] text-mute sm:px-5">{one ? `${one} · ` : ''}Реклама · 18+</p> : null}
    </section>
  )
}

/** Сколько подборок видно сразу, если их больше `FOLD_FROM`; остальные — под «Ещё N» (прятать одну-две нет смысла). */
const SHOWN = 7
const FOLD_FROM = 10

export function RightPanel({ picks }: { picks: DayPicks }) {
  const [open, setOpen] = useState<string | null>(null)
  const [all, setAll] = useState(false)
  const [seen, setSeen] = useState<Set<string>>(() => new Set())
  useEffect(() => {
    const update = () => setSeen(readSeen())
    update()
    window.addEventListener(SEEN_EVENT, update)
    return () => window.removeEventListener(SEEN_EVENT, update)
  }, [])

  const { groups, matches, stats, totals, states, teams } = picks
  // подпись подборки — её команды, как исполнители под плейлистом в YouTube Music (владелец: «может в подборках справа
  // писать в описании не сколько матчей будет а какие команды?» — «да»); у всех подборок, и у «Скоро начнутся»; без
  // «и ещё N» — строка просто обрывается многоточием (владелец: «ты только название команды одной написал и мне кажется
  // что писать цифру сколько еще не нужно?»); число матчей и время — в подсказке
  // две команды и «и другие», как у плейлиста (владелец: «а зачем ты аж 4 команды написал? я думаю 2 достаточно? и где надпись
  // типа и другие»); названия — только целиком (владелец: «сейчас длинные описания получились?» — строки обрывались на
  // полуслове): не влезают две (~25 знаков в панели обычной ширины) — одна
  const teamLine = (k: string) => {
    const all = teams?.[k]
    if (!all?.length) return null
    const tail = all.length > 2 ? ' и другие' : ''
    const two = `${all.slice(0, 2).join(', ')}${tail}`
    return two.length <= 25 || all.length < 2 ? two : `${all[0]} и другие`
  }
  const stateOf = (k: string, n: number) => (states[k] ? stateText({ total: n, ...states[k], soon: k === 'soon', ahead: true }) : '')
  // впереди ничего нет (все сыграны или идут) — подпись тише
  const done = (k: string) => !states[k]?.pending
  const { tipProps, tipNode } = useRailTip('r', 'shell-r-rail')
  const fold = groups.length >= FOLD_FROM
  // ряд кружков над историей на компьютере — те же круги подборок, что в панели
  const row: StoryRow = {
    title: 'Подборки дня',
    groups,
    disc: (g, s) => (
      <span className="relative grid h-9 w-9 place-items-center rounded-full" style={{ background: `color-mix(in oklch, ${symbolSoft(g.key)} 14%, transparent)` }}>
        <GroupMark g={g} className="h-[18px] w-[18px]" crest="h-[22px] w-[22px]" />
        <StoryRing group={g.key} ids={g.items.map((it) => it.id)} seen={s} />
        {/* знак подборки на углу, как у кружков на телефоне; обводка — цветом фона блока историй */}
        <GroupBadge g={g} className="-right-[7px] -top-[7px] h-[18px] w-[18px] border-[1.5px] border-ink" />
      </span>
    ),
  }
  const play = (gi: number, e: React.MouseEvent<HTMLButtonElement>) => {
    const { queue, startId } = circleQueue(groups, gi, seen)
    const first = groups[gi].items.find((it) => it.id === startId) ?? groups[gi].items[0]
    openStory({ id: startId, href: first.href, opener: e.currentTarget, queue, circles: row })
  }
  const moreHref = (key: string) => (key === 'soon' ? '/matches?sort=time' : key === 'top' ? null : `/tag/${key}`)

  return (
    <div className="relative h-full overflow-hidden rounded-card bg-panel">
      {/* свёрнута — полоска: «развернуть» и значки подборок (тап — сторис подборки) */}
      <div className="shell-r-rail scrollbar-none h-full flex-col items-center gap-3 overflow-y-auto py-3">
        <PanelToggle side="r" open={false} />
        {/* значки — круги 36px, как флаги в левой полоске; подсказка — название, число матчей и что внутри, клик — разбор */}
        {groups.map((g, gi) => (
          <button
            key={g.key}
            type="button"
            data-story-key={g.key}
            onClick={(e) => play(gi, e)}
            {...tipProps(
              g.label,
              states[g.key] ? (
                <>
                  <StateLine total={totals[g.key] ?? g.items.length} {...states[g.key]} soon={g.key === 'soon'} ahead /> · нажмите — разбор
                </>
              ) : (
                'Нажмите — разбор'
              ),
            )}
            className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full transition-[filter] hover:brightness-150"
            style={{ background: `color-mix(in oklch, ${symbolSoft(g.key)} 14%, transparent)` }}
          >
            <GroupMark g={g} className="h-[18px] w-[18px]" crest="h-[22px] w-[22px]" />
            <StoryRing group={g.key} ids={g.items.map((it) => it.id)} seen={seen} />
            {/* в полоске названий нет — какая это подборка, говорит значок на углу (эмблема «Барселоны» этого не скажет) */}
            <GroupBadge g={g} className="-right-[7px] -top-[7px] h-[18px] w-[18px] border-[1.5px] border-panel" />
          </button>
        ))}
        {/* «Выгодно сегодня» не пропадает целиком: лаймовый круг со знаком процента внизу (лайм — деньги и «выгодно») */}
        {picks.values.length ? (
          <>
            <span aria-hidden className="my-1 h-px w-6 shrink-0 bg-edge" />
            <Link
              href="/tag/value"
              prefetch={false}
              {...tipProps(`Выгодно сегодня · ${pluralN(picks.values.length, BETS)}`, 'Кэф выше честной цены · Реклама 18+')}
              // на светлой подложке, как все круги историй (владелец: «и идут с выгодно тоже подложку»); лайм — кольцом
              className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full ring-2 ring-acid ring-offset-[3px] ring-offset-panel transition-[filter] hover:brightness-110"
              style={{ background: PLATE }}
            >
              {/* эмблема команды первой выгодной ставки, как у всех подборок (владелец: «в выгодно вместо иконки лого клуба») */}
              <PlateMark sym="value" logo={valueLogo(picks.values[0])} className="h-[18px] w-[18px]" crest="h-[22px] w-[22px]" />
            </Link>
          </>
        ) : null}
      </div>
      {tipNode}

      <div className="shell-r-full flex h-full flex-col">
        <div ref={edgeScroll} className="scrollbar-none min-h-0 flex-1 overflow-y-auto p-4 edge-fade">
          <h2 className="sticky -top-4 z-10 -mx-4 -mt-4 flex items-center justify-between bg-panel px-4 pb-2 pt-4 text-[15px] font-semibold edge-top">
            Подборки дня
            <PanelToggle side="r" open />
          </h2>
          {groups.length ? (
            <ul className="mt-2 space-y-0.5">
              {groups.map((g, gi) => {
                // первые SHOWN — сразу, остальные — под «Ещё N» (владелец: список без иерархии не помещался в экран)
                if (fold && gi >= SHOWN && !all) return null
                const on = open === g.key
                const more = moreHref(g.key)
                return (
                  // раскрытая подборка — одной плашкой: заголовок, матчи и ссылка на общем фоне (иначе матчи сливались со строками подборок ниже)
                  <li key={g.key} className={on ? '-mx-2 rounded-tile bg-white/[0.05] px-2 pb-1' : ''}>
                    <div className={`group -mx-2 flex items-center gap-1 rounded-tile pr-2 transition-colors ${on ? '' : 'hover:bg-white/[0.04]'}`}>
                      {/* значок подборки; при наведении на строку на его месте белая ▶ — смотреть разбор, как у Spotify
                          (14 белых кнопок разом были ярче всего на странице) */}
                      <button
                        type="button"
                        data-story-key={g.key}
                        onClick={(e) => play(gi, e)}
                        aria-label={`${g.label}: смотреть разбор матчей`}
                        title="Смотреть разбор"
                        className="relative my-1.5 ml-2 grid h-9 w-9 shrink-0 place-items-center rounded-full"
                        style={{ background: `color-mix(in oklch, ${symbolSoft(g.key)} 14%, transparent)` }}
                      >
                        <GroupMark
                          g={g}
                          className="h-[18px] w-[18px]"
                          crest="h-[22px] w-[22px]"
                        />
                        <span className="absolute inset-0 grid place-items-center rounded-full bg-white/25 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                          <span className="grid h-5 w-5 place-items-center rounded-full bg-ink/55 text-white">
                            <Play className="ml-px h-2.5 w-2.5" />
                          </span>
                        </span>
                        {/* кольцо, как вокруг сторис: непросмотренные матчи подборки — приглушённым цветом подборки (как знак и заливка круга), просмотренные — серые */}
                        <StoryRing group={g.key} ids={g.items.map((it) => it.id)} seen={seen} />
                        {/* знак подборки на углу — и в развёрнутой панели (владелец: «может на пк в несложенном состоянии в правом
                            блоке тоже сделаем эти кружочки на историях?»), как в полоске и на телефоне; при наведении прячется вместе с
                            эмблемой — на её месте ▶. Обводка — цветом панели (у раскрытой — её плашки) */}
                        <GroupBadge
                          g={g}
                          className={`-right-[7px] -top-[7px] h-[18px] w-[18px] border-[1.5px] transition-opacity group-hover:opacity-0 group-focus-within:opacity-0 ${on ? 'border-[#1c2126]' : 'border-panel'}`}
                        />
                        {/* точки «идёт» на значках подборок нет: при многих идущих их было шесть подряд; «3 идут» — в подписи,
                            а сигнал «идёт» — в центре и у турниров слева (владелец согласился) */}
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpen(on ? null : g.key)}
                        aria-expanded={on}
                        // общее число матчей — в подсказке: в подписи только что сейчас и что впереди
                        title={[g.label, matchesN(totals[g.key] ?? g.items.length), stateOf(g.key, totals[g.key] ?? g.items.length)].filter(Boolean).join(' · ')}
                        className="flex min-w-0 flex-1 items-center gap-3 self-stretch pl-2 text-left"
                      >
                        {/* название само объясняет подборку («Аутсайдер в форме», а не «Может удивить»), под ним — что с её матчами
                            сейчас, как у турниров слева (`StateLine`): статичное описание повторяло название (владелец согласился) */}
                        <span className="min-w-0 flex-1 leading-tight">
                          <span className="block truncate text-[14.5px] font-medium">{g.label}</span>
                          {teamLine(g.key) ? (
                            <span className={`mt-0.5 block truncate text-[12.5px] ${done(g.key) ? 'text-mute/70' : 'text-mute'}`}>{teamLine(g.key)}</span>
                          ) : states[g.key] ? (
                            <span className="mt-0.5 block truncate text-[12.5px] text-mute">
                              <StateLine total={totals[g.key] ?? g.items.length} {...states[g.key]} soon={g.key === 'soon'} ahead />
                            </span>
                          ) : null}
                        </span>
                        {/* шеврон — только у раскрытой и при наведении: восемь одинаковых шевронов повторяли одно и то же */}
                        <Icon k="chevron-down" className={`h-4 w-4 shrink-0 text-mute transition-[transform,opacity] duration-200 ${on ? 'rotate-180' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'}`} />
                      </button>
                    </div>
                    {on ? (
                      <div className="pb-2">
                        {g.items.map((it) => {
                          const m = matches[it.id]
                          if (!m) return null
                          return (
                            <a
                              key={it.id}
                              href={m.href}
                              onClick={(e) => {
                                if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
                                e.preventDefault()
                                openStory({ id: it.id, href: m.href, opener: e.currentTarget, queue: circleQueue(groups, gi, seen).queue, circles: row })
                              }}
                              className="-mx-2 flex items-center gap-3 rounded-tile px-2 py-1.5 transition-colors hover:bg-white/[0.05]"
                            >
                              {/* две подложки по диагонали в квадрате 36px, как избранный матч слева: названия — с той же линии,
                                  что «Много голов» над ними (в ряд пара была 48px — владелец: «тут ещё осталось») */}
                              <span aria-hidden className="relative h-9 w-9 shrink-0">
                                <CrestPlate name={m.home.name} logo={m.home.logo} size={22} crest={0.72} className="absolute left-0 top-0" />
                                <CrestPlate name={m.away.name} logo={m.away.logo} size={22} crest={0.72} className="absolute bottom-0 right-0 ring-2 ring-panel" />
                              </span>
                              <span className="min-w-0 flex-1 text-[13px] leading-tight">
                                <span className="block truncate">{m.home.name}</span>
                                <span className="block truncate">{m.away.name}</span>
                              </span>
                              <Right m={m} stat={stats[`${g.key}:${it.id}`]} hot={g.key === 'progruz'} />
                            </a>
                          )
                        })}
                        {/* «Все 12 →» — только если показаны не все; иначе — на страницу подборки («Все 4 →» при четырёх видимых обещал больше) */}
                        {more ? (
                          <Link href={more} prefetch={false} className="mt-1 inline-block text-[13px] font-medium text-dim transition-colors hover:text-fg">
                            {(totals[g.key] ?? 0) > g.items.length ? `Все ${totals[g.key]} →` : 'Открыть подборку →'}
                          </Link>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                )
              })}
              {fold ? (
                <li>
                  <button
                    type="button"
                    onClick={() => setAll((v) => !v)}
                    className="-mx-2 mt-1 flex w-[calc(100%+1rem)] items-center gap-3 rounded-tile px-2 py-2 text-left text-[13.5px] font-medium text-dim transition-colors hover:bg-white/[0.04] hover:text-fg"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center">
                      <Icon k="chevron-down" className={`h-4 w-4 transition-transform ${all ? 'rotate-180' : ''}`} />
                    </span>
                    {all ? 'Свернуть' : `Ещё ${groups.length - SHOWN}`}
                  </button>
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="mt-2 text-[13.5px] text-dim">Подборки появятся, когда будут матчи дня.</p>
          )}
          <ValueBlock rows={picks.values} by={picks.valuesBy} />
        </div>
      </div>
    </div>
  )
}
