'use client'

import Link from 'next/link'
import { openStory } from './events'

/**
 * Ссылка на матч, которая открывает сторис. Для поисковиков и без JS это
 * обычная ссылка на страницу матча; Ctrl/Cmd/Shift-клик и средняя кнопка
 * тоже открывают страницу.
 */
export function StoryLink({
  id,
  href,
  className,
  children,
}: {
  id: number
  href: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      data-story={id}
      className={className}
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        openStory({ id, href, opener: e.currentTarget })
      }}
    >
      {children}
    </Link>
  )
}
