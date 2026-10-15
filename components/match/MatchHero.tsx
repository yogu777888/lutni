import Link from 'next/link'
import { SITE } from '@/config/site'
import { SPONSORED_REL } from '@/lib/affiliate'
import { formatDateLong, formatTime, formatWeekdayLong, ymdInTz } from '@/lib/format'
import { leagueHref } from '@/lib/links'
import { split100 } from '@/lib/verdict'
import type { MatchFull } from '@/lib/types'
import { TeamLogo } from '../TeamLogo'
import { HandNote } from '../FactChip'
import type { HandNotes } from '@/lib/hand-notes'
import { Tick } from '../Live'
import { FavStar } from '../FavStar'
import { ShellTint } from '../shell/tint'
import { scorers } from './EventsBlock'

/** Ячейка табло: шанс исхода, лучший коэффициент и честная цена; hot — платят больше честного. */
export type BoardCell = {
  key: 'home' | 'draw' | 'away'
  label: string
  p: number
  odd: number | null
  fair: number
  hot: boolean
}

/** На телефоне колонка команды узкая: длинное слово («Саутгемптон») — мельче шрифт, а не перенос по букве. */
const phoneSize = (name: string) => {
  const longest = Math.max(...name.split(/[\s-]+/).map((w) => w.length))
  return longest >= 12 ? 'text-[13px]' : longest >= 10 ? 'text-[14px]' : 'text-[16px]'
}

const signed = (ev: number) => `${ev >= 0 ? '+' : '−'}${Math.abs(ev * 100).toFixed(1).replace('.', ',')}%`

/**
 * Табло матча (как на стадионе): команды, время или счёт, «Разбор за минуту»; ниже — оценка tag.bet тремя процентами
 * и кэфы партнёра с честной ценой — тот, что выше честной, горит лаймом. Полосы шансов нет (повторяла проценты, а её
 * цвета спорили с графиком «Как менялись шансы»; владелец согласился).
 */
