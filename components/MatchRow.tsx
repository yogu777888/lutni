import Link from 'next/link'
import type { MatchSummary } from '@/lib/data'
import { goHref, SPONSORED_REL } from '@/lib/affiliate'
import { formatOdd, formatTime } from '@/lib/format'
import type { X12Line } from '@/lib/lines'
import { matchHref } from '@/lib/links'
import type { TagHit } from '@/lib/tags'
import type { Match } from '@/lib/types'
import { Tick } from './Live'
import { TeamLogo } from './TeamLogo'

/**
 * Колонки строки матча — одни и те же у каждой строки, в любом состоянии (владелец: «время везде по-разному, кэфы не
 * везде есть, счёт не везде есть»): время · матч · счёт · кэфы. На телефоне — время · команды в две строки · счёт, кэфы ниже.
 */
// на телефоне колонка времени 44px (было 52 + зазор 16 — под временем пустовала треть строки; владелец: «а по блокам на главной что скажешь?»)
export const ROW_COLS = 'grid-cols-[2.75rem_minmax(0,1fr)_auto] sm:grid-cols-[3.75rem_minmax(0,1fr)_11.25rem]'
const ROW_COLS_NO_ODDS = 'grid-cols-[2.75rem_minmax(0,1fr)_auto] sm:grid-cols-[3.75rem_minmax(0,1fr)_auto]'

const isLive = (m: Match) => m.status === 'live' || m.status === 'suspended'

/** Время — одной строкой одного размера: начало / минута красным / у сыгранных начало серым. */
export function StatusCell({ m }: { m: Match }) {
  // Oswald, как счёт справа: цифры табло — время слева, счёт справа; кэфы — обычным шрифтом
  // у Oswald цифры сидят ниже середины строки — поднимаем на 2px, чтобы время стояло вровень с названиями
  const base = 'num display-num relative -top-0.5 block whitespace-nowrap text-[18px] leading-none'
  if (isLive(m))
    return (
      // только красная минута, без точки перед ней: точка повторяла минуту, и шесть идущих матчей давали двенадцать
      // красных пятен (владелец согласился); точка «идёт» — одна, у заголовка «Сейчас идут»
      <span className={`${base} text-live`} title="Идёт">
        {m.statusCode === 4 ? 'пер.' : m.elapsed ? `${m.elapsed}′` : 'LIVE'}
      </span>
    )
  // у сыгранных — время начала серым: пустая колонка выглядела как «не загрузилось» (владелец согласился)
  if (m.status === 'finished')
    return (
      <span className={`${base} text-mute`} title="Матч сыгран">
        {formatTime(m.ts)}
        <span className="sr-only"> · итог</span>
      </span>
    )
  if (m.status === 'postponed' || m.status === 'cancelled') return <span className="block text-[12px] font-medium leading-tight text-loss">{m.statusLabel}</span>
  return <span className={`${base} text-fg`}>{formatTime(m.ts)}</span>
}

/**
 * Кэфы 1X2 — только у матчей, которые ещё не начались. Есть линия легального партнёра (`line`) — ячейки-ссылки к нему
 * (`goHref(…, 'list-odds')`, rel=sponsored; пометка «Реклама» — в шапке блока): выглядят кнопками и ведут к ставке
 * (раньше клик по «кнопке» открывал сторис — владелец согласился сделать переход). Линии партнёра нет — простые числа
 * без плашек, не притворяются кнопками. Выгодный — лаймом.
 */
