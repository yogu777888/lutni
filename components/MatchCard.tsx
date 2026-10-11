import { formatTime } from '@/lib/format'
import type { Match } from '@/lib/types'
import { Tick } from './Live'
import { TeamLogo } from './TeamLogo'

const live = (m: Match) => m.status === 'live' || m.status === 'suspended'

/**
 * Содержимое карточки матча на полке (общая для «Скоро начнутся» и полок историй): «обложка», как у альбома в
 * Spotify, — эмблемы крупно, между ними время, счёт с минутой (идёт) или счёт и «итог»; под ней матч и строка
 * `sub` (турнир или повод, по которому матч попал на полку). Обёртку-ссылку и класс `SHELF_CARD` даёт полка.
 */
export function MatchCardBody({
  m,
  sub,
  badge,
}: {
  m: Match
  sub: string
  /** главная цифра истории в углу обложки («−17%», «62%»); hot — янтарём (кэф упал) */
  badge?: { text: string; hot?: boolean } | null
}) {
  const played = Boolean(m.score) && (live(m) || m.status === 'finished')
  return (
    <>
      <span className={`relative grid h-[132px] grid-cols-[1fr_auto_1fr] items-center overflow-hidden rounded-tile bg-panel-3 px-3`}>
        {badge ? (
          <span className={`num absolute left-2 top-2 rounded-ctl px-2 py-0.5 text-[12.5px] font-semibold ${badge.hot ? 'bg-hot/[0.14] text-hot' : 'bg-white/[0.08] text-fg'}`}>
            {badge.text}
          </span>
        ) : null}
        {[m.home, m.away].map((t, i) => (
          <span key={t.id} className={`relative grid place-items-center transition-transform duration-300 group-hover:scale-105 ${i ? 'order-3' : ''}`}>
            {/* эмблема на матовом светлом круге, как в табло: тёмные эмблемы («Мец») не сливаются с графитом */}
            <span className="grid h-[76px] w-[76px] place-items-center rounded-full bg-white/[0.14] ring-1 ring-white/15">
              <TeamLogo name={t.name} src={t.logo} size={50} />
            </span>
          </span>
        ))}
        <span className="relative order-2 flex flex-col items-center gap-1.5">
          {played ? (
            <>
              <span className="num display-num whitespace-nowrap text-[28px] leading-none text-white drop-shadow-[0_1px_2px_rgb(0_0_0/0.5)]">
                <Tick v={m.score!.home} />
                <span className="mx-1 text-mute">:</span>
                <Tick v={m.score!.away} />
              </span>
              <span className={`text-[12px] leading-none ${live(m) ? 'text-live' : 'text-mute'}`}>
                {live(m) ? (m.statusCode === 4 ? 'перерыв' : m.elapsed ? `${m.elapsed}′` : 'идёт') : 'итог'}
              </span>
            </>
          ) : (
            <span className="num display-num text-[28px] leading-none">{formatTime(m.ts)}</span>
          )}
        </span>
      </span>
      <span className="relative min-w-0 px-2 pb-1">
        <span className="block truncate text-[16px] font-semibold">
          {m.home.name} <span className="font-normal text-mute">—</span> {m.away.name}
        </span>
        <span className="mt-0.5 block truncate text-[13px] text-dim first-letter:uppercase">{sub}</span>
      </span>
    </>
  )
}

