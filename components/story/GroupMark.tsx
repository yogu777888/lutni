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
/**
 * Подложка с эмблемой и знаком подборки за ней (владелец: «в историях где подборки будем на задний фон под лого клуба
 * ставить как то иконку допустим если прогруз то стрелку вниз?»): знак крупно, сдвинут к правому нижнему краю и срезан
 * кругом, графитом 22% («Идут» — красным 30%), эмблема — поверх по центру. Нет эмблемы — знак по центру, как был.
 */
export function PlateMark({ sym, logo, className, crest, fade = '' }: { sym: string; logo?: string | null; className: string; crest: string; fade?: string }) {
  const live = sym === 'live'
  return (
    <span className={`absolute inset-0 grid place-items-center overflow-hidden rounded-full ${fade}`} style={{ background: PLATE }}>
      {logo ? (
        <>
          <StorySymbol
            k={sym}
            tone={live ? LIVE_ON_PLATE : 'var(--color-ink)'}
            className={`absolute -bottom-[14%] -right-[14%] h-[72%] w-[72%] ${live ? 'opacity-30' : 'opacity-[0.22]'}`}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" className={`relative ${crest} object-contain`} />
        </>
      ) : (
        <PlateSymbol k={sym} className={className} />
      )}
    </span>
  )
}

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
  // эмблема — на светлом круге во весь круг подборки (владелец: «может добавим логотипам круглую светлую подложку?»):
  // эмблемы рисуют под белый фон, тёмные («Мец») на тёмном круге пропадали; светлый контур владельцу не понравился.
  // «Идут» — тоже эмблемой (владелец: «давай в лайв матчах тоже сделаем белые кружки и лого клуба?»), за ней — знак;
  // «Выгодно» и подборки без эмблем — знаком. Родитель — `relative`; цвет подборки остаётся у кольца
  return <PlateMark sym={live ? 'live' : g.key} logo={g.key === 'value' ? null : g.lead?.logo} className={className} crest={crest} fade={fade} />
}
