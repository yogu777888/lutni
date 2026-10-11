'use client'

import { useEffect, useState } from 'react'
import { goHref, SPONSORED_REL } from '@/lib/affiliate'
import { formatTime } from '@/lib/format'
import type { HandNotes } from '@/lib/hand-notes'
import type { X12Line } from '@/lib/lines'
import type { Match } from '@/lib/types'
import { HandNote } from './FactChip'
import { Tick } from './Live'
import { TeamLogo } from './TeamLogo'
import { setShellTint, useMatchTint } from './shell/tint'
import { StoryLink } from './story/StoryLink'

export type HeroItem = {
  m: Match
  href: string
  /** цвета клубов (lib/team-colors) — градиент центральной панели и свечение за карточкой */
  tint: { home: string; away: string } | null
  /** метки-факты над эмблемами (lib/hand-notes.ts) */
  notes: HandNotes | null
  /** кэфы одного букмекера до начала */
  line: X12Line | null
  /** live-кэфы PARI идущего матча */
  liveLine: X12Line | null
}

const live = (m: Match) => m.status === 'live' || m.status === 'suspended'

/** На телефоне длинное название мельче, а не перенос по букве. */
function phoneSize(name: string): string {
  const longest = Math.max(...name.split(/[\s-]+/).map((w) => w.length))
  return longest >= 12 ? 'text-[14px]' : longest >= 10 ? 'text-[16px]' : 'text-[18px]'
}

/** Кэфы одной строкой — переход к букмекеру (реклама). */
function OddsLine({ line, m, isLive }: { line: X12Line; m: Match; isLive: boolean }) {
  const odds = [
    ['Хозяева', line.home],
    ['Ничья', line.draw],
    ['Гости', line.away],
  ] as const
  return (
    <a
      href={goHref(line.slug, isLive ? 'main-live-odds' : 'main-odds', m.id)}
      target="_blank"
      rel={SPONSORED_REL}
      title={`Коэффициенты ${line.bookmaker} на ${formatTime(line.at)}`}
      className="mx-auto flex w-fit max-w-full flex-wrap items-baseline justify-center gap-x-4 gap-y-1 rounded-ctl px-3 py-1.5 transition-colors hover:bg-white/[0.07]"
    >
      {isLive ? (
        <span className="flex items-center gap-1.5 self-center text-[13px] font-medium text-live">
          <span className="h-1.5 w-1.5 rounded-full bg-live" />
          Сейчас в матче
        </span>
      ) : null}
      {odds.map(([label, odd]) => (
        <span key={label} className="flex items-baseline gap-1.5">
          <span className="text-[14px] text-fg/70">{label}</span>
          <span className="num text-[16px] font-semibold text-fg">{odd.toFixed(2)}</span>
        </span>
      ))}
      <span className="text-[13px] text-fg/55">{line.bookmaker} · Реклама</span>
    </a>
  )
}

/**
 * «Матч дня» — один главный матч крупно на первом экране главной, как обложка у Spotify: карточка без своего фона
 * стоит прямо на градиенте центральной панели, а градиент окрашивается цветами клубов этого матча (`setShellTint`).
 * Ниже xl панели нет — за карточкой своё мягкое свечение теми же цветами. Эмблемы на светлых кругах, над ними
 * метки-факты, между ними время / счёт и минута / итог; под табло — кэфы одной строкой и белая «Разбор за минуту»
 * (сторис матча). Под карточкой — вкладки с остальными главными матчами дня: клик меняет матч и цвет градиента.
 */
