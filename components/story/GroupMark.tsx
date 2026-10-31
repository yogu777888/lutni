import type { StoryGroup } from '@/lib/story-groups'
import { StorySymbol } from './StorySymbol'
import { PLATE } from '../LeagueMark'

/** Знак «Идут» на светлой подложке — темнее красного `LIVE` (#ff5c63 на светло-сером почти не виден); остальные знаки — графитом. */
export const LIVE_ON_PLATE = '#d93036'

/** Знак подборки на подложке: «Идут» — красным, остальные (лаймовое «Выгодно», подборки без эмблем) — графитом. */
export function PlateSymbol({ k, className }: { k: string; className: string }) {
  return <StorySymbol k={k} tone={k === 'live' ? LIVE_ON_PLATE : 'var(--color-ink)'} className={className} />
}

/**
 * Что внутри круга подборки (владелец на «вместо значка — эмблема команды» — «давай 1»): эмблема главной команды
 * подборки (`lead` — из первого матча, `leadOf` в lib/story-groups.ts), как аватар у историй в Instagram; у «Идут»,
 * «Выгодно» и подборки без эмблем — знак. Всё — на светлой подложке `PLATE`, цвет подборки — у кольца.
 */
export function GroupMark({
  g,
  className,
  crest,
  fade = '',
}: {
  g: Pick<StoryGroup, 'key' | 'kind' | 'lead'>
  className: string
  /** размер эмблемы */
  crest: string
  /** классы подложки (прятать при наведении) */
  fade?: string
}) {
  const live = g.kind === 'live' || g.key === 'live'
  const lead = live || g.key === 'value' ? null : g.lead
  // эмблема — на светлом круге во весь круг подборки (владелец: «может добавим логотипам круглую светлую подложку?»):
  // эмблемы рисуют под белый фон, тёмные («Мец») на тёмном круге пропадали; светлый контур владельцу не понравился.
  // «Идут», «Выгодно» и подборки без эмблем — тоже на подложке, знаком (владелец: «и идут с выгодно тоже подложку»).
  // Родитель — `relative`; цвет подборки остаётся у кольца
  return (
    <span className={`absolute inset-0 grid place-items-center rounded-full ${fade}`} style={{ background: PLATE }}>
      {lead?.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={lead.logo} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" className={`${crest} object-contain`} />
      ) : (
        <PlateSymbol k={live ? 'live' : g.key} className={className} />
      )}
    </span>
  )
}
