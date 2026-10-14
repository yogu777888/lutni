import Link from 'next/link'
import { SITE } from '@/config/site'
import { formatTime, formatWeekdayLong, formatDateLong, ymdInTz } from '@/lib/format'
import { leagueHref } from '@/lib/links'
import type { Pick } from '@/lib/model'
import type { TagHit } from '@/lib/tags'
import type { Match } from '@/lib/types'
import { split100, type Verdict } from '@/lib/verdict'
import { FavStar } from '../FavStar'
import { ClubGlow, ShellTint } from '../shell/tint'
import { TeamLogo } from '../TeamLogo'
import { PickPanel, TagsRow, VerdictRows } from './VerdictCard'

/**
 * Первый блок страницы матча до начала — «Прогноз tag.bet» (владелец: «убрать блок, где счёт и наша оценка в процентах, и
 * чтобы первый блок был наш предикт? и ему градиентности придавать?»): табло и «Наш вывод» повторяли одни и те же цифры
 * (оценку, кэф, честную цену, выгоду). Сверху — компактная строка матча (кто, где, когда: человек из поиска должен сразу
 * видеть, что попал куда нужно), крупно — вывод словами, одной строкой — оценка tag.bet тремя процентами, ниже — ставка
 * с кнопкой к букмекеру, «Разбор за минуту» и подборки. Фон — свечение цветами клубов (лайм на фон не пускаем: лайм —
 * кнопка и выгодный кэф). После начала матча — прежнее табло со счётом (`MatchHero`).
 */
export function PredictHero({
  m,
  v,
  pick,
  probs,
  tags,
  tint,
  story,
}: {
  m: Match
  v: Verdict | null
  pick: Pick | null
  probs: { home: number; draw: number; away: number } | null
  tags: TagHit[]
  tint: { home: string; away: string } | null
  story: React.ReactNode
}) {
  const ymd = ymdInTz(m.ts)
  const n = probs ? split100(probs) : null
  // на телефоне — эмблема над названием (в строку «А..» не влезало), от sm — в строку со звёздочкой
  const team = (t: Match['home'], right = false) => (
    <span className={`flex min-w-0 flex-col items-center gap-1.5 text-center sm:flex-row sm:gap-3 ${right ? 'sm:flex-row-reverse sm:text-right' : 'sm:text-left'}`}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/[0.08] ring-1 ring-white/15 sm:h-12 sm:w-12">
        <TeamLogo name={t.name} src={t.logo} size={30} />
      </span>
      <span className="line-clamp-2 min-w-0 text-[14px] font-semibold leading-tight tracking-[-0.01em] sm:truncate sm:text-[19px]">{t.name}</span>
      <span className="hidden sm:block">
        <FavStar id={t.id} name={t.name} logo={t.logo} compact />
      </span>
    </span>
  )
  return (
    <section id="match-hero" className="card relative scroll-mt-24 overflow-hidden p-5 sm:p-7">
      <ShellTint id={m.id} ymd={ymd} home={tint?.home} away={tint?.away} />
      {/* свечение цветами клубов; пока цвета не известны — мягкий свет сверху, как у центральной панели */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_0%,rgb(200_255_46/0.07),transparent_70%)]" />
      <ClubGlow id={m.id} ymd={ymd} home={tint?.home} away={tint?.away} />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[13px] text-dim">
          <Link href={leagueHref(m.league)} className="font-semibold text-fg transition-colors hover:text-dim">
            {m.league.name}
          </Link>
          <span>
            {m.round ? `${m.round} · ` : ''}
            <span className="capitalize">{formatWeekdayLong(m.ts)}</span>, {formatDateLong(m.ts)}
          </span>
        </div>

        {/* строка матча: по ней же мини-табло понимает, что пора появиться (#match-board) */}
        <div id="match-board" className="mt-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-5">
          {team(m.home)}
          <span className="text-center leading-none">
            <span className="num display-num block text-[30px] font-semibold sm:text-[36px]">{formatTime(m.ts)}</span>
            <span className="mt-1 block text-[11px] text-mute">{SITE.tzLabel.toLowerCase()}</span>
          </span>
          {team(m.away, true)}
        </div>

        <div className="mt-7 border-t border-white/10 pt-6">
          <p className="text-[13px] font-medium text-dim">
            Прогноз tag.bet <span className="text-mute">· оценка, а не гарантия · 18+</span>
          </p>
          {v ? <p className="mt-2 text-[28px] font-bold leading-tight tracking-[-0.025em] sm:text-[36px]">{v.headline}</p> : null}
          {n ? (
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[15px] text-dim">
              <span>
                <b className="num font-semibold text-fg">{n.home}%</b> {m.home.name}
              </span>
              <span>
                <b className="num font-semibold text-fg">{n.draw}%</b> ничья
              </span>
              <span>
                <b className="num font-semibold text-fg">{n.away}%</b> {m.away.name}
              </span>
            </p>
          ) : null}
          {v ? <VerdictRows v={v} className="mt-4" /> : null}
          {pick ? <PickPanel pick={pick} match={m} className="mt-5 !bg-black/25" /> : null}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            {story}
            <TagsRow tags={tags} />
          </div>
        </div>
      </div>
    </section>
  )
}
