'use client'

import { useEffect, useRef, useState } from 'react'
import { BackButton } from '../BackButton'
import { HeaderRow } from '../HeaderRow'
import { MatchFavStar } from '../FavStar'
import { teamCode } from '@/lib/i18n/codes'

type Side = { name: string; logo?: string | null }

/**
 * Верх страницы матча — одна закреплённая панель под шапкой (владелец: «странно, что первый верхний блок пропадает,
 * потом появляется другой и потом ещё с кэфами — как будто 3 разных верхних блока»): «←» на месте всегда, а содержимое
 * сменяется на том же месте — наверху страницы хлебные крошки («Матчи / Ла Лига / Севилья — Осасуна»), когда верх
 * табло доходит до панели — мини-табло: коды команд и «3:1», справа «59′» (до начала — время, после — «итог»), без кэфов
 * (к букмекеру ведут «Прогноз», «Где поставить» и нижняя плашка на телефоне). Раньше крошки уезжали,
 * потом из-под шапки выезжала отдельная полоска, а кэфы в ней появлялись третьим шагом.
 */
export function MatchBar({
  id,
  ts,
  home,
  away,
  center,
  minute,
  back = '/matches',
  backLabel = 'Матчи',
}: {
  /** матч и его начало — для звёздочки «в избранное» справа */
  id: number
  ts: number
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
    const board = document.getElementById('match-hero')
    let raf = 0
    const check = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        // ниже lg мини-табло — в самой шапке (52px), от lg — плашка под шапкой
        const limit = innerWidth < 1024 ? 52 : ref.current?.getBoundingClientRect().bottom
        // счёт в панели — только когда карточка матча целиком ушла под неё (вместе с цифрами xG, ударов, угловых)
        const r = board?.getBoundingClientRect()
        setShow(r && limit != null ? r.bottom < limit : false)
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

  // компактная строка «БАР 2:0 ЛЕВ» (владелец прислал ТЗ: «тонкая, аккуратная sticky-панель… убери эмблемы… отдельную
  // красную LIVE-плашку… строго центрируй блок со счётом»): коды по краям, счёт — в средней колонке `auto` между двумя `1fr`,
  // ровно по центру, и виден всегда — без «—» и подмены при прокрутке, высота и места элементов не меняются; полное
  // название — в подсказке и для диктора
  const team = (t: Side, right = false) => (
    <span title={t.name} className={`min-w-0 truncate ${right ? 'text-left' : 'text-right'}`}>
      <span className="sr-only">{t.name}</span>
      <span aria-hidden className="text-[14px] font-semibold tracking-[0.04em] text-dim">
        {teamCode(t.name)}
      </span>
    </span>
  )
  const bar = (cls: string) => (
    <div className="grid w-full min-w-0 grid-cols-[1fr_auto_1fr] items-center gap-2.5 sm:gap-3">
      {team(home)}
      <span className={`num display-num whitespace-nowrap font-semibold leading-none ${cls}`}>{center}</span>
      {team(away, true)}
    </div>
  )
  // справа — минута обычным тихим текстом («59′»; у сыгранного — «итог», до начала — ничего) и звёздочка «в избранное»
  const badge = minute ? <span className="whitespace-nowrap text-[13px] font-medium leading-none text-dim">{minute.text}</span> : null
  return (
    <>
      {/* ниже lg — в самой шапке, как в Apple Sports (владелец: «мне не нравится двухэтажный хедер на мобильных» — «да»):
          слева «‹», по центру — команды, а когда крупный счёт ушёл под шапку — между ними счёт (`bar`), справа минута; кэфов там
          нет — внизу своя плашка */}
      <HeaderRow
        fallback={{ href: back, label: backLabel }}
        idle={bar('text-[18px]')}
        right={
          <>
            {badge}
            <MatchFavStar id={id} ts={ts} bar />
          </>
        }
        wide={Boolean(badge)}
      />
      {/* от lg — закреплённая плашка над табло, видна всегда (владелец: «не нравится что сейчас стрелочка на время пропадает»,
          потом «может сразу названия команд и счет в самом верхнем блоке сделать? и убрать рядом со стрелкой название лиги?»):
          «‹», команды и счёт с самого начала и ничего не сменяется; турнир и минута — строкой в табло ниже; когда
          табло ушло под плашку — у неё тень */}
      <div className="sticky top-[57px] z-30 max-lg:hidden xl:top-14">
        <div ref={ref} className="match-top relative bg-[#090c10] pt-1.5 xl:pt-0">
          <div
            className={`match-top-in relative grid min-h-[58px] grid-cols-[minmax(32px,1fr)_minmax(0,28rem)_minmax(32px,1fr)] items-center gap-3 rounded-card bg-panel-3 py-2 px-[29px] transition-shadow duration-300 ${
              show ? 'shadow-[0_10px_30px_rgb(0_0_0/0.45)]' : ''
            }`}
          >
            {/* по центру плашки — команды и счёт (владелец: «по центру»), слева «‹»; кэфов нет (владелец: «а ты можешь кэфы
                из самого верхнего блока убрать?») — правая колонка той же ширины, что левая, в ней минута и звёздочка */}
            <BackButton fallback={back} className="justify-self-start" />
            {bar('text-[19px]')}
            {/* справа — минута тихим текстом «59′» (у сыгранного — «итог»; под счётом она сбивала его с середины по высоте) и у края
                звёздочка «матч в избранное» — кругом, как «‹» слева */}
            <span className="flex items-center gap-3 justify-self-end">
              {badge}
              <MatchFavStar id={id} ts={ts} />
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
