import Link from 'next/link'
import { SITE } from '@/config/site'
import { SPONSORED_REL } from '@/lib/affiliate'
import { formatDateLong, formatTime, formatWeekdayLong } from '@/lib/format'
import { split100 } from '@/lib/verdict'
import type { MatchFull } from '@/lib/types'
import { TeamLogo } from '../TeamLogo'
import { Tick } from '../Live'
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
  line = null,
  story = null,
  back = null,
  pair = null,
  league = null,
  children,
}: {
  full: MatchFull
  cells: BoardCell[] | null
  books: number
  /** чьи кэфы в ячейках и ссылка к нему (реклама); null — кэфы без ссылки (после начала матча) */
  line?: { name: string; href: string; live?: boolean } | null
  /** «Разбор за минуту» — под табло по центру */
  story?: React.ReactNode
  /** «‹ Ла Лига» чипом в верхнем левом углу (`Breadcrumbs chip`) */
  back?: React.ReactNode
  /** «‹ ›» капсулой на компьютере (`NavPair`) — вместо чипа `back` */
  pair?: React.ReactNode
  /** турнир — на компьютере в строке с капсулой: «‹ › Ла Лига · 20-й тур · воскресенье, 4 октября» */
  league?: { href: string; label: string } | null
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
  // команда — как в Apple Sports: эмблема без подложки, под ней название, под названием авторы голов; «в избранное» —
  // звёздочкой у названия в «Форме команд» (владелец: «он все еще некрасивый и назвать его стильным и на уровне эппл ну
  // вообще нельзя» — звёздочки у эмблем висели сбоку, серый диск с буквами и Oswald в счёте читались плакатом)
  const team = (t: typeof m.home, k: 'home' | 'away') => (
    <div className={`flex min-w-0 flex-col items-center text-center transition-opacity ${lead && lead !== k ? 'opacity-55' : ''}`}>
      <span className="grid h-[var(--crest)] w-[var(--crest)] place-items-center [--crest:56px] sm:[--crest:88px]">
        <TeamLogo name={t.name} src={t.logo} size="var(--crest)" />
      </span>
      <span className={`mt-3 line-clamp-2 max-w-full hyphens-auto break-words font-semibold leading-tight tracking-[-0.02em] sm:mt-4 sm:text-[22px] ${phoneSize(t.name)}`}>
        {t.name}
      </span>
      {goals?.[k].length ? (
        <ul className="mt-1.5 space-y-0.5 text-[13px] leading-snug text-dim">
          {goals[k].map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
  // счёт и время — Onest с цифрами одной ширины, как SF у Apple (Oswald — узкий плакатный)
  const big = 'num whitespace-nowrap text-[44px] font-semibold leading-none tracking-[-0.045em] sm:text-[68px]'
  return (
    <section id="match-hero" className="card page-enter-2 relative overflow-hidden px-5 pb-6 pt-5 sm:px-8 sm:pb-8 sm:pt-6">
      {/* одна тихая строка по центру: турнир, тур, день; «‹ ›» — слева от неё на компьютере, на телефоне «назад» — полосой
          над блоком (`MatchBar`) */}
      <div className="relative flex min-h-8 items-center justify-center">
        {pair ? <div className="absolute left-0 top-1/2 -translate-y-1/2 max-lg:hidden">{pair}</div> : null}
        {back ? <div className="absolute left-0 top-1/2 -translate-y-1/2 lg:hidden">{back}</div> : null}
        <p className="min-w-0 text-center text-[13px] text-dim sm:text-[14px] lg:px-20">
          {league ? (
            <span className="max-lg:hidden">
              <Link href={league.href} className="font-medium text-fg/90 transition-colors hover:text-fg">
                {league.label}
              </Link>
              {' · '}
            </span>
          ) : null}
          <span className={`inline-block first-letter:uppercase ${league ? 'lg:first-letter:normal-case' : ''}`}>
            {/* на телефоне без года — иначе строка переносилась («4 / октября 2026») */}
            {[m.round, `${formatWeekdayLong(m.ts)}, `].filter(Boolean).join(' · ')}
            <span className="sm:hidden">{formatDateLong(m.ts).replace(/\s\d{4}$/, '')}</span>
            <span className="max-sm:hidden">{formatDateLong(m.ts)}</span>
          </span>
        </p>
      </div>

      {/* хозяева слева, гости справа, в середине счёт или время — на уровне эмблем */}
      <div id="match-board" className="mt-6 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-x-3 sm:mt-8 sm:gap-x-10">
        {team(m.home, 'home')}
        <div id="match-score" className="flex min-h-[56px] flex-col items-center justify-center text-center sm:min-h-[88px]">
          {played ? (
            <>
              <div className={big}>
                <Tick v={m.score!.home} />
                <span className="mx-1 text-white/25 sm:mx-2">:</span>
                <Tick v={m.score!.away} />
              </div>
              <div className={`mt-2 text-[13px] font-semibold sm:text-[14px] ${live ? 'text-live' : 'text-dim'}`}>
                {live && m.elapsed && m.statusCode !== 4 ? `${m.elapsed}′` : m.statusLabel}
              </div>
              {/* счёт первого тайма — только если после перерыва он уже другой; на телефоне колонка узкая — без него */}
              {m.scoreHT && m.score && (m.scoreHT.home !== m.score.home || m.scoreHT.away !== m.score.away) ? (
                <div className="mt-1 text-[13px] text-mute max-sm:hidden">
                  1-й тайм {m.scoreHT.home}:{m.scoreHT.away}
                </div>
              ) : null}
            </>
          ) : m.status !== 'scheduled' ? (
            <p className="text-[15px] font-semibold text-loss">{m.statusLabel}</p>
          ) : (
            <>
              <div className={big}>{formatTime(m.ts)}</div>
              <div className="mt-2 text-[13px] text-dim sm:text-[14px]">{SITE.tzLabel.toLowerCase()}</div>
            </>
          )}
        </div>
        {team(m.away, 'away')}
      </div>
      {story ? <div className="mt-6 flex justify-center">{story}</div> : null}

      {cells && started ? (
        // начался — под тонкой чертой одна полоса во всю ширину: слева оценка до матча, справа кэфы (разнесены по краям,
        // а не стопкой по центру); не влезает в строку — кэфы переносятся под оценку
        // сетка по ширине самой карточки (container query): широкая — «До матча» и строка ячеек в одном ряду и по одной
        // линии, «Реклама · 18+» — под ячейками; узкая (1280 с панелями, телефон) — всё друг под другом. Выравнивание по
        // ячейкам, а не по середине правой части вместе с пометкой: иначе «До матча» стояло ниже кэфов (владелец: «сейчас как?»)
        // на телефоне — без черты, «До матча» строкой по центру сразу под «Разбором за минуту»
        <div className="mt-5">
          <div className="flex flex-col items-center gap-3 text-center">
          {/* перенос — только между исходами, «·» — в конце строки: «Реал» и «Мадрид», «Ривер Плейт» и «61%» расходились */}
          <p className="text-[13px] text-mute">
            До матча: <span className="whitespace-nowrap">«{m.home.name}» {n?.home}% ·</span> <span className="whitespace-nowrap">ничья {n?.draw}% ·</span>{' '}
            <span className="whitespace-nowrap">«{m.away.name}» {n?.away}%</span>
          </p>
          {/* у сыгранного ячеек нет: выглядели кнопками ставки, но никуда не вели, а кэфы до матча — те же проценты слева
              другими цифрами (7.05 · 4.70 · 1.45 ≈ 14% · 20% · 66%; владелец согласился) */}
          {cells.every((c) => c.odd) && !over ? (
            <div id="match-odds" className="flex flex-wrap items-center justify-center gap-2">
              <span className="w-full text-[13px] leading-tight text-dim sm:mr-1 sm:w-auto">
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
                    <span className="block truncate text-[13px] text-mute sm:max-w-[110px]">{label}</span>
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
                    className="min-w-[84px] flex-1 rounded-tile bg-white/[0.06] px-2.5 py-1.5 transition-colors hover:bg-white/[0.12] sm:flex-none sm:px-3"
                  >
                    {body}
                  </a>
                ) : (
                  <div key={c.key} className="min-w-[84px] flex-1 rounded-tile bg-white/[0.04] px-2.5 py-1.5 sm:flex-none sm:px-3">
                    {body}
                  </div>
                )
              })}
            </div>
          ) : null}
          {/* «Кэфы PARI ● сейчас» уже сказано слева от ячеек — под ними только пометка рекламы */}
          {line?.live && cells.every((c) => c.odd) ? (
            <p className="-mt-1.5 text-[13px] text-mute">Реклама · 18+</p>
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

      {full.venue || full.referee ? (
        <p className="mt-3 text-center text-[13px] text-mute">
          {full.venue ? `${full.venue.name}${full.venue.city ? `, ${full.venue.city}` : ''}` : ''}
          {full.venue && full.referee ? ' · ' : ''}
          {full.referee ? `судья ${full.referee}` : ''}
        </p>
      ) : null}
      {children}
    </section>
  )
}
