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
import { TAG_BY_SLUG } from '@/lib/tags'
import { StorySymbol, softTone, symbolSoft } from './story/StorySymbol'
import { Icon } from './Icon'
import { Tick } from './Live'
import { TeamLogo } from './TeamLogo'
import { untilText } from './shell/StateLine'

// названия команд в факте — без кавычек, как в «Выгодно сегодня» (владелец: «не писать названия команд в скобках»)
const plain = (t: string) => t.replace(/[«»]/g, '')

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

  // значок факта: до начала — знак подборки её приглушённым цветом (как в правой панели), по ходу — о чём вывод
  type Fact = { title: string; text?: string; sym?: string; icon?: 'chart' | 'ball' | 'card' | 'swap'; label?: string }
  const fact: Fact | null = started
    ? full
      ? (matchNotes({ home: m.home.name, away: m.away.name, score: m.score ?? null, stats: full.stats ?? [], events: full.events, momentum: null, live, minute: m.elapsed })[0] ?? null)
      : null
    : (() => {
        const top = [...item.tags].sort((a, b) => b.score - a.score).find((t) => t.slug !== 'value' && t.reason)
        if (top) return { title: top.reason, sym: top.slug, label: TAG_BY_SLUG.get(top.slug)?.title }
        const v = buildVerdict({ match: m, tags: item.tags })
        return v ? { title: v.headline, text: v.goals ? `${v.goals}.` : undefined, sym: 'favorit', label: 'Оценка tag.bet' } : null
      })()

  // цвет плашки факта: до начала — подборки (приглушённый, как в правой панели), по ходу — синий «Главного»
  const tone = fact?.sym ? symbolSoft(fact.sym) : softTone('#0a84ff')

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
      className="card flex flex-col p-4 transition-colors hover:bg-panel-3 sm:p-5"
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
        // факт — плашкой цвета своей подборки (по ходу — спокойный синий «Главного»), сверху значок и о чём он,
        // текст — от левого края плашки, без отступа под значок (владелец прислал прототип ChatGPT: «иконку … и сам
        // блок как то подкрасить? и не делай такой большой отступ слева у текста»)
        <div
          className="relative isolate mt-4 overflow-hidden rounded-tile px-4 py-3"
          style={{ background: `color-mix(in oklch, ${tone} 12%, transparent)` }}
        >
          {/* знак подборки крупно на фоне, у правого края — как в «Интересно сегодня» */}
          {fact.sym ? <StorySymbol k={fact.sym} tone={tone} className="pointer-events-none absolute -right-4 top-1/2 -z-10 size-[88px] -translate-y-1/2 opacity-[0.1]" /> : null}
          <p className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: tone }}>
            {fact.sym ? (
              <StorySymbol k={fact.sym} tone={tone} className="h-4 w-4 shrink-0" />
            ) : (
              // по ходу — ⓘ, а не мяч: мяч — «Матчи» в нижнем меню (владелец: «иконка футбольного мячика дублируется»)
              <Icon k="info" size={16} className="shrink-0" />
            )}
            {fact.label ?? 'Главное'}
          </p>
          <p className="mt-1.5 text-[15px] font-semibold leading-snug">{plain(fact.title)}</p>
          {fact.text ? (
            // текстом, без ⓘ у xG: кнопка подсказки внутри ссылки — недопустимая вложенность
            <p className="mt-1 text-[14px] leading-snug text-dim">{plain(fact.text)}</p>
          ) : null}
        </div>
      ) : null}
    </Link>
  )
}
