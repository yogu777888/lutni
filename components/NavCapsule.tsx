'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLayoutEffect, useRef, useState } from 'react'

export const NAV = [
  { href: '/', label: 'Матчи' },
  { href: '/tags', label: 'Теги' },
  { href: '/tag/value', label: 'Выгодно' },
  { href: '/leagues', label: 'Лиги' },
  { href: '/bookmakers', label: 'Букмекеры' },
] as const

/** Какой пункт меню подсветить: страница матча и дни — это «Матчи», страницы тегов — «Теги». */
export function activeNav(path: string): string | null {
  if (path === '/' || path.startsWith('/matches') || path.startsWith('/match/')) return '/'
  if (path === '/tag/value') return '/tag/value'
  if (path === '/tags' || path.startsWith('/tag/')) return '/tags'
  if (path === '/leagues' || path.startsWith('/league/')) return '/leagues'
  if (path.startsWith('/bookmakers')) return '/bookmakers'
  return null
}

type Pill = { x: number; w: number; animate: boolean }

/**
 * Меню-капсула, как переключатель в macOS: выбранный раздел — приподнятая
 * «таблетка», при переходе она переезжает к новому пункту. До гидрации
 * (и без JS) подсвечен сам пункт — разметка с сервера уже правильная.
 */
export function NavCapsule({ className = '', wide = false }: { className?: string; wide?: boolean }) {
  const active = activeNav(usePathname())
  const ref = useRef<HTMLElement>(null)
  const [pill, setPill] = useState<Pill | null>(null)

  useLayoutEffect(() => {
    const nav = ref.current
    if (!nav) return
    const measure = (animate: boolean) => {
      const el = nav.querySelector<HTMLElement>('[aria-current="page"]')
      setPill((prev) => (el ? { x: el.offsetLeft, w: el.offsetWidth, animate: animate && prev !== null } : null))
    }
    measure(true)
    // ширина пунктов меняется, когда догружается шрифт или поворачивают телефон;
    // первый вызов observer'а (сразу после подписки) не должен сбить анимацию переезда
    let width = nav.offsetWidth
    const ro = new ResizeObserver(() => {
      if (nav.offsetWidth === width) return
      width = nav.offsetWidth
      measure(false)
    })
    ro.observe(nav)
    return () => ro.disconnect()
  }, [active])

  return (
    <nav
      ref={ref}
      aria-label="Основное меню"
      className={`on-dark relative flex items-center rounded-full border border-edge bg-panel p-1 ${className}`}
    >
      {pill ? (
        <span
          aria-hidden
          className="absolute inset-y-1 left-0 rounded-full bg-panel-3 shadow-[inset_0_1px_0_rgb(255_255_255/0.07),0_1px_3px_rgb(0_0_0/0.5)]"
          style={{
            width: pill.w,
            transform: `translateX(${pill.x}px)`,
            transition: pill.animate ? 'transform 420ms cubic-bezier(0.3, 1.25, 0.4, 1), width 420ms cubic-bezier(0.3, 1.25, 0.4, 1)' : 'none',
          }}
        />
      ) : null}
      {NAV.map((n) => {
        const on = n.href === active
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={on ? 'page' : undefined}
            // на телефоне капсула во всю ширину: отступы пунктов сжимаются с экраном (10px → 4px), чтобы пять пунктов
            // влезали и на 360px; лишнее место раздаёт flex-1
            className={`relative z-10 inline-flex h-8 shrink-0 items-center justify-center rounded-full font-medium transition-colors ${
              wide ? 'flex-1 px-[clamp(4px,calc((100vw_-_316px)/10),10px)] text-[13px]' : 'px-3.5 text-[14px]'
            } ${on ? 'text-fg' : 'text-dim hover:bg-panel-2 hover:text-fg'} ${on && !pill ? 'bg-panel-3' : ''}`}
          >
            {n.label}
          </Link>
        )
      })}
    </nav>
  )
}
