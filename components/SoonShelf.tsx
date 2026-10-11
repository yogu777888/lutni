import type { FeedItem } from '@/lib/data'
import { formatTime } from '@/lib/format'
import { matchHref } from '@/lib/links'
import { SHELF_CARD, Shelf } from './Shelf'
import { StoryLink } from './story/StoryLink'
import { TeamLogo } from './TeamLogo'

/**
 * «Скоро начнутся» — полка ближайших матчей (`soonMatches`): «обложка», как у альбома в Spotify, — эмблемы крупно
 * и время между ними, под ней матч и турнир. Вся карточка — ссылка (клик открывает сторис матча). «Показать все» — список дня по времени.
 */
export function SoonShelf({ items, allHref }: { items: FeedItem[]; allHref: string }) {
  if (items.length < 3) return null
  return (
    <Shelf title="Скоро начнутся" more={{ href: allHref }}>
      {items.map(({ match: m }) => (
        <StoryLink key={m.id} id={m.id} href={matchHref(m)} className={`${SHELF_CARD} group gap-3 !p-3 transition-colors hover:bg-panel-3`}>
          {/* «обложка», как у альбома в Spotify: эмблемы крупно, между ними — время */}
          <span className="grid h-[132px] grid-cols-[1fr_auto_1fr] items-center rounded-tile bg-white/[0.04] px-3">
            {[m.home, m.away].map((t, i) => (
              <span key={t.id} className={`grid place-items-center transition-transform duration-300 group-hover:scale-105 ${i ? 'order-3' : ''}`}>
                <TeamLogo name={t.name} src={t.logo} size={64} />
              </span>
            ))}
            <span className="num display-num order-2 text-[28px] leading-none">{formatTime(m.ts)}</span>
          </span>
          <span className="min-w-0 px-2 pb-1">
            <span className="block truncate text-[16px] font-semibold">
              {m.home.name} <span className="font-normal text-mute">—</span> {m.away.name}
            </span>
            <span className="mt-0.5 block truncate text-[13px] text-dim">{m.league.name}</span>
          </span>
        </StoryLink>
      ))}
    </Shelf>
  )
}
