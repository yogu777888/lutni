'use client'

import { useEffect, useState } from 'react'
import { goHref, SPONSORED_REL } from '@/lib/affiliate'
import { formatTime } from '@/lib/format'
import type { HandNotes } from '@/lib/hand-notes'
import type { X12Line } from '@/lib/lines'
import type { Match } from '@/lib/types'
import { Tick } from './Live'
import { TeamLogo } from './TeamLogo'
import { useMatchTint } from './shell/tint'
import { StoryLink } from './story/StoryLink'

export type HeroItem = {
  m: Match
  href: string
  /** цвета клубов (lib/team-colors) — заливка баннера: слева цвет хозяев, справа гостей */
  tint: { home: string; away: string } | null
  /** факты о командах (lib/hand-notes.ts) — строкой под счётом */
  notes: HandNotes | null
  /** кэфы одного букмекера до начала */
  line: X12Line | null
  /** live-кэфы PARI идущего матча */
  liveLine: X12Line | null
}

/**
 * Круг клуба в «обложке» баннера: плоский диск цветом клуба (рисуется кодом — чёткий при любом размере), в нём белая
 * подложка и эмблема в её настоящем размере. У SStats эмблемы 150×150 — чёткие до ~75px (на ретине ×2); растянутые
 * до 170px они мылились, а обводка в вектор давала рваные края (владелец: «уродские лого»). Белая подложка заодно
 * прячет эмблемы с непрозрачным фоном.
 */
function ClubDisc({ t, color, className = '' }: { t: Match['home']; color: string | null; className?: string }) {
  // плоский круг без объёма и тени (владелец: «может круги плоскими без объёма сделать»)
  const fill = color ?? '#232b35'
  return (
    <span className={`absolute grid place-items-center rounded-full ${className}`} style={{ background: fill }}>
      <span className="grid h-[88px] w-[88px] place-items-center overflow-hidden rounded-full bg-white sm:h-[100px] sm:w-[100px]">
        <TeamLogo name={t.name} src={t.logo} size={64} />
      </span>
    </span>
  )
}

const live = (m: Match) => m.status === 'live' || m.status === 'suspended'

/** Кэфы одной строкой — переход к букмекеру (реклама). */
function OddsLine({ line, m, isLive }: { line: X12Line; m: Match; isLive: boolean }) {
  // названия команд вместо «Хозяева/Гости»
  const odds = [
    [m.home.name, line.home],
    ['Ничья', line.draw],
    [m.away.name, line.away],
  ] as const
  return (
    <a
      href={goHref(line.slug, isLive ? 'main-live-odds' : 'main-odds', m.id)}
      target="_blank"
      rel={SPONSORED_REL}
      title={`Коэффициенты ${line.bookmaker} на ${formatTime(line.at)}`}
      className="flex w-fit max-w-full flex-wrap items-baseline gap-x-4 gap-y-1 text-white/90 transition-opacity hover:opacity-80"
    >
      {isLive ? (
        <span className="flex items-center gap-1.5 self-center text-[13px] font-medium text-live">
          <span className="h-1.5 w-1.5 rounded-full bg-live" />
          Сейчас в матче
        </span>
      ) : null}
      {odds.map(([label, odd]) => (
        <span key={label} className="flex items-baseline gap-1.5">
          <span className="text-[14px] text-white/65">{label}</span>
          <span className="num text-[16px] font-semibold text-white">{odd.toFixed(2)}</span>
        </span>
      ))}
      <span className="text-[13px] text-white/50">{line.bookmaker} · Реклама</span>
    </a>
  )
}

/** Хороший факт или плохой — цвет точки (как у меток-фактов на странице матча). */
const noteTone = (t: string) => (/поражен|без побед|вылет/.test(t) ? 'bg-live' : 'bg-acid')

/** Минута / «перерыв» / «итог» рядом со счётом. */
const stateText = (m: Match) => (live(m) ? (m.statusCode === 4 ? 'перерыв' : m.elapsed ? `${m.elapsed}′` : 'идёт') : 'итог')

/**
 * «Матч дня» — баннер, как шапка плейлиста у Spotify или Apple TV (владелец: «как бы ты сделал красиво матч дня?»):
 * карточка во всю ширину, залитая тёмным градиентом цветов клубов (слева хозяева, справа гости; цвет — внутри
 * карточки, а не на всю страницу). Слева текст: «Матч дня · турнир · тур», крупно название матча (Oswald), счёт и
 * минута / время начала, факты о командах, белая «Разбор за минуту» и кэфы одной строкой. Справа — «обложка»: два
 * круга цветами клубов внахлёст, в них эмблемы в настоящем размере (`ClubDisc`). Всё выровнено по левому краю, как полки ниже.
 * Под баннером — «Ещё главные матчи» плитками: клик подменяет матч в баннере.
 */