export function MatchHero({
  full,
  cells,
  books,
  tint,
  notes,
  line = null,
  story = null,
  children,
}: {
  full: MatchFull
  cells: BoardCell[] | null
  books: number
  /** чьи кэфы в ячейках и ссылка к нему (реклама); null — кэфы без ссылки (после начала матча) */
  line?: { name: string; href: string; live?: boolean } | null
  /** цвета клубов — мягкое свечение за командами, как в «Главных матчах» */
  tint?: { home: string; away: string } | null
  /** метки-факты над эмблемами (lib/hand-notes.ts) */
  notes?: HandNotes | null
  /** «Разбор за минуту» — под табло по центру */
  story?: React.ReactNode
  children?: React.ReactNode
}) {
  const m = full.match
  // проценты трёх исходов — целые и в сумме ровно 100
  const n = cells ? split100({ home: cells[0].p, draw: cells[1].p, away: cells[2].p }) : null
  const live = m.status === 'live' || m.status === 'suspended'
  const played = Boolean(m.score) && (live || m.status === 'finished')
  // сыгран (или отменён) — кэфы до матча только для истории: без «честная …» и без пояснения под табло (владелец: «не
  // слишком много мелкого текста?»)
  const over = !live && m.status !== 'scheduled'
  // матч начался — табло вдвое ниже (владелец: «а блок матча как, если честно?», согласился): под названиями — авторы
  // голов, оценка до матча — одной строкой, кэфы — компактной строкой, фактов над эмблемами нет (до матча помогают,
  // по ходу — фон)
  const started = m.status !== 'scheduled'
  const goals = started ? scorers(full.events, m.status === 'finished' ? (m.score ?? null) : null) : null
  // тусклее проигравший — только у сыгранного матча (как у Apple Sports): по ходу игры при 1:0 на 59-й «Хетафе» выглядел
  // уже проигравшим (владелец: «а блок матча как, если честно?», согласился)
  const lead =
    m.status === 'finished' && played && m.score!.home !== m.score!.away ? (m.score!.home > m.score!.away ? 'home' : 'away') : null
  // команда, как в «Главных матчах»: эмблема на матовом круге, название под ней, над кругом — метка-факт
  const team = (t: typeof m.home, k: 'home' | 'away') => (
    <div className={`flex min-w-0 flex-col items-center gap-3 text-center ${lead && lead !== k ? 'opacity-70' : ''}`}>
      <span className="relative grid h-[var(--disc)] w-[var(--disc)] place-items-center rounded-full bg-white/[0.08] ring-1 ring-white/15 [--disc:68px] sm:[--disc:104px]">
        {notes?.[k] && !started ? <HandNote text={notes[k]!} short={notes[k]!.length <= 12} /> : null}
        <TeamLogo name={t.name} src={t.logo} size="calc(var(--disc) * 0.6)" />
      </span>
      {/* звёздочка «в избранное» — рядом с названием, без подписи (подсказка — при наведении) */}
      {/* звёздочка висит справа от названия, само название — по центру под эмблемой */}
      <span className="relative max-w-full">
        <span className={`line-clamp-2 hyphens-auto break-words font-semibold leading-tight tracking-[-0.02em] sm:text-[26px] ${phoneSize(t.name)}`}>{t.name}</span>
        <FavStar id={t.id} name={t.name} logo={t.logo} compact className="absolute left-full top-1/2 ml-0.5 -translate-y-1/2 sm:ml-1" />
      </span>
      {goals?.[k].length ? (
        <ul className="-mt-1.5 space-y-0.5 text-[12.5px] leading-snug text-dim sm:text-[13.5px]">
          {goals[k].map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
  return (
    <section id="match-hero" className="card page-enter-2 relative overflow-hidden p-5 sm:p-7">
      {/* от xl градиент центральной панели — в цветах этих клубов, как у Spotify — цветом обложки */}
      <ShellTint id={m.id} ymd={ymdInTz(m.ts)} home={tint?.home} away={tint?.away} />
      {tint ? (
        <div
          aria-hidden
          className="hero-tint pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(60% 120% at 0% 40%, color-mix(in oklab, ${tint.home} 20%, transparent), transparent 70%), radial-gradient(60% 120% at 100% 40%, color-mix(in oklab, ${tint.away} 20%, transparent), transparent 70%)`,
          }}
        />
      ) : null}
      <div className="relative">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[13px] text-dim">
        <Link
          href={leagueHref(m.league)}
          className="inline-flex items-center gap-2 rounded-ctl border border-transparent bg-white/[0.07] px-2.5 py-1 font-semibold text-fg transition-colors hover:bg-white/[0.11]"
        >
          {/* точка — только «идёт»: лайм у нас значит «выгодно» */}
          {live ? <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-live" /> : null}
          {m.league.name}
        </Link>
        <span>
          {m.round ? `${m.round} · ` : ''}
          <span className="capitalize">{formatWeekdayLong(m.ts)}</span>, {formatDateLong(m.ts)}
        </span>
      </div>

      {/* табло по центру, как в «Главных матчах»: хозяева слева, гости справа, в середине время или счёт */}
      <div id="match-board" className={`${started ? 'mt-8 sm:mt-10' : 'mt-12 sm:mt-14'} grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-x-3 sm:gap-x-8 ${started ? 'items-start' : 'items-center'}`}>
        {team(m.home, 'home')}
        {/* после начала колонки команд — по верху (под названием разное число голов, эмблемы съезжали), счёт — на уровне эмблем */}
        <div id="match-score" className={`text-center ${started ? 'pt-3 sm:pt-5' : ''}`}>
          {played ? (
            <>
              <div className="num display-num whitespace-nowrap text-[44px] font-semibold leading-none tracking-[-0.03em] sm:text-[76px]">
                <Tick v={m.score!.home} />
                <span className="mx-1.5 text-mute sm:mx-3">:</span>
                <Tick v={m.score!.away} />
              </div>
              <div className={`mt-2 flex items-center justify-center gap-1.5 text-[13px] font-medium sm:text-[14px] ${live ? 'text-fg' : 'text-dim'}`}>
                {live ? <span className="h-1.5 w-1.5 rounded-full bg-live" /> : null}
                {live && m.elapsed && m.statusCode !== 4 ? `${m.elapsed}-я минута` : m.statusLabel}
              </div>
              {/* счёт первого тайма — только если после перерыва он уже другой: «1-й тайм 1:0» под «1:0» повторял счёт */}
              {m.scoreHT && m.score && (m.scoreHT.home !== m.score.home || m.scoreHT.away !== m.score.away) ? (
                <div className="mt-1 text-[12px] text-mute">
                  1-й тайм {m.scoreHT.home}:{m.scoreHT.away}
                </div>
              ) : null}
              {/* «Разбор за минуту» — под счётом и минутой (владелец: «а визуально блок матча как?» — внизу четыре строки
                  по центру разной ширины складывались в «ёлочку»); на телефоне колонка узкая — там кнопка под табло */}
              {story ? <div className="mt-4 hidden justify-center sm:flex">{story}</div> : null}
            </>
          ) : m.status !== 'scheduled' ? (
            <p className="text-[15px] font-semibold text-loss">{m.statusLabel}</p>
          ) : (
            <>
              <div className="text-[13px] text-dim">Начало</div>
              <div className="num display-num mt-1 text-[40px] font-semibold leading-none tracking-[-0.03em] sm:text-[68px]">{formatTime(m.ts)}</div>
              <div className="mt-2 text-[13px] text-dim">{SITE.tzLabel.toLowerCase()}</div>
            </>
          )}
        </div>
        {team(m.away, 'away')}
      </div>
      {story ? <div className={`mt-6 flex justify-center ${played ? 'sm:hidden' : ''}`}>{story}</div> : null}

      {cells && started ? (
        // начался — под тонкой чертой одна полоса во всю ширину: слева оценка до матча, справа кэфы (разнесены по краям,
        // а не стопкой по центру); не влезает в строку — кэфы переносятся под оценку
        // сетка по ширине самой карточки (container query): широкая — «До матча» и строка ячеек в одном ряду и по одной
        // линии, «Реклама · 18+» — под ячейками; узкая (1280 с панелями, телефон) — всё друг под другом. Выравнивание по
        // ячейкам, а не по середине правой части вместе с пометкой: иначе «До матча» стояло ниже кэфов (владелец: «сейчас как?»)
        <div className="@container mt-6 border-t border-white/10 pt-5">
          <div className="grid gap-x-6 gap-y-3 @3xl:grid-cols-[minmax(0,1fr)_auto] @3xl:items-center">
          <p className="text-[13px] text-dim">
            До матча: «{m.home.name}» {n?.home}% · ничья {n?.draw}% · «{m.away.name}» {n?.away}%
          </p>
          {cells.every((c) => c.odd) ? (
            <div id="match-odds" className="flex flex-wrap items-center gap-2 @3xl:justify-end">
              <span className="w-full text-[12px] leading-tight text-dim sm:mr-1 sm:w-auto">
                Кэфы <span className="font-semibold text-fg">{line?.name ?? 'до матча'}</span>
                {line?.live ? (
                  <span className="ml-1.5 inline-flex items-center gap-1 text-live">
                    <span className="h-1.5 w-1.5 rounded-full bg-live" />
                    сейчас
                  </span>
                ) : null}
              </span>
              {cells.map((c) => {
                const label = c.key === 'draw' ? 'Ничья' : `«${c.key === 'home' ? m.home.name : m.away.name}»`
                const body = (
                  <>
                    <span className="block max-w-[110px] truncate text-[11px] text-mute">{label}</span>
                    <span className="num block text-[17px] font-semibold leading-tight">{c.odd!.toFixed(2)}</span>
                  </>
                )
                return line ? (
                  <a
                    key={c.key}
                    href={line.href}
                    target="_blank"
                    rel={SPONSORED_REL}
                    title={`${c.key === 'draw' ? 'Ничья' : `Победа ${label}`}: ${c.odd!.toFixed(2)} в ${line.name}${line.live ? ' сейчас' : ''} · Реклама 18+`}
                    className="min-w-[84px] flex-1 rounded-tile bg-white/[0.06] px-3 py-1.5 transition-colors hover:bg-white/[0.12] sm:flex-none"
                  >
                    {body}
                  </a>
                ) : (
                  <div key={c.key} className="min-w-[84px] flex-1 rounded-tile bg-white/[0.04] px-3 py-1.5 sm:flex-none">
                    {body}
                  </div>
                )
              })}
            </div>
          ) : null}
          {/* «Кэфы PARI ● сейчас» уже сказано слева от ячеек — под ними только пометка рекламы */}
          {line?.live && cells.every((c) => c.odd) ? (
            <p className="-mt-1.5 text-[11.5px] text-mute @3xl:col-start-2 @3xl:text-right">Реклама · 18+</p>
          ) : null}
          </div>
        </div>
      ) : cells ? (
        <>
          {/* те же проценты на графике «Как менялись шансы» названы «оценка tag.bet» — одно имя */}
          <p className="mt-8 text-[13px] font-medium text-dim">{played ? 'Оценка tag.bet до матча' : 'Оценка tag.bet'}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
            {cells.map((c) => (
              <div key={c.key} className="min-w-0 rounded-tile bg-white/[0.04] px-2 pb-3 pt-3 text-center">
                <div className={`font-semibold leading-none tracking-[-0.03em] text-[26px] sm:text-[34px] ${c.key === 'draw' ? 'text-chalk' : 'text-fg'}`}>
                  {/* проценты трёх исходов в сумме — ровно 100 */}
                  {n?.[c.key]}
                  <span className="ml-0.5 text-[0.42em] tracking-normal">%</span>
                </div>
                <div className="mt-1.5 truncate text-[12px] text-dim">
                  <span className="sm:hidden">{c.key === 'home' ? 'хозяева' : c.key === 'away' ? 'гости' : 'ничья'}</span>
                  <span className="hidden sm:inline">{c.label}</span>
                </div>
              </div>
            ))}
          </div>
          {cells.some((c) => c.odd) ? (
            <div id="match-odds" className="mt-5 grid grid-cols-[auto_repeat(3,minmax(0,1fr))] items-center gap-2 sm:gap-3">
              {/* чьи кэфы — по имени (одна линия одного партнёра), ячейки — ссылки к нему */}
              <span className="pr-1 text-[12px] leading-tight text-dim sm:pr-3 sm:text-[13px]">
                Кэфы
                <br />
                <span className="font-semibold text-fg">{line?.name ?? (m.status === 'scheduled' ? 'букмекера' : 'до матча')}</span>
                {line?.live ? (
                  <>
                    <br />
                    <span className="inline-flex items-center gap-1 text-live">
                      <span className="h-1.5 w-1.5 rounded-full bg-live" />
                      сейчас
                    </span>
                  </>
                ) : null}
              </span>
              {cells.map((c) => {
                const body = (
                  <>
                    <div className="num text-[22px] font-bold leading-none tracking-[-0.02em] sm:text-[30px]">{c.odd ? c.odd.toFixed(2) : '—'}</div>
                    {/* по ходу матча честную цену не пишем: наша оценка — до матча, с кэфом при счёте 1:0 она не сравнима */}
                    {over ? null : line?.live ? (
                      <div className="mt-1.5 truncate text-[11px] text-mute">
                        <span className="sm:hidden">{c.key === 'home' ? 'хозяева' : c.key === 'away' ? 'гости' : 'ничья'}</span>
                        <span className="hidden sm:inline">{c.key === 'draw' ? 'ничья' : `победа ${c.key === 'home' ? m.home.name : m.away.name}`}</span>
                      </div>
                    ) : (
                      <div className={`mt-1.5 text-[11px] ${c.hot ? 'font-semibold text-acid-ink/70' : 'text-mute'}`}>
                        честная {c.fair.toFixed(2)}
                        {c.hot && c.odd ? <span className="hidden sm:inline"> · {signed(c.odd / c.fair - 1)}</span> : null}
                      </div>
                    )}
                  </>
                )
                const cls = `block rounded-tile border px-1 py-2.5 text-center transition-colors ${
                  c.hot ? 'border-acid bg-acid text-acid-ink hover:bg-acid/85' : 'border-transparent bg-white/[0.05] hover:bg-white/[0.1]'
                }`
                return line && c.odd ? (
                  <a
                    key={c.key}
                    href={line.href}
                    target="_blank"
                    rel={SPONSORED_REL}
                    className={cls}
                    title={`${c.label}: ${c.odd.toFixed(2)} в ${line.name}${line.live ? ' сейчас' : ''}${c.hot ? ' — выше честной цены' : ''} · Реклама 18+`}
                  >
                    {body}
                  </a>
                ) : (
                  <div key={c.key} className={cls.replace(/hover:\S+/g, '')}>
                    {body}
                  </div>
                )
              })}
            </div>
          ) : null}
          <p className={`mt-4 text-[12px] text-mute ${over ? 'hidden' : ''}`}>
            Оценка — по кэфам{books > 1 ? ` ${books} букмекеров` : ''} без их наценки и нашей модели.
            {line?.live ? ` Кэфы ${line.name} — по ходу матча, меняются каждую минуту.` : ' Лаймом — кэф выше честной цены.'}
            {line ? ' Реклама · 18+' : ''}
          </p>
        </>
      ) : null}

      {full.venue || full.referee ? (
        <p className="mt-2 text-[12px] text-mute">
          {full.venue ? `${full.venue.name}${full.venue.city ? `, ${full.venue.city}` : ''}` : ''}
          {full.venue && full.referee ? ' · ' : ''}
          {full.referee ? `судья ${full.referee}` : ''}
        </p>
      ) : null}
      {children}
      </div>
    </section>
  )
}
