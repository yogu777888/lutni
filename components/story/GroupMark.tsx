import type { StoryGroup } from '@/lib/story-groups'
import { StorySymbol } from './StorySymbol'

/**
 * Что внутри круга подборки (владелец на «вместо значка — эмблема команды» — «давай 1»): эмблема главной команды
 * подборки (`lead` — из первого матча, `leadOf` в lib/story-groups.ts), как аватар у историй в Instagram; без эмблемы,
 * у «Идут» и у лаймового «Выгодно» — знак подборки, как был. Цвет подборки остаётся у заливки круга и кольца.
 */
export function GroupMark({ g, tone, className, crest }: { g: Pick<StoryGroup, 'key' | 'kind' | 'lead'>; tone: string; className: string; crest: string }) {
  const lead = g.kind === 'live' || g.key === 'value' ? null : g.lead
  if (lead?.logo)
    // без светлого контура: владелец — «мне не нравится контур светлый»
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={lead.logo} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" className={`${crest} object-contain`} />
  return <StorySymbol k={g.key} tone={tone} className={className} />
}
