'use client'

import { toggleFavorite, useFavorites } from './favorites'

/** Звёздочка «в избранное» у команды: матчи избранных команд — первыми в «Все матчи дня» (FavMatches). */
export function FavStar({ id, name, logo = null, className = '' }: { id: number; name: string; logo?: string | null; className?: string }) {
  const on = useFavorites().some((t) => t.id === id)
  return (
    <button
      type="button"
      onClick={() => toggleFavorite({ id, name, logo })}
      aria-pressed={on}
      aria-label={on ? `Убрать «${name}» из избранного` : `Добавить «${name}» в избранное`}
      title={on ? 'В избранном' : 'В избранное'}
      className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition-colors ${
        on ? 'bg-acid/15 text-acid hover:bg-acid/25' : 'bg-white/[0.06] text-dim hover:bg-white/[0.1] hover:text-fg'
      } ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinejoin="round" aria-hidden>
        <path d="M12 3.6l2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 16.5l-5.1 2.8 1.1-5.7-4.3-4 5.8-.7z" />
      </svg>
      {on ? 'В избранном' : 'В избранное'}
    </button>
  )
}
