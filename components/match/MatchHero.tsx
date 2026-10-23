import Link from 'next/link'
import { SITE } from '@/config/site'
import { SPONSORED_REL } from '@/lib/affiliate'
import { formatDateLong, formatTime, formatWeekdayLong, plural } from '@/lib/format'
import { split100 } from '@/lib/verdict'
import type { MatchFull } from '@/lib/types'
import { TeamLogo } from '../TeamLogo'
import { Tick } from '../Live'
import { scorers } from './EventsBlock'
import { ResBadge } from './FormStrip'
import { Scorers } from './Scorers'
import { Flag } from '../Flag'
import type { Res } from '@/lib/stats'
import { appNow } from '@/lib/format'
import { untilText } from '../shell/StateLine'

/** Ячейка табло: шанс исхода, лучший коэффициент и честная цена; hot — платят больше честного. */
export type BoardCell = {
  key: 'home' | 'draw' | 'away'
  label: string
  p: number
  odd: number | null
  fair: number
  hot: boolean
}

const signed = (ev: number) => `${ev >= 0 ? '+' : '−'}${Math.abs(ev * 100).toFixed(1).replace('.', ',')}%`

/** Строка турнира над табло: флаг, турнир ссылкой и тур, справа — минута пилюлей или «итог». */
export function MatchHead({ full, league = null }: { full: MatchFull; league?: { href: string; label: string } | null }) {
  const m = full.match
  const live = m.status === 'live' || m.status === 'suspended'
  const played = Boolean(m.score) && (live || m.status === 'finished')
  const started = m.status !== 'scheduled'
  return (
    <>
      <p className="flex min-w-0 flex-1 items-center gap-2 text-[13px] text-dim sm:text-[14px]">
        <Flag league={m.league} className="!h-[18px] !w-[18px]" />
        <span className="min-w-0 truncate">
          {league ? (
            <Link href={league.href} className="font-medium text-fg/90 transition-colors hover:text-fg">
              {league.label}
            </Link>
          ) : null}
          {m.round ? `${league ? ' · ' : ''}${m.round}` : null}
        </span>
      </p>
      {live ? (
        <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full bg-live/15 px-2.5 text-[13px] font-bold text-live">
          <span className="h-1.5 w-1.5 rounded-full bg-live" />
          {m.elapsed && m.statusCode !== 4 ? `${m.elapsed}′` : m.statusLabel}
        </span>
      ) : started ? (
        <span className={`shrink-0 text-[13px] font-semibold ${played ? 'text-dim' : 'text-loss'}`}>{m.statusLabel}</span>
      ) : null}
    </>
  )
}

/**
 * Табло матча (как на стадионе): команды, время или счёт, «Разбор за минуту»; ниже — оценка tag.bet тремя процентами
 * и кэфы партнёра с честной ценой — тот, что выше честной, горит лаймом. Полосы шансов нет (повторяла проценты, а её
 * цвета спорили с графиком «Как менялись шансы»; владелец согласился).
 */