function Odds({ m, hotKey, line }: { m: Match; hotKey: string | null; line: X12Line | null }) {
  const x = m.odds?.x12
  return (
    <span className="relative z-10 grid grid-cols-3 gap-1.5">
      {(['home', 'draw', 'away'] as const).map((k) => {
        const q = x?.[k]
        const hot = hotKey === k
        const what = k === 'draw' ? 'Ничья' : `Победа «${m[k].name}»`
        if (line) {
          return (
            <a
              key={k}
              href={goHref(line.slug, 'list-odds', m.id)}
              target="_blank"
              rel={SPONSORED_REL}
              title={`${what}: ${formatOdd(line[k])} в ${line.bookmaker}${hot ? ' — выгодно: кэф выше честной цены' : ''} · Реклама 18+`}
              className={`num rounded-ctl py-1.5 text-center text-[15px] font-semibold transition-colors ${
                hot ? 'bg-acid text-acid-ink hover:bg-acid/85' : 'bg-white/[0.06] text-fg hover:bg-white/[0.14]'
              }`}
            >
              {formatOdd(line[k])}
            </a>
          )
        }
        const dropped = q?.opening && q.opening / q.value >= 1.07
        return (
          <span
            key={k}
            className={`num py-1.5 text-center text-[15px] font-semibold ${hot ? 'text-good' : 'text-fg/70'}`}
            title={`${what}${q?.opening ? ` · открытие ${q.opening.toFixed(2)}` : ''}`}
          >
            {q ? formatOdd(q.value) : '—'}
            {dropped ? <span className="ml-0.5 text-[9px] text-hot">▼</span> : null}
          </span>
        )
      })}
    </span>
  )
}

/** Счёт — у начавшихся на одном месте во всех строках; до начала место пустое (владелец: «а – : – у не начавшихся убрать?»). */
function Score({ m, big = false }: { m: Match; big?: boolean }) {
  // в строке списка — Oswald, как крупный счёт в «Матче дня» (узкий — поэтому 24px, по высоте как прежние 20px Onest)
  const cls = `num whitespace-nowrap text-center ${big ? 'display-num text-[24px] leading-none' : 'text-[16px] font-bold'}`
  if (!m.score || m.status === 'scheduled') return null
  return (
    // счёт идущего — белый, как у Apple Sports: красные только минута и точка (шесть красных счетов подряд «гасили» сигнал)
    <span className={`${cls} text-fg`}>
      <Tick v={m.score.home} />
      <span className={`text-mute ${big ? 'mx-1.5' : 'mx-1'}`}>:</span>
      <Tick v={m.score.away} />
    </span>
  )
}

