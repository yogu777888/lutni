'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export const NAV = [
  { href: '/matches', label: 'Матчи' },
  { href: '/tags', label: 'Теги' },
  { href: '/tag/value', label: 'Выгодно' },
  { href: '/leagues', label: 'Лиги' },
  { href: '/bookmakers', label: 'Букмекеры' },
] as const

/** Какой пункт меню подсветить: список, дни и страница матча — «Матчи», страницы тегов — «Теги». Главная — логотип. */
export function activeNav(path: string): string | null {
  if (path.startsWith('/matches') || path.startsWith('/match/')) return '/matches'
  if (path === '/tag/value') return '/tag/value'
  if (path === '/tags' || path.startsWith('/tag/')) return '/tags'
  if (path === '/leagues' || path.startsWith('/league/')) return '/leagues'
  if (path.startsWith('/bookmakers')) return '/bookmakers'
  return null
}

/**
 * Меню текстом — для шапки на компьютере, рядом с бегущей строкой матчей: тише капсулы, чтобы главным в шапке
 * были матчи. Выбранный раздел — белый с короткой чертой снизу.
 */
export function NavLinks({ className = '' }: { className?: string }) {
  const active = activeNav(usePathname())
  return (
    <nav aria-label="Основное меню" className={`flex items-center gap-0.5 ${className}`}>
      {NAV.map((n) => {
        const on = n.href === active
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={on ? 'page' : undefined}
            className={`relative inline-flex h-9 items-center rounded-ctl px-3 text-[14.5px] font-medium transition-colors ${
              on ? 'text-fg' : 'text-fg/75 hover:bg-white/12 hover:text-fg'
            }`}
          >
            {n.label}
            {on ? <span aria-hidden className="absolute inset-x-3 bottom-0.5 h-[2.5px] rounded-full bg-fg" /> : null}
          </Link>
        )
      })}
    </nav>
  )
}
