'use client'

import { useEffect, useRef, useState } from 'react'
import { SPONSORED_REL } from '@/lib/affiliate'
import { BackButton } from '../BackButton'
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
  children,
}: {
  /** хлебные крошки — видны, пока табло на экране */
  children: React.ReactNode
  home: Side
  away: Side
  /** «1 : 0» или «21:00» */
  center: string
  /** «59′» у идущего, «итог» у сыгранного, null — до начала */
  minute: { text: string; live: boolean } | null
  odds: BarOdd[] | null
  partner: { name: string; href: string; live?: boolean } | null
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
        const t = Math.round((ref.current?.getBoundingClientRect().top ?? 72))
        // сами цифры (первый ряд в #match-score): сменяем, когда половина крупного счёта ушла под панель
        const r = (board?.firstElementChild ?? board)?.getBoundingClientRect()
        setShow(r ? (r.top + r.bottom) / 2 < t + 58 : false)
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

  const team = (t: Side, right = false) => (
    <span className={`flex min-w-0 items-center gap-2 ${right ? 'flex-row-reverse text-right' : ''}`}>
      <TeamLogo name={t.name} src={t.logo} size={22} />
      <span className="truncate text-[14px] font-semibold sm:text-[15px]">{t.name}</span>
    </span>
  )

  const swap = ready ? 'transition-[opacity,transform] duration-200 ease-out' : ''
  return (
    // место под шапкой — классами, а не после замера: иначе при заходе на страницу панель вставала на 64px и через кадр
    // прыгала вниз (владелец: «при переходе с главной верхний блок и текст в нём прыгает»). Шапка: от lg — 64px и черта,
    // ниже — два ряда (99px); от xl — 72px, как строка дней на главной (шапка 64 + полоска рамки 8)
    <div ref={ref} className="match-top page-enter sticky top-[105px] z-30 mb-4 lg:top-[71px] xl:top-[72px] xl:mb-2">
      <div className="match-top-in flex min-h-[57.5px] items-center gap-3 rounded-card bg-panel-3 px-3 py-2 shadow-[0_10px_30px_rgb(0_0_0/0.45)] sm:px-4">
        <BackButton fallback="/matches" />
        <div className="relative flex min-w-0 flex-1 items-center self-stretch">
          {/* крошки */}
          <div aria-hidden={show} inert={show} className={`min-w-0 flex-1 ${swap} ${show ? 'pointer-events-none -translate-y-1 opacity-0' : 'opacity-100'}`}>
            {children}
          </div>
          {/* мини-табло на том же месте */}
          <div
            aria-hidden={!show}
            inert={!show}
            className={`absolute inset-0 flex items-center gap-3 ${swap} ${show ? 'opacity-100' : 'pointer-events-none translate-y-1 opacity-0'}`}
          >
            {/* счёт одной группой вплотную — «эмблема Бетис 1:0 Хетафе эмблема» сразу после «←», на месте крошек (владелец:
                «как тебе хлебные крошки и то, что потом появляется?» — по сетке во всю ширину названия прилипали к краям, между
                ними и счётом было по ~300px пустоты); кэфы — справа (ml-auto) */}
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              {team(home)}
              <span className="flex flex-col items-center leading-none">
                <span className="num display-num whitespace-nowrap text-[20px] font-semibold">{center}</span>
                {minute ? (
                  <span className={`mt-0.5 flex items-center gap-1 text-[11px] ${minute.live ? 'text-live' : 'text-mute'}`}>
                    {minute.live ? <span className="h-1 w-1 rounded-full bg-live" /> : null}
                    {minute.text}
                  </span>
                ) : null}
              </span>
              {team(away, true)}
            </div>
            {odds && partner ? (
              <div className="ml-auto hidden shrink-0 items-center gap-1.5 md:flex">
                <span className="mr-1 text-right text-[11px] leading-tight text-mute">
                  {partner.name}
                  <br />
                  {partner.live ? 'сейчас' : 'Реклама'}
                </span>
                {odds.map((o) => (
                  <a
                    key={o.key}
                    href={partner.href}
                    target="_blank"
                    rel={SPONSORED_REL}
                    title={`${o.title}: ${o.odd.toFixed(2)} в ${partner.name} · Реклама 18+`}
                    className={`num grid h-8 min-w-[52px] place-items-center rounded-ctl px-2 text-[14px] font-semibold transition-colors ${
                      o.hot ? 'bg-acid text-acid-ink hover:bg-acid/85' : 'bg-white/[0.07] text-fg hover:bg-white/[0.14]'
                    }`}
                  >
                    {o.odd.toFixed(2)}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