export function MatchRow({
  m,
  summary,
  showLeague = false,
  compact = false,
  noOdds = false,
  line = null,
}: {
  m: Match
  tags: TagHit[]
  summary?: MatchSummary | null
  /** Подпись турнира — для смешанных списков (live, «другие матчи»). */
  showLeague?: boolean
  /** Узкая боковая колонка: время, команды, счёт. */
  compact?: boolean
  /** В блоке ни у кого нет линии: без кэфов. */
  noOdds?: boolean
  /** линия легального партнёра: кэфы — ссылки к нему */
  line?: X12Line | null
}) {
  const live = isLive(m)
  const played = Boolean(m.score) && (live || m.status === 'finished')
  const homeWon = m.status === 'finished' && m.score && m.score.home > m.score.away
  const awayWon = m.status === 'finished' && m.score && m.score.away > m.score.home
  const pick = m.status === 'scheduled' ? summary?.pick : null
  // лайм — только если выгоден кэф именно той линии, что в строке: у PARI — его выгодная ставка (`summary.pari`, та же, что
  // в «Выгодно сегодня» справа), у другого партнёра — выгодная ставка, если она у него
  const x12 = (k?: string | null) => (k && ['home', 'draw', 'away'].includes(k) ? k : null)
  const hotKey = !line
    ? pick?.kind === 'value' ? x12(pick.key) : null
    : line.slug === 'pari'
      ? m.status === 'scheduled' ? x12(summary?.pari?.key) : null
      : pick?.kind === 'value' && pick.partnerSlug === line.slug ? x12(pick.key) : null
  // эмблема перед названием — матч узнаётся глазами раньше, чем прочитан
  const name = (t: Match['home'], lost: boolean) => (
    <span className={`flex min-w-0 items-center gap-2 ${lost ? 'text-fg/55' : ''}`}>
      <span className={`shrink-0 ${lost ? 'opacity-60' : ''}`}>
        <TeamLogo name={t.name} src={t.logo} size={22} />
      </span>
      <span className="truncate">{t.name}</span>
    </span>
  )

  if (compact) {
    return (
      // справа — шеврон, как у строк списка в iOS: видно, что строка ведёт на страницу матча (владелец: «в блоке другие
      // матчи у матчей может справа сделать типа кнопочку стрелочку?»)
      <div data-mid={m.id} className="group relative grid grid-cols-[3.25rem_minmax(0,1fr)_auto_auto] items-center gap-x-3 px-4 py-3 sm:px-5 transition-colors hover:bg-white/[0.02]">
        <StatusCell m={m} />
        {/* эмблемы и крупный счёт — как в строках главной (владелец: «как тебе нижний блок где другие матчи?» — «да») */}
        <Link href={matchHref(m)} prefetch={false} className="flex min-w-0 flex-col gap-1 text-[16px] font-semibold after:absolute after:inset-0 after:content-['']">
          {name(m.home, false)}
          {name(m.away, false)}
          {showLeague ? <span className="block truncate text-[13px] text-mute">{m.league.name}</span> : null}
        </Link>
        {played ? <Score m={m} big /> : <span />}
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-mute transition-colors group-hover:text-fg" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9.5 6l6 6-6 6" />
        </svg>
      </div>
    )
  }

  // Каждая строка устроена одинаково: время · матч · счёт · кэфы (владелец: «криво — время везде по-разному, кэфы
  // не везде есть, счёт не везде есть»). Выгодный кэф — только лаймовой ячейкой, без подписи (объяснение — в подсказке).
  return (
    <div
      data-mid={m.id}
      className={`relative grid items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:gap-x-4 sm:gap-y-2.5 sm:py-2.5 transition-colors hover:bg-white/[0.02] sm:px-5 ${noOdds ? ROW_COLS_NO_ODDS : ROW_COLS}`}
    >
      <div className="self-start pt-0.5 sm:self-center sm:pt-0">
        <StatusCell m={m} />
      </div>

      <div className="min-w-0">
        {/* клик по строке — страница матча, не сторис (владелец: «при нажатии на матчи из центральной колонки
            переходило на матч а не на историю»); сторис — с колец в боковых панелях */}
        <Link
          href={matchHref(m)}
          prefetch={false}
          // на телефоне команды в две строки — справа счёт, иначе названия обрезаются
          className="flex min-w-0 flex-col items-start gap-0.5 text-[15px] font-semibold after:absolute after:inset-0 after:content-[''] sm:flex-row sm:items-center sm:gap-0 sm:text-[16px]"
        >
          {name(m.home, Boolean(awayWon))}
          <span className="mx-1.5 hidden shrink-0 font-normal text-mute sm:inline">—</span>
          {name(m.away, Boolean(homeWon))}
        </Link>
        {showLeague ? <div className="mt-1 truncate text-[12.5px] text-mute">{m.league.name}</div> : null}
      </div>

      {/* справа — одно из двух: до начала кэфы, у начавшихся — счёт по центру той же области (владелец: «давай» — счёт
          висел посередине строки, правый край был рваным); высота — как у ячеек кэфов, строки одной высоты */}
      {m.status === 'scheduled' && !noOdds ? (
        <>
          <span className="sm:hidden" />
          {/* на телефоне кэфы — во всю ширину строки, от левого края под временем: ячейки крупнее, слева нет пустого «кармана» */}
          <div className="col-span-3 col-start-1 sm:col-span-1 sm:col-start-auto">
            <Odds m={m} hotKey={hotKey} line={line} />
          </div>
        </>
      ) : (
        <div className="flex items-center justify-end sm:h-[34px] sm:justify-center">
          <Score m={m} big />
        </div>
      )}
    </div>
  )
}
