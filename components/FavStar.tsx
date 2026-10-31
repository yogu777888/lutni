'use client'

import { toggleFavMatch, toggleFavorite, useFavMatches, useFavorites } from './favorites'
import { Icon } from '@/components/Icon'

/**
 * Звёздочка «в избранное» у команды: матчи избранных команд — первыми в «Все матчи дня» (FavMatches). compact — только
 * звёздочка кругом 32px. Выбранная — белая залитая, не лаймом: лайм у нас только деньги и «выгодно».
 */
export function FavStar({
  id,
  name,
  logo = null,
  compact = false,
  className = '',
}: {
  id: number
  name: string
  logo?: string | null
  compact?: boolean
  className?: string
}) {
  const on = useFavorites().some((t) => t.id === id)
  return (
    <button
      type="button"
      onClick={() => toggleFavorite({ id, name, logo })}
      aria-pressed={on}
      aria-label={on ? `Убрать «${name}» из избранного` : `Добавить «${name}» в избранное`}
      title={on ? 'В избранном' : 'В избранное'}
      className={`inline-flex h-8 shrink-0 items-center rounded-full text-[12.5px] font-medium transition-colors ${compact ? 'w-8 justify-center' : 'gap-1.5 px-3'} ${
        on ? `text-fg ${compact ? 'hover:bg-white/[0.08]' : 'bg-white/[0.1] hover:bg-white/[0.14]'}` : compact ? 'text-mute hover:bg-white/[0.08] hover:text-fg' : 'bg-white/[0.06] text-dim hover:bg-white/[0.1] hover:text-fg'
      } ${className}`}
    >
      <Icon k={on ? 'star-fill' : 'star-outline'} className="h-3.5 w-3.5" />
      {compact ? null : on ? 'В избранном' : 'В избранное'}
    </button>
  )
}

/**
 * Звёздочка «матч в избранное» справа в шапке матча (владелец: «на компе и на мобильном справа в хедере матча сделаем иконку
 * звезды чтоб матч в избранное можно было добавить»): избранный матч — первым в «Избранном» на главной и в «Матчах» его дня
 * и в левой панели. `bar` — на телефоне, в строке шапки: без подложки, как «‹» с другой стороны (место нажатия 44px); иначе —
 * круг 32px, как «‹» в плашке над табло.
 */
export function MatchFavStar({ id, ts, bar = false }: { id: number; ts: number; bar?: boolean }) {
  const on = useFavMatches().some((m) => m.id === id)
  return (
    <button
      type="button"
      onClick={() => toggleFavMatch({ id, ts })}
      aria-pressed={on}
      aria-label={on ? 'Убрать матч из избранного' : 'Добавить матч в избранное'}
      title={on ? 'Матч в избранном — первым в списке матчей дня' : 'Матч в избранное'}
      className={
        bar
          ? `-mr-2 grid h-11 w-11 shrink-0 place-items-center transition-[color,transform] active:scale-90 ${on ? 'text-fg' : 'text-fg/90 hover:text-fg'}`
          : `grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.07] transition-[background-color,color,transform] hover:bg-white/[0.13] active:scale-90 ${on ? 'text-fg' : 'text-dim hover:text-fg'}`
      }
    >
      <Icon k={on ? 'star-fill' : 'star-outline'} className={bar ? 'h-[22px] w-[22px]' : 'h-[18px] w-[18px]'} />
    </button>
  )
}
