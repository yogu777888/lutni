'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { activeNav, NAV } from './NavLinks'
import { NavIcon } from './NavIcon'

/**
 * Меню на телефоне и планшете (ниже lg) — внизу, под большим пальцем, обычной полосой во всю ширину, как у YouTube
 * (владелец: «а можно нижнее меню на телефоне обычное как на ютуб снизу в прямоугольнике полупрозрачном? только большим
 * не делай… нижняя навигация тоже должна быть соразмерной»): прижато к низу экрана, графит 80% с размытием и тонкой
 * чертой сверху, 48px (шапка — 52px) плюс полоска жестов iPhone под ним; значок 20px и подпись у всех пунктов —
 * в полосу во всю ширину пять подписей влезают (в капсуле 360px толкались — тогда подпись была только у выбранного);
 * выбранный — белый залитый значок, остальные — контурные `fg/60`. Ниже «плавающая капсула» — история.
 * Место под ним — `--tabbar` в app/globals.css: отступ страницы снизу, нижняя плашка ставки и cookie — над ним.
 */
export function TabBar() {
  const active = activeNav(usePathname())
  return (
    <nav
      aria-label="Основное меню"
      className="tabbar fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/[0.08] bg-[#090c10]/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150 lg:hidden"
    >
      {NAV.map((n) => {
        const on = n.href === active
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={on ? 'page' : undefined}
            title={n.label}
            className={`group/t flex h-12 min-w-0 flex-col items-center justify-center gap-0.5 transition-colors ${on ? 'text-fg' : 'text-fg/60'}`}
          >
            <span className="grid h-6 w-11 place-items-center rounded-full transition-colors group-active/t:bg-white/[0.08]">
              <NavIcon href={n.href} on={on} />
            </span>
            <span className="max-w-full truncate px-0.5 text-[10.5px] font-medium leading-tight">{n.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
