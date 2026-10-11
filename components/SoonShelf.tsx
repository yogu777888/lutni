import type { FeedItem } from '@/lib/data'
import { matchHref } from '@/lib/links'
import { SHELF_CARD, Shelf } from './Shelf'
import { StoryLink } from './story/StoryLink'
import { MatchCardBody } from './MatchCard'

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
          <MatchCardBody m={m} sub={m.league.name} />
        </StoryLink>
      ))}
    </Shelf>
  )
}
