'use client'

import { openStory } from './events'

/** Кнопка «Разбор за минуту» на странице матча — открывает сторис. */
export function StoryButton({ id, href, className = '' }: { id: number; href: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => openStory({ id, href, opener: e.currentTarget })}
      className={`inline-flex items-center gap-2 rounded-full bg-white/[0.08] py-1.5 pl-1.5 pr-3.5 text-[13px] font-medium transition-colors hover:bg-white/[0.13] ${className}`}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-btn text-btn-ink" aria-hidden>
        <svg viewBox="0 0 12 12" className="ml-0.5 h-2.5 w-2.5 fill-current">
          <path d="M2 1.2v9.6a.6.6 0 0 0 .9.5l7.6-4.8a.6.6 0 0 0 0-1L2.9.7a.6.6 0 0 0-.9.5Z" />
        </svg>
      </span>
      Разбор за минуту
    </button>
  )
}