export function DayHero({ items, ymd }: { items: HeroItem[]; ymd: string }) {
  const [i, setI] = useState(0)
  const it = items[Math.min(i, items.length - 1)]
  const t = useMatchTint(it?.m.id, ymd, it?.tint)
  if (!it) return null
  const m = it.m
  const played = Boolean(m.score) && (live(m) || m.status === 'finished')
  const line = live(m) ? it.liveLine : m.status === 'scheduled' ? it.line : null
  const facts = (['home', 'away'] as const).filter((k) => it.notes?.[k]).map((k) => ({ team: m[k].name, text: it.notes![k]! }))
  const mix = (c: string, p: number) => `color-mix(in oklab, ${c} ${p}%, #0b0f14)`
  // как у Spotify — один насыщенный цвет на весь баннер (хозяева), без смешивания двух клубов в бурое; цвет гостей —
  // у его круга справа (у двух красных клубов — второй цвет гостей, `distinctPair`)
  const fill = t
    ? [
        `linear-gradient(90deg, rgb(11 15 20 / 0.35), transparent 55%)`,
        `linear-gradient(160deg, ${mix(t.home, 82)} 0%, ${mix(t.home, 58)} 45%, ${mix(t.home, 30)} 100%)`,
      ].join(', ')
    : undefined
  return (
    <section aria-label="Матч дня" className="mt-4 sm:mt-5">
      <div
        key={m.id}
        className="fade-up relative isolate overflow-hidden rounded-card bg-panel-3 transition-[background] duration-700"
        style={fill ? { background: fill } : undefined}
      >
        {/* «обложка» справа: два круга цветами клубов внахлёст, в каждом — эмблема в настоящем размере на белом */}
        <div aria-hidden className="pointer-events-none relative h-[190px] sm:absolute sm:inset-y-0 sm:right-0 sm:h-auto sm:w-[44%]">
          <ClubDisc t={m.home} color={t?.home ?? null} className="left-[calc(50%-150px)] top-6 z-[1] h-[150px] w-[150px] sm:left-auto sm:right-[34%] sm:top-[12%] sm:h-[clamp(170px,16vw,230px)] sm:w-[clamp(170px,16vw,230px)]" />
          <ClubDisc t={m.away} color={t?.away ?? null} className="left-[calc(50%-10px)] top-14 h-[140px] w-[140px] sm:left-auto sm:-right-[6%] sm:top-auto sm:bottom-[8%] sm:h-[clamp(160px,15vw,215px)] sm:w-[clamp(160px,15vw,215px)]" />
        </div>

        <div className="relative px-5 pb-6 pt-1 sm:max-w-[60%] sm:px-8 sm:py-8 lg:px-10 lg:py-10">
          <p className="flex items-center gap-2 text-[13px] font-medium text-white/75">
            <span className="font-semibold uppercase tracking-[0.08em] text-white">Матч дня</span>
            <span aria-hidden>·</span>
            <span className="truncate">
              {m.league.name}
              {m.round ? ` · ${m.round}` : ''}
            </span>
          </p>
          <StoryLink id={m.id} href={it.href} className="mt-3 block">
            <span className="h2 block text-balance text-[34px] leading-[1.02] text-white sm:text-[44px] lg:text-[56px]">
              {m.home.name} — {m.away.name}
            </span>
          </StoryLink>

          <div className="mt-4 flex items-baseline gap-3">
            {played ? (
              <>
                <span className="num display-num whitespace-nowrap text-[40px] leading-none text-white sm:text-[48px]">
                  <Tick v={m.score!.home} />
                  <span className="mx-1 text-white/45">:</span>
                  <Tick v={m.score!.away} />
                </span>
                <span className={`flex items-center gap-1.5 text-[14px] font-semibold ${live(m) ? 'text-live' : 'text-white/60'}`}>
                  {live(m) ? <span className="h-2 w-2 animate-pulse rounded-full bg-live" /> : null}
                  {stateText(m)}
                </span>
              </>
            ) : (
              <>
                <span className="num display-num text-[40px] leading-none text-white sm:text-[48px]">{formatTime(m.ts)}</span>
                <span className="text-[14px] text-white/60">начало, мск</span>
              </>
            )}
          </div>

          {facts.length ? (
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-[14px] text-white/80">
              {facts.map((f) => (
                <li key={f.team} className="flex items-center gap-2">
                  <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${noteTone(f.text)}`} />
                  <span>
                    <span className="font-semibold text-white">{f.team}</span> — {f.text}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-6 flex flex-col items-start gap-4">
            <StoryLink
              id={m.id}
              href={it.href}
              className="inline-flex h-11 items-center gap-2.5 rounded-full bg-white pl-1.5 pr-5 text-[15px] font-semibold text-ink transition-colors hover:bg-white/85"
            >
              <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-ink text-white">
                <svg viewBox="0 0 24 24" className="ml-0.5 h-3.5 w-3.5" fill="currentColor">
                  <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" />
                </svg>
              </span>
              Разбор за минуту
            </StoryLink>
            {line ? <OddsLine line={line} m={m} isLive={live(m)} /> : null}
          </div>
        </div>
      </div>

      {items.length > 1 ? (
        <div className="mt-4">
          <p className="text-[13px] font-medium text-mute">Ещё главные матчи</p>
          <div className="scrollbar-none -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 2xl:grid-cols-4">
            {items.map((x, j) => {
              if (j === i) return null
              const xm = x.m
              const xl = live(xm)
              return (
                <button
                  key={xm.id}
                  type="button"
                  title="Показать в «Матче дня»"
                  onClick={() => setI(j)}
                  className="card flex w-[78%] shrink-0 items-center gap-3 p-3 text-left transition-colors hover:bg-panel-3 sm:w-auto"
                >
                  <span className="flex shrink-0 -space-x-3">
                    {[xm.home, xm.away].map((tm) => (
                      <span key={tm.id} className="grid h-9 w-9 place-items-center rounded-full bg-panel-3 ring-2 ring-panel-2">
                        <TeamLogo name={tm.name} src={tm.logo} size={22} />
                      </span>
                    ))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold">
                      {xm.home.name} — {xm.away.name}
                    </span>
                    <span className="block truncate text-[12.5px] text-dim">{xm.league.name}</span>
                  </span>
                  <span className={`num shrink-0 text-[15px] font-semibold ${xl ? 'text-live' : ''}`}>
                    {(xl || xm.status === 'finished') && xm.score ? `${xm.score.home}:${xm.score.away}` : formatTime(xm.ts)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </section>
  )
}
