'use client'

import { useEffect, useRef, useState } from 'react'
import { BackButton } from '../BackButton'
import { HeaderRow } from '../HeaderRow'
import { TeamLogo } from '../TeamLogo'
import { teamCode } from '@/lib/i18n/codes'

type Side = { name: string; logo: string | null }

/**
 * Верх страницы матча — одна закреплённая панель под шапкой (владелец: «странно, что первый верхний блок пропадает,
 * потом появляется другой и потом ещё с кэфами — как будто 3 разных верхних блока»): «←» на месте всегда, а содержимое
 * сменяется на том же месте — наверху страницы хлебные крошки («Матчи / Ла Лига / Севилья — Осасуна»), когда верх
 * табло доходит до панели — мини-табло: эмблемы, коды команд и «3 : 1 ● 59′» (до начала — время, после — «итог»), без кэфов
 * (к букмекеру ведут «Прогноз», «Где поставить» и нижняя плашка на телефоне). Раньше крошки уезжали,
 * потом из-под шапки выезжала отдельная полоска, а кэфы в ней появлялись третьим шагом.
 */
export function MatchBar({
  home,
  away,
  center,
  minute,
  back = '/matches',
  backLabel = 'Матчи',
}: {
  home: Side
  away: Side
  /** «1 : 0» или «21:00» */
  center: string
  /** «59′» у идущего, «итог» у сыгранного, null — до начала */
  minute: { text: string; live: boolean } | null
  /** куда «←», если пришли не с сайта — раздел из крошек (лига) */
  back?: string
  /** подпись у «‹» на телефоне, если пришли не с сайта — «Ла Лига» */
  backLabel?: string
}) {
  const [show, setShow] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // ориентир — сам счёт (или время) на табло: мини-табло сменяет крошки, когда крупный счёт наполовину ушёл под панель
    // (владелец: «как-то рановато появляется» — по верху табло полоска дублировала ещё видный крупный счёт)
    const board = document.getElementById('match-score') ?? document.getElementById('match-board') ?? document.getElementById('match-hero')
    let raf = 0
    const check = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        // ниже lg мини-табло — в самой шапке (52px), от lg — плашка под шапкой
        const limit = innerWidth < 1024 ? 52 : ref.current?.getBoundingClientRect().bottom
        // сами цифры (первый ряд в #match-score): сменяем, когда половина крупного счёта ушла под панель
        const r = (board?.firstElementChild ?? board)?.getBoundingClientRect()
        setShow(r && limit != null ? (r.top + r.bottom) / 2 < limit : false)
      })
    }
    check()
    addEventListener('scroll', check, { passive: true })
    addEventListener('resize', check)
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('scroll', check)
      removeEventListener('resize', check)
    }
  }, [])

  // в шапке телефона — название до двух строк, а не «Райо Валь…»; в плашке от lg (`short`) — код, как на табло трансляций:
  // «АРС 1:0 ЧЕЛ» (владелец: «чтоб там всегда коды были без полных названий»), полное — в подсказке и для диктора
  const team = (t: Side, right = false, short = false) => (
    <span title={short ? t.name : undefined} className={`flex min-w-0 items-center justify-end gap-2 ${right ? 'flex-row-reverse text-right' : ''}`}>
      {/* ниже 380px — без эмблем: иначе «Барселона» рвалась по буквам («Барсело / на») */}
      <span className="shrink-0 max-[379px]:hidden">
        <TeamLogo name={t.name} src={t.logo} size={22} />
      </span>
      <span className={`line-clamp-2 break-words text-[14px] font-semibold leading-[1.15] sm:text-[15px] ${short ? 'sr-only' : ''}`}>{t.name}</span>
      {short ? (
        <span aria-hidden className="whitespace-nowrap text-[15px] font-semibold tracking-[0.04em]">
          {teamCode(t.name)}
        </span>
      ) : null}
    </span>
  )

  // мини-табло: «эмблема Бетис 1:0 Хетафе эмблема», минута — под счётом вне потока (цифры на линии названий)
  const score = (
    <div className="grid w-full min-w-0 grid-cols-[1fr_auto_1fr] items-center gap-2.5 sm:gap-3">
      {team(home, false, true)}
      <span className="relative flex flex-col items-center leading-none">
        <span className="num display-num whitespace-nowrap text-[20px] font-semibold">{center}</span>
        {minute ? (
          <span className={`absolute left-1/2 top-full mt-0.5 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap text-[11px] ${minute.live ? 'text-live' : 'text-mute'}`}>
            {minute.live ? <span className="h-1 w-1 rounded-full bg-live" /> : null}
            {minute.text}
          </span>
        ) : null}
      </span>
      {team(away, true, true)}
    </div>
  )
  // в шапке телефона — те же команды всегда (владелец: «а можешь на странице матча сразу в хедере писать типа команды? и …
  // красивее, чтоб сочеталось со страницей»): наверху между ними тихое «—», когда крупный счёт ушёл под шапку — на его месте
  // счёт и минута; названия и эмблемы стоят на месте, меняется только середина
  const headerBar = (
    <div className="grid w-full min-w-0 grid-cols-[1fr_auto_1fr] items-center gap-2.5">
      {team(home)}
      <span className="relative grid place-items-center leading-none">
        <span aria-hidden={show} className={`col-start-1 row-start-1 text-[20px] text-mute transition-opacity duration-200 ${show ? 'opacity-0' : ''}`}>
          —
        </span>
        <span aria-hidden={!show} className={`col-start-1 row-start-1 flex flex-col items-center transition-[opacity,transform] duration-200 ${show ? '' : 'translate-y-1 opacity-0'}`}>
          <span className="num display-num whitespace-nowrap text-[20px] font-semibold">{center}</span>
          {minute ? (
            <span className={`absolute left-1/2 top-full mt-0.5 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap text-[11px] ${minute.live ? 'text-live' : 'text-mute'}`}>
              {minute.live ? <span className="h-1 w-1 rounded-full bg-live" /> : null}
              {minute.text}
            </span>
          ) : null}
        </span>
      </span>
      {team(away, true)}
    </div>
  )
  return (
    <>
      {/* ниже lg — в самой шапке, как в Apple Sports (владелец: «мне не нравится двухэтажный хедер на мобильных» — «да»):
          слева «‹», по центру — команды, а когда крупный счёт ушёл под шапку — между ними счёт (`headerBar`); кэфов там
          нет — внизу своя плашка */}
      <HeaderRow fallback={{ href: back, label: backLabel }} idle={headerBar} />
      {/* от lg — закреплённая плашка над табло, видна всегда (владелец: «не нравится что сейчас стрелочка на время пропадает»,
          потом «может сразу названия команд и счет в самом верхнем блоке сделать? и убрать рядом со стрелкой название лиги?»):
          «‹», команды и счёт с самого начала и ничего не сменяется; турнир и минута — строкой в табло ниже; когда
          табло ушло под плашку — у неё тень */}
      <div className="sticky top-[65px] z-30 max-lg:hidden xl:top-[72px]">
        <div ref={ref} className="match-top relative bg-[#090c10] pt-1.5 xl:pt-0">
          <div
            className={`match-top-in relative grid min-h-[58px] grid-cols-[minmax(32px,1fr)_minmax(0,28rem)_minmax(32px,1fr)] items-center gap-3 rounded-card bg-panel-3 py-2 px-[29px] transition-shadow duration-300 ${
              show ? 'shadow-[0_10px_30px_rgb(0_0_0/0.45)]' : ''
            }`}
          >
            {/* по центру плашки — команды и счёт (владелец: «по центру»), слева «‹»; кэфов нет (владелец: «а ты можешь кэфы
                из самого верхнего блока убрать?») — правая колонка пустая той же ширины, что левая */}
            <BackButton fallback={back} className="justify-self-start" />
            {score}
          </div>
        </div>
      </div>
    </>
  )
}