export function DayHero({ items, ymd }: { items: HeroItem[]; ymd: string }) {
  const [i, setI] = useState(0)
  const it = items[Math.min(i, items.length - 1)]
  const t = useMatchTint(it?.m.id, ymd, it?.tint)
  useEffect(() => {
    setShellTint(t?.home, t?.away)
  }, [t?.home, t?.away])
  useEffect(() => () => setShellTint(null, null), [])
  if (!it) return null
  const m = it.m
  const played = Boolean(m.score) && (live(m) || m.status === 'finished')
  const lead = played && m.score!.home !== m.score!.away ? (m.score!.home > m.score!.away ? 'home' : 'away') : null
  const line = live(m) ? it.liveLine : m.status === 'scheduled' ? it.line : null

  const team = (k: 'home' | 'away') => {
    const tm = m[k]
    const note = it.notes?.[k]
    return (
      <div className={`flex min-w-0 flex-col items-center gap-3 text-center transition-opacity ${lead && lead !== k ? 'opacity-60' : ''}`}>
        <span className="relative grid h-[var(--disc)] w-[var(--disc)] place-items-center rounded-full bg-white/[0.14] ring-1 ring-white/15 [--disc:84px] sm:[--disc:120px] lg:[--disc:136px]">
          {note ? <HandNote text={note} short={note.length <= 12} /> : null}
          <TeamLogo name={tm.name} src={tm.logo} size="calc(var(--disc) * 0.62)" />
        </span>
        <span className={`line-clamp-2 max-w-full hyphens-auto text-balance break-words font-semibold leading-tight tracking-[-0.02em] sm:text-[22px] lg:text-[26px] ${phoneSize(tm.name)}`}>
          {tm.name}
        </span>
      </div>
    )
  }

  return (
    <section aria-label="Матч дня" className="relative mt-6 sm:mt-8">
      {/* ниже xl градиента панели нет — своё свечение цветами клубов за карточкой */}
      {t ? (
        <div
          aria-hidden
          className="hero-tint pointer-events-none absolute -inset-x-4 -top-28 bottom-0 transition-[background] duration-700 xl:hidden"
          style={{
            background: `radial-gradient(55% 80% at 15% 40%, color-mix(in oklab, ${t.home} 22%, transparent), transparent 70%), radial-gradient(55% 80% at 85% 40%, color-mix(in oklab, ${t.away} 22%, transparent), transparent 70%)`,
          }}
        />
      ) : null}

      <div key={m.id} className="fade-up relative">
        <p className="flex items-center justify-center gap-2 text-[13px] font-medium text-dim">
          {live(m) ? <span className="h-1.5 w-1.5 rounded-full bg-live" /> : null}
          <span className="truncate">
            {m.league.name}
            {m.round ? ` · ${m.round}` : ''}
          </span>
        </p>

        <div className="mt-9 grid grid-cols-[1fr_auto_1fr] items-start gap-3 sm:mt-11 sm:gap-6">
          {team('home')}
          <StoryLink id={m.id} href={it.href} className="flex h-[var(--disc)] flex-col items-center justify-center gap-2 [--disc:84px] sm:[--disc:120px] lg:[--disc:136px]">
            {played ? (
              <>
                <span className="num display-num whitespace-nowrap text-[44px] leading-none text-white sm:text-[64px] lg:text-[76px]">
                  <Tick v={m.score!.home} />
                  <span className="mx-1.5 text-mute">:</span>
                  <Tick v={m.score!.away} />
                </span>
                <span className={`text-[13px] font-medium leading-none ${live(m) ? 'text-live' : 'text-mute'}`}>
                  {live(m) ? (m.statusCode === 4 ? 'перерыв' : m.elapsed ? `${m.elapsed}′` : 'идёт') : 'итог'}
                </span>
              </>
            ) : (
              <>
                <span className="num display-num text-[44px] leading-none sm:text-[64px] lg:text-[76px]">{formatTime(m.ts)}</span>
                <span className="text-[13px] leading-none text-mute">начало, мск</span>
              </>
            )}
          </StoryLink>
          {team('away')}
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          {line ? <OddsLine line={line} m={m} isLive={live(m)} /> : null}
          <StoryLink
            id={m.id}
            href={it.href}
            className="inline-flex h-10 items-center gap-2.5 rounded-full bg-white pl-1.5 pr-4 text-[14px] font-semibold text-ink transition-colors hover:bg-white/85"
          >
            <span aria-hidden className="grid h-7 w-7 place-items-center rounded-full bg-ink text-white">
              <svg viewBox="0 0 24 24" className="ml-0.5 h-3 w-3" fill="currentColor">
                <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" />
              </svg>
            </span>
            Разбор за минуту
          </StoryLink>
        </div>
      </div>

      {items.length > 1 ? (
        <div role="tablist" aria-label="Главные матчи дня" className="scrollbar-none relative -mx-4 mt-8 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:justify-center sm:px-0">
          {items.map((x, j) => {
            const on = j === i
            const xl = live(x.m)
            return (
              <button
                key={x.m.id}
                type="button"
                role="tab"
                aria-selected={on}
                title={`${x.m.home.name} — ${x.m.away.name}`}
                onClick={() => setI(j)}
                className={`flex h-11 shrink-0 items-center gap-2 rounded-full pl-1.5 pr-3.5 transition-colors ${on ? 'bg-white/[0.16] ring-1 ring-white/25' : 'bg-white/[0.05] hover:bg-white/[0.1]'}`}
              >
                <span className="flex -space-x-2">
                  {[x.m.home, x.m.away].map((tm) => (
                    <span key={tm.id} className="grid h-8 w-8 place-items-center rounded-full bg-panel-3 ring-2 ring-panel-2">
                      <TeamLogo name={tm.name} src={tm.logo} size={20} />
                    </span>
                  ))}
                </span>
                <span className={`num text-[13.5px] font-semibold ${xl ? 'text-live' : on ? 'text-fg' : 'text-dim'}`}>
                  {xl ? (x.m.score ? `${x.m.score.home}:${x.m.score.away}` : 'LIVE') : x.m.status === 'finished' && x.m.score ? `${x.m.score.home}:${x.m.score.away}` : formatTime(x.m.ts)}
                </span>
              </button>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
