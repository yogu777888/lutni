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
export function MatchCardBody({ m, sub, dim = false }: { m: Match; sub: string; dim?: boolean }) {
  const played = Boolean(m.score) && (live(m) || m.status === 'finished')
  return (
    <>
      <span className={`grid h-[132px] grid-cols-[1fr_auto_1fr] items-center rounded-tile bg-white/[0.04] px-3 ${dim ? 'opacity-60' : ''}`}>
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
      <span className="min-w-0 px-2 pb-1">
        <span className="block truncate text-[16px] font-semibold">
          {m.home.name} <span className="font-normal text-mute">—</span> {m.away.name}
        </span>
        <span className="mt-0.5 block truncate text-[13px] text-dim first-letter:uppercase">{sub}</span>
      </span>
    </>
  )
}