/** Эмблема на матовом светлом круге (как на обложке): тёмные эмблемы не сливаются с графитом. */
function Disc({ t, d, logo, className = '' }: { t: Match['home']; d?: number; logo: number; className?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-full bg-white/[0.14] ring-1 ring-white/15 ${className}`} style={d ? { width: d, height: d } : undefined}>
      <TeamLogo name={t.name} src={t.logo} size={logo} />
    </span>
  )
}

/** Две эмблемы внахлёст (компактные карточки): диски с кольцом цвета карточки, чтобы край второй читался. */
function Pair({ m, d, logo }: { m: Match; d: number; logo: number }) {
  return (
    <span className="flex shrink-0 -space-x-3">
      {[m.home, m.away].map((t) => (
        <span key={t.id} className="grid place-items-center rounded-full bg-panel-3 ring-2 ring-panel-2" style={{ width: d, height: d }}>
          <TeamLogo name={t.name} src={t.logo} size={logo} />
        </span>
      ))}
    </span>
  )
}

/**
 * «В игре» — табло, как в Apple Sports: две строки команд (эмблема, название, счёт крупно), красная минута и полоска
 * хода матча (минута из 90). Проигрывающий — тусклее.
 */
export function LiveCardBody({ m }: { m: Match }) {
  const s = m.score
  const min = m.statusCode === 4 ? 'перерыв' : m.elapsed ? `${m.elapsed}′` : 'идёт'
  const pct = m.statusCode === 4 ? 50 : Math.min(100, ((m.elapsed ?? 0) / 90) * 100)
  return (
    <>
      <span className="flex items-center gap-2 text-[13px] font-semibold text-live">
        <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-live" />
        LIVE · {min}
      </span>
      <span className="mt-3 flex flex-col gap-2.5">
        {[m.home, m.away].map((t, i) => {
          const g = s ? (i ? s.away : s.home) : null
          const o = s ? (i ? s.home : s.away) : null
          const behind = g != null && o != null && g < o
          return (
            <span key={t.id} className={`flex items-center gap-3 ${behind ? 'opacity-60' : ''}`}>
              <Disc t={t} d={40} logo={26} />
              <span className="min-w-0 flex-1 truncate text-[16px] font-semibold">{t.name}</span>
              <span className="num display-num text-[30px] leading-none text-white">{g == null ? '–' : <Tick v={g} />}</span>
            </span>
          )
        })}
      </span>
      <span aria-hidden className="mt-4 block h-1 overflow-hidden rounded-full bg-white/[0.08]">
        <span className="block h-full rounded-full bg-live" style={{ width: `${pct}%` }} />
      </span>
      <span className="mt-2.5 block truncate text-[13px] text-dim">{m.league.name}</span>
    </>
  )
}

/**
 * «Топ дня» — крупный плакат: эмблемы 104px и названия под ними, между ними время или счёт крупно; под обложкой —
 * турнир. Карточка шире обычной — полка главных матчей дня выделяется среди остальных.
 */
export function PosterCardBody({ m }: { m: Match }) {
  const played = Boolean(m.score) && (live(m) || m.status === 'finished')
  return (
    <>
      <span className="relative grid grid-cols-[1fr_auto_1fr] items-start gap-2 overflow-hidden rounded-tile bg-panel-3 px-3 pb-5 pt-7">
        {[m.home, m.away].map((t, i) => (
          <span key={t.id} className={`flex min-w-0 flex-col items-center gap-3 ${i ? 'order-3' : ''}`}>
            <Disc t={t} logo={60} className="h-[76px] w-[76px] transition-transform duration-300 group-hover:scale-105 sm:h-[104px] sm:w-[104px]" />
            <span className="w-full truncate text-center text-[15px] font-semibold">{t.name}</span>
          </span>
        ))}
        <span className="order-2 flex h-[76px] flex-col items-center justify-center gap-2 sm:h-[104px]">
          {played ? (
            <>
              <span className="num display-num whitespace-nowrap text-[34px] leading-none text-white sm:text-[44px]">
                <Tick v={m.score!.home} />
                <span className="mx-1 text-mute">:</span>
                <Tick v={m.score!.away} />
              </span>
              <span className={`text-[13px] leading-none ${live(m) ? 'text-live' : 'text-mute'}`}>
                {live(m) ? (m.statusCode === 4 ? 'перерыв' : m.elapsed ? `${m.elapsed}′` : 'идёт') : 'итог'}
              </span>
            </>
          ) : (
            <>
              <span className="num display-num text-[34px] leading-none sm:text-[44px]">{formatTime(m.ts)}</span>
              <span className="text-[13px] leading-none text-mute">мск</span>
            </>
          )}
        </span>
      </span>
      <span className="block truncate px-2 pb-1 text-[13px] text-dim">{m.league.name}</span>
    </>
  )
}

/** «Скоро начнутся» — компактная строка: эмблемы внахлёст, матч и турнир, справа время. Полка — в два ряда. */
export function RowCardBody({ m }: { m: Match }) {
  return (
    <span className="flex items-center gap-3">
      <Pair m={m} d={40} logo={26} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold">
          {m.home.name} <span className="font-normal text-mute">—</span> {m.away.name}
        </span>
        <span className="block truncate text-[13px] text-dim">{m.league.name}</span>
      </span>
      <span className="num display-num shrink-0 text-[22px] leading-none">{formatTime(m.ts)}</span>
    </span>
  )
}

/**
 * Полки тегов — главная цифра крупно: «62%» под словом «3+ гола», «−17%» янтарём на «Кэф упал»; справа эмблемы
 * внахлёст, ниже матч и турнир. Цифра — то, ради чего матч на полке; без цифры полка берёт обычную обложку.
 */
export function StatCardBody({ m, stat, hot = false }: { m: Match; stat: string; hot?: boolean }) {
  const cut = stat.lastIndexOf(' · ')
  const word = cut > 0 ? stat.slice(0, cut) : ''
  const big = cut > 0 ? stat.slice(cut + 3) : stat
  return (
    <>
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          {word ? <span className="block truncate text-[13px] text-dim first-letter:uppercase">{word}</span> : null}
          <span className={`num display-num block leading-none ${big.length > 7 ? 'text-[34px]' : 'text-[52px]'} ${hot ? 'text-hot' : 'text-white'} ${word ? 'mt-1.5' : ''}`}>
            {big}
          </span>
        </span>
        <Pair m={m} d={44} logo={28} />
      </span>
      <span className="mt-auto block min-w-0 pt-6">
        <span className="block truncate text-[16px] font-semibold">
          {m.home.name} <span className="font-normal text-mute">—</span> {m.away.name}
        </span>
        <span className="mt-0.5 flex gap-2 truncate text-[13px] text-dim">
          <span className="truncate">{m.league.name}</span>
          <span className="text-mute">·</span>
          <span className="num shrink-0">{live(m) ? <span className="text-live">идёт</span> : m.status === 'finished' ? 'сыгран' : formatTime(m.ts)}</span>
        </span>
      </span>
    </>
  )
}
