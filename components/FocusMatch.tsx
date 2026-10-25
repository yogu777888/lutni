import Link from 'next/link'
import type { FeedItem } from '@/lib/data'
import { leagueTitle } from '@/lib/flags'
import { appNow, formatTime } from '@/lib/format'
import { teamCode } from '@/lib/i18n/codes'
import { matchHref } from '@/lib/links'
import { matchNotes } from '@/lib/match-notes'
import { isLive } from '@/lib/rank'
import type { MatchFull } from '@/lib/types'
import { buildVerdict, split100 } from '@/lib/verdict'
import { Flag } from './Flag'
import { Tick } from './Live'
import { TeamLogo } from './TeamLogo'
import { XgTerm, XgText } from './match/Xg'
import { untilText } from './shell/StateLine'

const dec2 = (n: number) => n.toFixed(2).replace('.', ',')

/**
 * «Матч в фокусе» — первый блок главной под заголовком «Сегодня в футболе» (владелец прислал прототип ChatGPT: «а как
 * тебе такая идея для главного?»): табло одного главного матча, три цифры (по ходу — xG, удары, угловые; до начала —
 * шансы исходов), «Главное» одной мыслью и переход к обзору. Не «Матч дня»-баннер: цвета клубов и крупных эмблем нет,
 * карточка — как блоки страницы матча.
 */
export function FocusMatch({ item, full }: { item: FeedItem; full: MatchFull | null }) {
  const m = item.match
  const live = isLive(m)
  const started = m.status !== 'scheduled' && m.status !== 'postponed' && m.status !== 'cancelled'
  const stats = full?.stats ?? []

  // три цифры: по ходу и после — как под табло страницы матча; до начала — шансы исходов (оценка по линии)
  const quick = started
    ? (['expectedGoals', 'totalShots', 'cornerKicks'] as const)
        .map((k) => stats.find((s) => s.key === k))
        .filter((s): s is NonNullable<typeof s> => Boolean(s))
        .map((s) => ({
          key: s.key,
          label: s.key === 'expectedGoals' ? <XgTerm /> : s.key === 'totalShots' ? 'Удары' : 'Угловые',
          home: s.key === 'expectedGoals' ? dec2(s.home) : String(s.home),
          away: s.key === 'expectedGoals' ? dec2(s.away) : String(s.away),
        }))
    : []
  const verdict = started ? null : buildVerdict({ match: m, tags: item.tags })
  const chances = verdict ? split100(verdict.probs) : null

  // «Главное» — самый важный вывод страницы матча; до начала — вывод по шансам
  const note = started && full
    ? (matchNotes({ home: m.home.name, away: m.away.name, score: m.score ?? null, stats, events: full.events, momentum: null, live, minute: m.elapsed })[0] ?? null)
    : verdict
      ? { title: verdict.headline, text: verdict.goals ? `${verdict.goals}.` : `Шансы: ${verdict.chances}.` }
      : null

  const status = live
    ? { text: m.elapsed ? `${m.elapsed}′` : 'идёт', live: true }
    : m.status === 'finished'
      ? { text: 'итог', live: false }
      : null
  const until = m.status === 'scheduled' ? Math.round((m.ts - appNow()) / 60_000) : null
  const href = matchHref(m)

  const team = (t: typeof m.home) => (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <TeamLogo name={t.name} src={t.logo ?? null} size={48} />
      <span className="line-clamp-2 text-[15px] font-semibold leading-tight sm:text-[16px]">{t.name}</span>
    </div>
  )

  return (
    <article className="card relative p-4 sm:p-5" aria-label={`Матч в фокусе: ${m.home.name} — ${m.away.name}`}>
      <div className="flex items-center justify-between gap-3 text-[13px]">
        <span className="font-semibold text-fg">Матч в фокусе</span>
        <span className="flex min-w-0 items-center gap-1.5 text-dim">
          <Flag league={m.league} size={16} />
          <span className="truncate">{leagueTitle(m.league.name)}</span>
          {status ? (
            <span className={status.live ? 'shrink-0 font-semibold text-live' : 'shrink-0'}>· {status.text}</span>
          ) : null}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3">
        {team(m.home)}
        <div className="pt-2 text-center">
          {started && m.score ? (
            <p className="display-num text-[40px] leading-none sm:text-[44px]">
              <Tick v={m.score.home} />
              <span className="mx-1 text-white/25">:</span>
              <Tick v={m.score.away} />
            </p>
          ) : (
            <p className="display-num text-[36px] leading-none sm:text-[40px]">{formatTime(m.ts)}</p>
          )}
          <p className="mt-1.5 text-[13px] text-dim">
            {live ? (m.elapsed && m.elapsed > 45 ? '2-й тайм' : '1-й тайм') : m.status === 'finished' ? 'матч завершён' : until != null && until < 24 * 60 ? untilText(until) : 'мск'}
          </p>
        </div>
        {team(m.away)}
      </div>

      {quick.length >= 2 ? (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {quick.map((q) => (
            <div key={q.key} className="rounded-tile bg-white/[0.04] px-2 py-2.5 text-center">
              <p className="num whitespace-nowrap text-[14px] font-semibold leading-tight min-[400px]:text-[16px]">
                {q.home} <span className="text-mute">:</span> {q.away}
              </p>
              <p className="mt-1 truncate text-[12px] text-dim">{q.label}</p>
            </div>
          ))}
        </div>
      ) : chances ? (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {([
            ['home', teamCode(m.home.name)],
            ['draw', 'Ничья'],
            ['away', teamCode(m.away.name)],
          ] as const).map(([k, label]) => (
            <div key={k} className="rounded-tile bg-white/[0.04] px-2 py-2.5 text-center">
              <p className="num whitespace-nowrap text-[14px] font-semibold leading-tight min-[400px]:text-[16px]">{chances[k]}%</p>
              <p className="mt-1 truncate text-[12px] text-dim">{label}</p>
            </div>
          ))}
        </div>
      ) : null}

      {note ? (
        <div className="mt-3 rounded-tile bg-white/[0.04] p-4">
          <p className="text-[13px] text-dim">{started ? 'Главное за минуту' : 'Перед матчем'}</p>
          <p className="mt-1 text-[15px] font-semibold leading-snug">{note.title}</p>
          <p className="mt-1 text-[14px] leading-snug text-dim">
            <XgText text={note.text} />
          </p>
        </div>
      ) : null}

      <Link
        href={href}
        className="mt-3 flex h-11 items-center justify-center gap-1.5 rounded-ctl border border-white/10 text-[15px] font-medium transition-colors hover:bg-white/[0.06]"
      >
        Открыть обзор матча <span aria-hidden>→</span>
      </Link>
    </article>
  )
}
