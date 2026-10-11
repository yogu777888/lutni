import type { FeedItem } from '@/lib/data'
import { formatTime } from '@/lib/format'
import { matchHref } from '@/lib/links'
import { SHELF_CARD, Shelf } from './Shelf'
import { StoryLink } from './story/StoryLink'
import { TeamLogo } from './TeamLogo'

/**
 * «Скоро начнутся» — полка ближайших матчей (`soonMatches`): турнир и крупное время сверху, команды с эмблемами
 * строками. Вся карточка — ссылка (клик открывает сторис матча). «Показать все» — список дня по времени.
 */
export function SoonShelf({ items, allHref }: { items: FeedItem[]; allHref: string }) {
  if (items.length < 3) return null
  return (
    <Shelf title="Скоро начнутся" more={{ href: allHref }}>
      {items.map(({ match: m }) => (
        <StoryLink key={m.id} id={m.id} href={matchHref(m)} className={`${SHELF_CARD} gap-4 transition-colors hover:bg-panel-3`}>
          <span className="flex items-start justify-between gap-3">
            <span className="min-w-0 truncate pt-1 text-[13px] text-dim">{m.league.name}</span>
            <span className="num display-num shrink-0 text-[26px] leading-none">{formatTime(m.ts)}</span>
          </span>
          {[m.home, m.away].map((t) => (
            <span key={t.id} className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[0.08]">
                <TeamLogo name={t.name} src={t.logo} size={26} />
              </span>
              <span className="truncate text-[16px] font-semibold">{t.name}</span>
            </span>
          ))}
        </StoryLink>
      ))}
    </Shelf>
  )
}
