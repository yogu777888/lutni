import Link from 'next/link'
import type { FeedItem } from '@/lib/data'
import { leagueTitle } from '@/lib/flags'
import { appNow, formatTime } from '@/lib/format'
import { matchHref } from '@/lib/links'
import { matchNotes } from '@/lib/match-notes'
import { isLive } from '@/lib/rank'
import type { MatchFull } from '@/lib/types'
import { buildVerdict } from '@/lib/verdict'
import { Flag } from './Flag'
import { Icon } from './Icon'
import { Tick } from './Live'
import { TeamLogo } from './TeamLogo'
import { untilText } from './shell/StateLine'

/**
 * «Матч в фокусе» — на телефоне и планшете под «Подборками дня» (владелец прислал прототип ChatGPT: «ниже сделать
 * виджет типа матч в фокусе… и там типа команды счет и 1 факт»): турнир и минута, команды и счёт (до начала — время),
 * одна мысль — по ходу и после «Главное» страницы матча (`matchNotes`), до начала — повод самой сильной подборки
 * (`reason`), нет его — вывод по шансам. Вся карточка — ссылка на матч.
 */
export function FocusMatch({ item, full }: { item: FeedItem; full: MatchFull | null }) {
  const m = item.match
  const live = isLive(m)
  const started = m.status !== 'scheduled' && m.status !== 'postponed' && m.status !== 'cancelled'

  const fact: { title: string; text?: string } | null = started
    ? full
      ? (matchNotes({ home: m.home.name, away: m.away.name, score: m.score ?? null, stats: full.stats ?? [], events: full.events, momentum: null, live, minute: m.elapsed })[0] ?? null)
      : null
    : (() => {
        const top = [...item.tags].sort((a, b) => b.score - a.score).find((t) => t.slug !== 'value' && t.reason)
        if (top) return { title: top.reason }
        const v = buildVerdict({ match: m, tags: item.tags })
        return v ? { title: v.headline, text: v.goals ? `${v.goals}.` : undefined } : null
      })()

  const status = live
    ? { text: m.elapsed ? `${m.elapsed}′` : 'идёт', live: true }
    : m.status === 'finished'
      ? { text: 'итог', live: false }
      : null
  const until = m.status === 'scheduled' ? Math.round((m.ts - appNow()) / 60_000) : null

  const team = (t: typeof m.home) => (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <TeamLogo name={t.name} src={t.logo ?? null} size={44} />
      <span className="line-clamp-2 text-[15px] font-semibold leading-tight">{t.name}</span>
    </div>
  )

  return (
    <Link
      href={matchHref(m)}
      aria-label={`Матч в фокусе: ${m.home.name} — ${m.away.name}`}
      className="card block p-4 transition-colors hover:bg-panel-3 sm:p-5"
    >
      <div className="flex items-center justify-between gap-3 text-[13px]">
        <span className="flex items-center gap-1.5 font-semibold text-fg">
          <Icon k="star-outline" size={16} className="text-dim" />
          Матч в фокусе
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-dim">
          <Flag league={m.league} size={16} />
          <span className="truncate">{leagueTitle(m.league.name)}</span>
          {status ? <span className={status.live ? 'shrink-0 font-semibold text-live' : 'shrink-0'}>· {status.text}</span> : null}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3">
        {team(m.home)}
        <div className="pt-1.5 text-center">
          {started && m.score ? (
            <p className="display-num text-[40px] leading-none">
              <Tick v={m.score.home} />
              <span className="mx-1 text-white/25">:</span>
              <Tick v={m.score.away} />
            </p>
          ) : (
            <p className="display-num text-[36px] leading-none">{formatTime(m.ts)}</p>
          )}
          <p className="mt-1.5 text-[13px] text-dim">
            {live
              ? m.elapsed && m.elapsed > 45 ? '2-й тайм' : '1-й тайм'
              : m.status === 'finished'
                ? 'матч завершён'
                : until != null && until > 0 && until < 24 * 60
                  ? untilText(until)
                  : 'мск'}
          </p>
        </div>
        {team(m.away)}
      </div>

      {fact ? (
        <div className="mt-4 rounded-tile bg-white/[0.04] px-4 py-3">
          <p className="text-[15px] font-semibold leading-snug">{fact.title}</p>
          {fact.text ? (
            // текстом, без ⓘ у xG: кнопка подсказки внутри ссылки — недопустимая вложенность
            <p className="mt-1 text-[14px] leading-snug text-dim">{fact.text}</p>
          ) : null}
        </div>
      ) : null}
      {/* вся карточка — ссылка; «кнопка» — подсказка, куда ведёт (владелец: «забыл добавить кнопку открыть обзор матча») */}
      <span className="mt-4 flex h-11 items-center justify-center gap-1.5 rounded-full border border-white/15 text-[15px] font-medium text-fg/90">
        Открыть обзор матча
        <Icon k="arrow-right" size={16} />
      </span>
    </Link>
  )
}
