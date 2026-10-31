'use client'

import Link from 'next/link'
import { BlockMore } from '../BlockMore'
import { DayNumbersBlock } from '../DayNumbersBlock'
import { useEffect, useId, useState } from 'react'
import type { CompactMatch } from '@/lib/compact'
import type { DayPicks, ValueRow } from '@/lib/day-picks'
import { goHref, SPONSORED_REL } from '@/lib/affiliate'
import { TeamLogo } from '../TeamLogo'
import { openStory, type StoryRow } from '../story/events'
import { circleQueue } from '../story/queue'
import { readSeen, SEEN_EVENT } from '../story/seen'
import { StorySymbol, symbolSoft } from '../story/StorySymbol'
import { GroupMark } from '../story/GroupMark'
import { pluralN } from '@/lib/format'
import { PanelToggle } from './PanelToggle'
import { useRailTip } from './RailTip'
import { matchesN, StateLine, stateText } from './StateLine'
import { StoryRing } from './StoryRing'
import { Icon } from '@/components/Icon'

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
export function ValueBlock({ rows, card = false }: { rows: ValueRow[]; card?: boolean }) {
  const hintId = useId()
  // все ставки — PARI: он назван в заголовке, как было; есть другие — подписан каждый кэф (имя другого букмекера в заголовке
  // не влезало в 288px: «Марафон · Реклама · 18+» переносилось вместе с «Выгодно сегодня»)
  const onlyPari = rows.length > 0 && rows.every((r) => r.slug === 'pari')
  return (
    // карточкой (под списком ниже xl) — заголовок над ней, на фоне страницы, как блоки лиг и разделы матча
    <section className={card ? 'relative min-w-0' : 'relative mt-6 border-t border-edge pt-4'}>
      <h3 className={`flex items-baseline justify-between ${card ? 'mb-2.5 px-4 text-[20px] font-bold leading-tight tracking-[-0.01em] sm:px-5' : 'text-[15px] font-semibold'}`}>
        {/* ⓘ — почему «выгодно» (владелец согласился: объяснение было только в подсказке плашки, её почти никто не находит);
            простыми словами и с примером, без «заработать»: оценка, а не гарантия */}
        <span className="group/vh flex items-baseline gap-1.5">
          Выгодно сегодня
          <button
            type="button"
            aria-describedby={hintId}
            aria-label="Почему «выгодно»"
            className="text-[13px] font-normal text-mute transition-colors hover:text-fg focus-visible:text-fg"
          >
            ⓘ
          </button>
          <span
            id={hintId}
            role="tooltip"
            className={`pointer-events-none absolute z-20 ${card ? 'inset-x-0 top-9' : 'inset-x-0 top-11'} rounded-tile border border-edge bg-panel-2 p-3 text-[13px] font-normal leading-snug text-dim opacity-0 shadow-[0_10px_30px_rgb(0_0_0/0.45)] transition-opacity group-focus-within/vh:opacity-100 group-hover/vh:opacity-100`}
          >
            <b className="mb-1 block font-semibold text-fg">Почему «выгодно»</b>
            Кэф выше, чем стоит исход по оценке tag.bet. Например, мы даём победе 40% — честный кэф для неё 2.50, а букмекер платит 2.68.
            <span className="mt-1.5 block text-mute">Оценка, а не гарантия · 18+</span>
          </span>
        </span>
        {rows.length ? <span className={`${card ? 'text-[12px]' : 'text-[11.5px]'} font-normal tracking-normal text-mute`}>{onlyPari ? 'PARI · ' : ''}Реклама · 18+</span> : null}
      </h3>
      {/* карточкой — строки через черту от края до края карточки, как «Где ставить» под ним и все списки (владелец: «правильно
          что в ставках разделительные линии не до конца?»), и крупнее: 15/13px и плашка 40px (владелец прислал вариант
          ChatGPT; в узкой правой панели — как было) */}
      <div className={card ? 'card px-4 pb-4 sm:px-5' : ''}>
      {rows.length ? null : <p className={`${card ? 'py-4' : 'mt-2'} text-[13px] text-dim`}>Сегодня выгодных ставок нет.</p>}
      {/* у PARI пусто, а у других есть — так и пишем: главного партнёра в блоке не видно, и это не поломка */}
      {rows.length && !rows.some((r) => r.slug === 'pari') ? (
        <p className={`${card ? 'pt-3 text-[13px]' : 'mt-1.5 text-[12.5px]'} leading-snug text-mute`}>У PARI сегодня выгодных нет — у других легальных букмекеров:</p>
      ) : null}
      <ul className={card ? '-mx-4 divide-y divide-edge sm:-mx-5' : 'mt-2 space-y-1'}>
        {rows.map((r) => (
          // без круга с эмблемами слева (владелец согласился: эмблемы по 16px внахлёст не различить, а круг съедал место —
          // вторая строка не влезала даже как «с «Мидлсбро»», и «с» после времени читалось как «с 21:00» строкой выше)
          <li key={r.id} className={card ? 'flex items-center gap-3 px-4 py-3.5 sm:px-5' : '-mx-2 flex items-center gap-3 rounded-tile px-2 py-1.5 transition-colors hover:bg-white/[0.04]'}>
            {/* главное — на что ставка (сверху, белым, в узкой панели — в две строки, не обрезаем); матч и время — ниже серым: обрезается второстепенное */}
            <Link href={r.href} prefetch={false} className="min-w-0 flex-1 leading-tight">
              <span className={`line-clamp-2 ${card ? 'text-[15px] font-semibold' : 'text-[13.5px] font-medium'} first-letter:uppercase`}>{plain(r.outcome)}</span>
              {/* вторая строка — время и матч (владелец: «как тебе выгодно сегодня, только честно?» — «Марафон · 22:00 ·
                  Саутгемпт…» обрезало матч, а букмекер посетителю важен меньше всего) */}
              <span className={`mt-0.5 line-clamp-2 ${card ? 'text-[13px]' : 'text-[12.5px]'} text-dim`}>
                {/* ставка на победу команды — она уже названа строкой выше, здесь только соперник («с «Мидлсбро»»): в 288px
                    «Саутгемптон — Мидлсбро» и даже «против «Мидлсбро»» обрезались; длинное — переносом, не многоточием */}
                {r.time} · {r.side === 'home' ? `против ${r.away}` : r.side === 'away' ? `против ${r.home}` : `${r.home} — ${r.away}`}
              </span>
            </Link>
            <span className="flex shrink-0 flex-col items-center gap-0.5">
              <a
                href={goHref(r.slug, 'panel', r.id)}
                target="_blank"
                rel={SPONSORED_REL}
                title={`${r.outcome}: ${r.odd.toFixed(2)} в ${r.bookmaker}${r.ev ? ` — выгода +${Math.round(r.ev * 100)}%` : ''} · Реклама 18+`}
                // как лаймовая ячейка кэфа в строке списка (34px, 15px): три высоких плашки с букмекером были ярче всего на странице
                className={`num grid place-items-center rounded-ctl bg-acid font-semibold text-acid-ink transition-colors hover:bg-acid/85 ${card ? 'h-10 w-16 text-[16px]' : 'h-[34px] w-14 text-[15px]'}`}
              >
                {r.odd.toFixed(2)}
              </a>
              {onlyPari ? null : <span className="text-[10.5px] leading-none text-mute">{r.bookmaker}</span>}
            </span>
          </li>
        ))}
      </ul>
      <BlockMore href="/tag/value" panel={!card} className={card ? '-mx-4 -mb-4 sm:-mx-5' : ''}>
        Все выгодные ставки
      </BlockMore>
      </div>
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
        <GroupMark g={g} tone={symbolSoft(g.key)} className="h-[18px] w-[18px]" crest="h-[22px] w-[22px]" />
        <StoryRing group={g.key} ids={g.items.map((it) => it.id)} seen={s} color={symbolSoft(g.key)} />
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
            <GroupMark g={g} tone={symbolSoft(g.key)} className="h-[18px] w-[18px]" crest="h-[22px] w-[22px]" />
            <StoryRing group={g.key} ids={g.items.map((it) => it.id)} seen={seen} color={symbolSoft(g.key)} />
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
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-acid text-acid-ink transition-colors hover:bg-acid/85"
            >
              <StorySymbol k="value" tone="currentColor" className="h-[18px] w-[18px]" />
            </Link>
          </>
        ) : null}
      </div>
      {tipNode}

      <div className="shell-r-full flex h-full flex-col">
        <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto p-4 edge-fade">
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
                          tone={symbolSoft(g.key)}
                          className="h-[18px] w-[18px] transition-opacity group-hover:opacity-0 group-focus-within:opacity-0"
                          crest="h-[22px] w-[22px]"
                          fade="transition-opacity group-hover:opacity-0 group-focus-within:opacity-0"
                        />
                        <span className="absolute inset-0 grid place-items-center rounded-full bg-white text-ink opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                          <Play className="ml-0.5 h-3.5 w-3.5" />
                        </span>
                        {/* кольцо, как вокруг сторис: непросмотренные матчи подборки — приглушённым цветом подборки (как знак и заливка круга), просмотренные — серые */}
                        <StoryRing group={g.key} ids={g.items.map((it) => it.id)} seen={seen} color={symbolSoft(g.key)} />
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
                              className="-mx-2 flex items-center gap-2.5 rounded-tile px-2 py-1.5 transition-colors hover:bg-white/[0.05]"
                            >
                              <span className="flex shrink-0 -space-x-2">
                                {[m.home, m.away].map((t) => (
                                  <span key={t.id} className="grid h-7 w-7 place-items-center rounded-full bg-panel-3 ring-2 ring-panel">
                                    <TeamLogo name={t.name} src={t.logo} size={18} />
                                  </span>
                                ))}
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
          {picks.numbers ? <DayNumbersBlock n={picks.numbers} /> : null}
          <ValueBlock rows={picks.values} />
        </div>
      </div>
    </div>
  )
}
