import type { StoryGroup } from '@/lib/story-groups'
import { StorySymbol } from './StorySymbol'
import { PLATE } from '../LeagueMark'

/**
 * Что внутри круга подборки (владелец на «вместо значка — эмблема команды» — «давай 1»): эмблема главной команды
 * подборки (`lead` — из первого матча, `leadOf` в lib/story-groups.ts), как аватар у историй в Instagram; без эмблемы,
 * у «Идут» и у лаймового «Выгодно» — знак подборки, как был. Цвет подборки остаётся у заливки круга и кольца.
 */
export function GroupMark({
  g,
  tone,
  className,
  crest,
  fade = '',
}: {
  g: Pick<StoryGroup, 'key' | 'kind' | 'lead'>
  tone: string
  className: string
  /** размер эмблемы */
  crest: string
  /** классы подложки (прятать при наведении) */
  fade?: string
}) {
  const lead = g.kind === 'live' || g.key === 'value' ? null : g.lead
  // эмблема — на светлом круге во весь круг подборки (владелец: «может добавим логотипам круглую светлую подложку?»):
  // эмблемы рисуют под белый фон, тёмные («Мец») на тёмном круге пропадали; светлый контур владельцу не понравился.
  // Родитель — `relative`; цвет подборки остаётся у кольца
  if (lead?.logo)
    return (
      <span className={`absolute inset-0 grid place-items-center rounded-full ${fade}`} style={{ background: PLATE }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={lead.logo} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" className={`${crest} object-contain`} />
      </span>
    )
  return <StorySymbol k={g.key} tone={tone} className={className} />
}