export function MatchHero({
  full,
  cells,
  books,
  line = null,
  story = null,
  back = null,
  league = null,
  ctx = null,
  attendance = null,
  children,
}: {
  full: MatchFull
  cells: BoardCell[] | null
  books: number
  /** чьи кэфы в ячейках и ссылка к нему (реклама); null — кэфы без ссылки (после начала матча) */
  line?: { name: string; href: string; live?: boolean } | null
  /** зрителей на стадионе (`/Ls/GameInfo`) — в строке под табло после начала */
  attendance?: number | null
  /** «Разбор за минуту» — под табло по центру */
  story?: React.ReactNode
  /** «‹ Ла Лига» чипом в верхнем левом углу (`Breadcrumbs chip`) */
  back?: React.ReactNode
  /** турнир — ссылкой в строке над табло */
  league?: { href: string; label: string } | null
  /** место в таблице (с 3-го тура) и форма — последние 5, свежий справа; под названием команды */
  ctx?: Record<'home' | 'away', { rank: number | null; form: Res[] }> | null
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
  // табло строками, как в Apple Sports (владелец выбрал вариант «В» из трёх картинок: «сам верхний блок мне не очень
  // нравится», заголовок раздела под табло читался подписью к нему): у каждой команды своя строка — эмблема, название,
  // под ним место и форма, ниже авторы голов, справа крупно счёт; до начала справа от обеих строк — время. Было: две
  // колонки по центру со столбиками мелочи разной длины (место, точки, авторы голов), счёт посередине, кромка цветов клубов
  const row = (t: typeof m.home, k: 'home' | 'away') => {
    const dim = lead && lead !== k
    return (
      <div className="flex min-h-16 items-center gap-3 py-3 sm:gap-4">
        <span className="grid h-[var(--crest)] w-[var(--crest)] shrink-0 place-items-center [--crest:44px] sm:[--crest:56px]">
          <TeamLogo name={t.name} src={t.logo} size="var(--crest)" />
        </span>
        <div className="min-w-0 flex-1">
          <div className={`line-clamp-2 break-words text-[18px] font-bold leading-tight tracking-[-0.02em] sm:text-[22px] ${dim ? 'text-dim' : ''}`}>
            {t.name}
          </div>
          {ctx?.[k].rank || ctx?.[k].form.length ? (
            <div className="mt-1 flex items-center gap-2 text-[13px] text-dim">
              {/* место — колонкой одной ширины у обеих команд: значки формы стоят ровно друг под другом
                (владелец: «индикаторы побед и поражений не ровно друг над другом стоят» — «6-е» уже «20-е») */}
              {ctx.home.rank || ctx.away.rank ? <span className="num w-[5.6em] shrink-0 whitespace-nowrap">{ctx[k].rank ? `${ctx[k].rank}-е место` : ''}</span> : null}
              {/* форма — последние 5 буквами В/Н/П, свежий справа (владелец: «а про победы поражения понятно?» — кружочки без
                подписи не читались) */}
              {ctx[k].form.length ? (
                <span className="flex gap-1" title={`Последние ${ctx[k].form.length} матчей, свежий справа`}>
                  {ctx[k].form.map((r, i) => (
                    <ResBadge key={i} r={r} size="xs" />
                  ))}
                </span>
              ) : null}
            </div>
          ) : null}
          {goals?.[k].length ? <Scorers items={goals[k]} /> : null}
        </div>
        {played ? (
          // счёт — Onest с цифрами одной ширины, как SF у Apple
          <span className={`num shrink-0 text-[40px] font-semibold leading-none tracking-[-0.04em] sm:text-[52px] ${dim ? 'text-dim' : ''}`}>
            <Tick v={m.score![k]} />
          </span>
        ) : null}
      </div>
    )
  }
  return (
    <>
    <section id="match-hero" className="card page-enter-2 relative overflow-hidden px-5 pb-2 pt-4 sm:px-7 sm:pb-3 sm:pt-5 lg:mt-2">
      {/* сверху строкой: флаг, турнир и тур, справа — минута пилюлей или «итог»; «‹» здесь — только ниже lg, на компьютере
          она в закреплённой плашке над табло (`MatchBar`) вместе с командами и счётом */}
      <div className="flex min-h-8 items-center gap-3">
        {back ? <div className="shrink-0 lg:hidden">{back}</div> : null}
        <MatchHead full={full} league={league} />
      </div>

      <div id="match-board" className="mt-1 flex items-center gap-4">
        {/* #match-score — по первой строке (хозяева) мини-табло в шапке сменяет надпись tag.bet */}
        <div id="match-score" className="min-w-0 flex-1 divide-y divide-edge">
          {row(m.home, 'home')}
          {row(m.away, 'away')}
        </div>
        {!started ? (
          // до начала — время справа от обеих строк, под ним «мск» и отсчёт (меньше суток)
          <div className="shrink-0 self-stretch border-l border-edge py-3 pl-4 text-right sm:pl-6">
            <div className="flex h-full flex-col justify-center">
              <div className="num text-[34px] font-semibold leading-none tracking-[-0.04em] sm:text-[44px]">{formatTime(m.ts)}</div>
              <div className="mt-1.5 text-[13px] text-dim">{SITE.tzLabel.toLowerCase()}</div>
              {m.ts - appNow() > 0 && m.ts - appNow() < 86_400_000 ? (
                <div className="text-[13px] text-fg/80">{untilText(Math.round((m.ts - appNow()) / 60_000))}</div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
      {story ? <div className="mt-6 flex justify-center">{story}</div> : null}

      {cells && !started ? (
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
                <div className="mt-1.5 truncate text-[13px] text-dim">
                  <span className="sm:hidden">{c.key === 'home' ? 'хозяева' : c.key === 'away' ? 'гости' : 'ничья'}</span>
                  <span className="hidden sm:inline">{c.label}</span>
                </div>
              </div>
            ))}
          </div>
          {cells.some((c) => c.odd) ? (
            <div id="match-odds" className="mt-5 grid grid-cols-[auto_repeat(3,minmax(0,1fr))] items-center gap-2 sm:gap-3">
              {/* чьи кэфы — по имени (одна линия одного партнёра), ячейки — ссылки к нему */}
              <span className="pr-1 text-[13px] leading-tight text-dim sm:pr-3 sm:text-[13px]">
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
                      <div className="mt-1.5 truncate text-[13px] text-mute">
                        <span className="sm:hidden">{c.key === 'home' ? 'хозяева' : c.key === 'away' ? 'гости' : 'ничья'}</span>
                        <span className="hidden sm:inline">{c.key === 'draw' ? 'ничья' : `победа ${c.key === 'home' ? m.home.name : m.away.name}`}</span>
                      </div>
                    ) : (
                      <div className={`mt-1.5 text-[13px] ${c.hot ? 'font-semibold text-acid-ink/70' : 'text-mute'}`}>
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
          <p className={`mt-4 text-[13px] text-mute ${over ? 'hidden' : ''}`}>
            Оценка — по кэфам{books > 1 ? ` ${books} букмекеров` : ''} без их наценки и нашей модели.
            {line?.live ? ` Кэфы ${line.name} — по ходу матча, меняются каждую минуту.` : ' Лаймом — кэф выше честной цены.'}
            {line ? ' Реклама · 18+' : ''}
          </p>
        </>
      ) : null}

      {children}
    </section>
      {/* день, время начала и стадион с городом — тихой строкой (счёта перерыва нет: владелец — «зачем писать счет в перерыве если матч закончен?») под блоком, на линии текста
        карточки, как пояснения под другими блоками: в карточке только табло (владелец: «не нравится что ты пишешь в блоке
        верхнем снизу текст этажами … может все под блок выносить?» — «да») */}
    <p className="mt-2.5 px-5 text-[13px] text-mute first-letter:uppercase sm:px-7">
      {[
        // время начала — только после начала: до него оно крупно на табло
        `${formatWeekdayLong(m.ts)}, ${formatDateLong(m.ts).replace(/\s\d{4}$/, '')}${started ? `, ${formatTime(m.ts)} мск` : ''}`,
        full.venue ? (full.venue.city && !full.venue.name.includes(full.venue.city) ? `${full.venue.name}, ${full.venue.city}` : full.venue.name) : null,
        started && attendance ? `${attendance.toLocaleString('ru-RU')}\u00a0${plural(attendance, ['зритель', 'зрителя', 'зрителей'])}` : null,
      ]
        .filter(Boolean)
        .join(' · ')}
    </p>
    </>
  )
}
