'use client'

import { useEffect, useState } from 'react'
import { SPONSORED_REL } from '@/lib/affiliate'
import { BackButton } from '../BackButton'
import { TeamLogo } from '../TeamLogo'

type Side = { name: string; logo: string | null }
export type BarOdd = { key: 'home' | 'draw' | 'away'; odd: number; hot: boolean; title: string }

/**
 * Мини-табло страницы матча (владелец: «верхний блок в матче не закреплён — это правильно?», согласился на мини-табло,
 * как у Apple Sports и Flashscore): пока верх табло (`#match-board`) на экране — его нет; уехал вверх — под шапкой
 * полоска «← · эмблема Хозяева 1 : 0 Гости эмблема · ● 59′», справа три кэфа партнёра ячейками-ссылками (выгодный —
 * лаймом). Крошки не закрепляем — при чтении статистики они не нужны. На телефоне — без кэфов (внизу своя плашка).
 * Обёртка — sticky высотой 0 под шапкой: полоска лежит поверх содержимого и не сдвигает страницу.
 */
export function MatchBar({
  home,
  away,
  center,
  minute,
  odds,
  partner,
}: {
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
  const [oddsGone, setOddsGone] = useState(true)
  const [top, setTop] = useState(64)

  useEffect(() => {
    // полоска — как только под шапку ушёл верх табло (эмблемы, названия, счёт или время), а не весь блок матча:
    // иначе полэкрана счёта не было видно нигде (владелец согласился); кэфы в полоске — когда ушли и кэфы табло,
    // чтобы одни и те же три числа не стояли дважды
    const board = document.getElementById('match-board') ?? document.getElementById('match-hero')
    const heroOdds = document.getElementById('match-odds')
    const head = document.querySelector('header')
    if (!board) return
    const place = () => setTop(innerWidth >= 1280 ? 72 : Math.round(head?.getBoundingClientRect().bottom ?? 64) + 6)
    place()
    const margin = `-${(head?.getBoundingClientRect().bottom ?? 64) + 20}px 0px 0px 0px`
    const gone = (set: (v: boolean) => void) => new IntersectionObserver(([e]) => set(!e.isIntersecting && e.boundingClientRect.top < 0), { rootMargin: margin })
    const io = gone(setShow)
    io.observe(board)
    const io2 = heroOdds ? gone(setOddsGone) : null
    if (heroOdds) io2!.observe(heroOdds)
    addEventListener('resize', place)
    return () => {
      io.disconnect()
      io2?.disconnect()
      removeEventListener('resize', place)
    }
  }, [])

  const team = (t: Side, right = false) => (
    <span className={`flex min-w-0 items-center gap-2 ${right ? 'flex-row-reverse text-right' : ''}`}>
      <TeamLogo name={t.name} src={t.logo} size={22} />
      <span className="truncate text-[14px] font-semibold sm:text-[15px]">{t.name}</span>
    </span>
  )

  return (
    <div className="sticky z-30 h-0" style={{ top }}>
      <div
        aria-hidden={!show}
        inert={!show}
        className={`absolute inset-x-0 top-0 flex items-center gap-3 rounded-card bg-panel-3 px-3 py-2 shadow-[0_10px_30px_rgb(0_0_0/0.45)] transition-[opacity,transform] duration-200 sm:px-4 ${
          show ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
        }`}
      >
        <BackButton fallback="/matches" />
        <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
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
        {odds && partner && oddsGone ? (
          <div className="hidden shrink-0 items-center gap-1.5 md:flex">
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
  )
}
