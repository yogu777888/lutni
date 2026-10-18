'use client'

import { useEffect, useRef, useState } from 'react'
import { SPONSORED_REL } from '@/lib/affiliate'
import { BackButton, BackLabel } from '../BackButton'
import { TeamLogo } from '../TeamLogo'

type Side = { name: string; logo: string | null }
export type BarOdd = { key: 'home' | 'draw' | 'away'; odd: number; hot: boolean; title: string }

/**
 * Верх страницы матча — одна закреплённая панель под шапкой (владелец: «странно, что первый верхний блок пропадает,
 * потом появляется другой и потом ещё с кэфами — как будто 3 разных верхних блока»): «←» на месте всегда, а содержимое
 * сменяется на том же месте — наверху страницы хлебные крошки («Матчи / Ла Лига / Севилья — Осасуна»), когда верх
 * табло доходит до панели — мини-табло: эмблемы, «3 : 1 ● 59′» (до начала — время, после — «итог») и сразу три кэфа
 * партнёра ячейками-ссылками (выгодный — лаймом; на телефоне без кэфов — внизу своя плашка). Раньше крошки уезжали,
 * потом из-под шапки выезжала отдельная полоска, а кэфы в ней появлялись третьим шагом.
 */
export function MatchBar({
  home,
  away,
  center,
  minute,
  odds,
  partner,
  back = '/matches',
  backLabel = 'Матчи',
}: {
  home: Side
  away: Side
  /** «1 : 0» или «21:00» */
  center: string
  /** «59′» у идущего, «итог» у сыгранного, null — до начала */
  minute: { text: string; live: boolean } | null
  odds: BarOdd[] | null
  partner: { name: string; href: string; live?: boolean } | null
  /** куда «←», если пришли не с сайта — раздел из крошек (лига) */
  back?: string
  /** подпись у «‹» на телефоне, если пришли не с сайта — «Ла Лига» */
  backLabel?: string
}) {
  const [show, setShow] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  // переходы включаем после первого кадра: при заходе на страницу состояние ставится сразу, без вспышки крошки → табло
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // ориентир — сам счёт (или время) на табло: мини-табло сменяет крошки, когда крупный счёт наполовину ушёл под панель
    // (владелец: «как-то рановато появляется» — по верху табло полоска дублировала ещё видный крупный счёт)
    const board = document.getElementById('match-score') ?? document.getElementById('match-board') ?? document.getElementById('match-hero')
    let raf = 0
    const check = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const el = ref.current
        const box = el?.getBoundingClientRect()
        // сами цифры (первый ряд в #match-score): сменяем, когда половина крупного счёта ушла под панель
        const r = (board?.firstElementChild ?? board)?.getBoundingClientRect()
        setShow(r && box ? (r.top + r.bottom) / 2 < box.bottom : false)
      })
    }
    check()
    const on = setTimeout(() => setReady(true), 300)
    addEventListener('scroll', check, { passive: true })
    addEventListener('resize', check)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(on)
      removeEventListener('scroll', check)
      removeEventListener('resize', check)
    }
  }, [])

  // название — до двух строк, а не «Райо Валь…» (высоты панели хватает): на телефоне и на 768–1024 рядом с кэфами
  const team = (t: Side, right = false) => (
    <span className={`flex min-w-0 items-center justify-end gap-2 ${right ? 'flex-row-reverse text-right' : ''}`}>
      {/* ниже 380px — без эмблем: иначе «Барселона» рвалась по буквам («Барсело / на») */}
      <span className="shrink-0 max-[379px]:hidden">
        <TeamLogo name={t.name} src={t.logo} size={22} />
      </span>
      <span className="line-clamp-2 break-words text-[14px] font-semibold leading-[1.15] sm:text-[15px]">{t.name}</span>
    </span>
  )
  const outcome = (k: BarOdd['key']) => (k === 'draw' ? 'Ничья' : `«${k === 'home' ? home.name : away.name}»`)

  const swap = ready ? 'transition-[opacity,transform] duration-200 ease-out' : ''
  return (
    // место под шапкой — классами, а не после замера: иначе при заходе на страницу панель вставала на 64px и через кадр
    // прыгала вниз (владелец: «при переходе с главной верхний блок и текст в нём прыгает»). Шапка: 64px и черта (ниже lg
    // меню внизу — `TabBar`, шапка в один ряд; было два ряда, 99px); от xl — 72px, как строка дней на главной (шапка 64 + полоска рамки 8). Ниже xl панель —
    // вплотную под шапкой, а 6px над ней — полоска цвета фона, пока панель прилипла (`stuck`): в щели между шапкой и
    // панелью просвечивала прокручиваемая страница (владелец: «а мини табло сверху при прокрутке как?»)
    // панель — только когда крупный счёт ушёл под шапку (владелец: «а можно как то красиво кнопки назад в блоке вставить?»
    // — «назад» теперь чипом в углу табло, а наверху страницы над табло пустой полосы с одним «←» нет): поверх страницы, без
    // своего места в раскладке (обёртка высотой 0), видна только при прокрутке
    // ниже lg — полоса под шапкой всегда, как навигация в iOS (владелец: «под хедером сделать как на айфоне кнопку назад и
    // по центру надпись» — «давай»): наверху «‹ Ла Лига», когда крупный счёт ушёл под полосу — по центру мини-табло, у «‹»
    // остаётся только шеврон; от lg — как было: плашка поверх страницы только при прокрутке
    <div className="sticky top-[65px] z-30 max-lg:-mx-4 max-lg:-mt-4 max-lg:mb-2 sm:max-lg:-mt-6 lg:h-0 xl:top-[72px]">
    <div
      ref={ref}
      // ниже lg — второй ряд шапки (фон и уход вместе с шапкой — правила `.match-top` в app/globals.css), от lg — плашка
      className={`match-top lg:absolute lg:inset-x-0 lg:top-0 lg:bg-[#090c10] lg:pt-1.5 xl:pt-0 ${show ? '' : 'lg:invisible'}`}
    >
      <div className={`match-top-in relative flex min-h-12 items-center gap-3 px-4 py-1.5 lg:min-h-[57.5px] lg:rounded-card lg:py-2 lg:bg-panel-3 lg:shadow-[0_10px_30px_rgb(0_0_0/0.45)] ${swap} ${show ? 'opacity-100' : 'lg:-translate-y-1 lg:opacity-0'}`}>
        <BackButton fallback={back} className="max-lg:hidden" />
        <div className="pointer-events-none absolute inset-y-0 left-4 right-1/3 z-10 flex items-center lg:hidden [&>*]:pointer-events-auto">
          <BackLabel fallback={{ href: back, label: backLabel }} bar short={show} />
        </div>
        <div className="relative flex min-w-0 flex-1 items-center self-stretch">
          {/* мини-табло на том же месте */}
          <div
            aria-hidden={!show}
            inert={!show}
            // с минутой под счётом ниже lg всё поднимаем на 3px: иначе минута почти касалась черты снизу ряда; слева и справа —
            // место под «‹», счёт — по центру экрана
            className={`absolute inset-0 flex items-center gap-3 transition-opacity duration-200 max-md:px-10 md:max-lg:pl-10 ${minute ? 'max-lg:pb-1.5' : ''} ${show ? '' : 'max-lg:opacity-0'}`}
          >
            {/* счёт одной группой вплотную — «эмблема Бетис 1:0 Хетафе эмблема» сразу после «←», на месте крошек (владелец:
                «как тебе хлебные крошки и то, что потом появляется?» — по сетке во всю ширину названия прилипали к краям, между
                ними и счётом было по ~300px пустоты); кэфы — справа (ml-auto) */}
            {/* на телефоне кэфов в панели нет — счёт по центру свободного места, а не прижат влево с пустотой справа */}
            {/* на телефоне — сеткой 1fr · счёт · 1fr и с отступом справа шириной «←»: счёт ровно по центру экрана, названия
                прижаты к нему (владелец: «как то криво стоит счет?» — по центру свободного места справа от «←» счёт уезжал
                вправо, а минута под ним поднимала цифры выше названий) */}
            <div className="grid w-full min-w-0 grid-cols-[1fr_auto_1fr] items-center gap-2.5 md:flex md:w-auto sm:gap-3">
              {team(home)}
              {/* минута — под счётом вне потока: цифры по середине ряда, на одной линии с названиями */}
              <span className="relative flex flex-col items-center leading-none">
                <span className="num display-num whitespace-nowrap text-[20px] font-semibold">{center}</span>
                {minute ? (
                  <span className={`absolute left-1/2 top-full mt-0.5 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap text-[11px] ${minute.live ? 'text-live' : 'text-mute'}`}>
                    {minute.live ? <span className="h-1 w-1 rounded-full bg-live" /> : null}
                    {minute.text}
                  </span>
                ) : null}
              </span>
              {team(away, true)}
            </div>
            {odds && partner ? (
              <div className="ml-auto hidden shrink-0 items-center gap-1.5 md:flex">
                {/* «Реклама» — и у кэфов по ходу матча: раньше там было «PARI / сейчас», а ячейки — ссылки к букмекеру (ст. 18.1) */}
                <span className="mr-1 text-right text-[11px] leading-tight text-mute">
                  {partner.name}
                  {partner.live ? (
                    <span className="ml-1 inline-flex items-center gap-1 text-live">
                      <span className="h-1 w-1 rounded-full bg-live" />
                      сейчас
                    </span>
                  ) : null}
                  <br />
                  Реклама · 18+
                </span>
                {odds.map((o) => (
                  <a
                    key={o.key}
                    href={partner.href}
                    target="_blank"
                    rel={SPONSORED_REL}
                    title={`${o.title}: ${o.odd.toFixed(2)} в ${partner.name} · Реклама 18+`}
                    // подпись исхода над числом, как на табло: без неё «1.01», стоявший сразу после «Хетафе», читался кэфом «Хетафе»
                    className={`flex h-10 min-w-[60px] max-w-[88px] flex-col items-center justify-center rounded-ctl px-2 leading-none transition-colors ${
                      o.hot ? 'bg-acid text-acid-ink hover:bg-acid/85' : 'bg-white/[0.07] text-fg hover:bg-white/[0.14]'
                    }`}
                  >
                    <span className={`block max-w-full truncate text-[10px] ${o.hot ? 'text-acid-ink/70' : 'text-mute'}`}>{outcome(o.key)}</span>
                    <span className="num mt-1 text-[14px] font-semibold">{o.odd.toFixed(2)}</span>
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
    </div>
  )
}
