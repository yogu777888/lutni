import type { FeedItem } from '@/lib/data'
import { matchHref } from '@/lib/links'
import { SHELF_BASE, SHELF_W, Shelf } from './Shelf'
import { StoryLink } from './story/StoryLink'
import { ShelfIcon } from './story/StorySymbol'
import { RowCardBody } from './MatchCard'

/**
 * «Скоро начнутся» — полка ближайших матчей (`soonMatches`): компактные строки в два ряда, как «быстрый
 * выбор» у Spotify, — эмблемы внахлёст, матч и турнир, справа время. Вся карточка — ссылка (клик открывает сторис матча). «Показать все» — список дня по времени.
 */
export function SoonShelf({ items, allHref }: { items: FeedItem[]; allHref: string }) {
  if (items.length < 3) return null
  return (
    <Shelf title="Скоро начнутся" icon={<ShelfIcon k="soon" />} more={{ href: allHref }} rows={2}>
      {items.map(({ match: m }) => (
        <StoryLink key={m.id} id={m.id} href={matchHref(m)} className={`${SHELF_BASE} ${SHELF_W.row} group justify-center p-3 transition-colors hover:bg-panel-3`}>
          <RowCardBody m={m} />
        </StoryLink>
      ))}
    </Shelf>
  )
}
