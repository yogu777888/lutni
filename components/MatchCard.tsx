import { formatTime, ymdInTz } from '@/lib/format'
import type { Match } from '@/lib/types'
import { Tick } from './Live'
import { TeamLogo } from './TeamLogo'
import { CardTint } from './shell/tint'

const live = (m: Match) => m.status === 'live' || m.status === 'suspended'

/**
 * Содержимое карточки матча на полке (общая для «Скоро начнутся» и полок историй): «обложка», как у альбома в
 * Spotify, — эмблемы крупно, между ними время, счёт с минутой (идёт) или счёт и «итог»; под ней матч и строка
 * `sub` (турнир или повод, по которому матч попал на полку). Обёртку-ссылку и класс `SHELF_CARD` даёт полка.
 */
export function MatchCardBody({
  m,
  sub,
  dim = false,
  badge,
  tint,
}: {
  m: Match
  sub: string
  dim?: boolean
  /** главная цифра истории в углу обложки («−17%», «62%»); hot — янтарём (кэф упал) */
  badge?: { text: string; hot?: boolean } | null
  /** цвета клубов — карточка мягко окрашена, как у Spotify под цвет обложки (хозяева сверху слева, гости справа);
      обложка с эмблемами — непрозрачная, не окрашивается; не успели с сервера — догружаются (CardTint) */
  tint?: { home: string; away: string } | null
}) {
  const played = Boolean(m.score) && (live(m) || m.status === 'finished')
  return (
    <>
      <CardTint id={m.id} ymd={ymdInTz(m.ts)} initial={tint} />
      <span className={`relative grid h-[132px] grid-cols-[1fr_auto_1fr] items-center rounded-tile bg-panel-3 px-3 ${dim ? 'opacity-60' : ''}`}>
        {badge ? (
          <span className={`num absolute left-2 top-2 rounded-ctl px-2 py-0.5 text-[12.5px] font-semibold ${badge.hot ? 'bg-hot/[0.14] text-hot' : 'bg-white/[0.08] text-fg'}`}>
            {badge.text}
          </span>
        ) : null}
        {[m.home, m.away].map((t, i) => (
          <span key={t.id} className={`grid place-items-center transition-transform duration-300 group-hover:scale-105 ${i ? 'order-3' : ''}`}>
            <TeamLogo name={t.name} src={t.logo} size={64} />
          </span>
        ))}
        <span className="order-2 flex flex-col items-center gap-1.5">
          {played ? (
            <>
              <span className={`num display-num whitespace-nowrap text-[28px] leading-none ${live(m) ? 'text-live' : ''}`}>
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
