'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { activeNav, NAV } from './NavLinks'

/** Значки пунктов (сетка 24×24, линия 2px): мяч, звезда (как «Главные матчи»), %, кубок, щит с галочкой — без монет и денег. */
function Icon({ href }: { href: string }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden {...p}>
      {href === '/' ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="m12 7.5 4.2 3-1.6 5h-5.2l-1.6-5z" fill="currentColor" />
          <path d="M12 3v4.5M16.2 10.5l4.3-1.4M14.6 15.5l2.7 3.7M9.4 15.5l-2.7 3.7M7.8 10.5 3.5 9.1" />
        </>
      ) : href === '/tags' ? (
        <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
      ) : href === '/tag/value' ? (
        <>
          <path d="M18 6 6 18" />
          <circle cx="7.5" cy="7.5" r="2.5" />
          <circle cx="16.5" cy="16.5" r="2.5" />
        </>
      ) : href === '/leagues' ? (
        <>
          <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
          <path d="M7 6H4.5a3 3 0 0 0 3 4M17 6h2.5a3 3 0 0 1-3 4M12 14v3.5M8.5 20h7" />
        </>
      ) : (
        <>
          <path d="M12 3 19 6v5.5c0 4.3-3 7.7-7 9.5-4-1.8-7-5.2-7-9.5V6z" />
          <path d="m8.8 12.2 2.3 2.3 4.3-4.6" />
        </>
      )}
    </svg>
  )
}

/**
 * Меню на телефоне и планшете (ниже lg) — внизу, под большим пальцем, как у YouTube и Apple Sports (владелец: «может меню
 * перенести в нижнюю колонку отдельную примерно как на ютубе?»): плавающая капсула графитовым стеклом, значок и подпись,
 * выбранный — белый, подложка только за значком и подпись под ним; у остальных — только значок. Компактная — 54px, по 20px от краёв, не шире 360px, на 16px
 * выше низа экрана или полоски жестов (владелец: «нижнее меню немного некрасивое? на ютубе чуть компактнее и чуть выше»;
 * было 64px почти во всю ширину и на 10px от низа, выбранный — капсулой во всю высоту). Размытие постоянное (анимация backdrop-filter на iPhone дрожала — см. истории).
 * Место под ней — `--tabbar` в app/globals.css: отступ страницы снизу, нижняя плашка ставки и cookie — над ней.
 */
export function TabBar() {
  const active = activeNav(usePathname())
  return (
    <nav
      aria-label="Основное меню"
      className="tabbar fixed inset-x-4 bottom-[max(env(safe-area-inset-bottom),16px)] z-40 mx-auto grid h-[54px] max-w-[360px] grid-cols-5 min-[380px]:inset-x-5 rounded-full bg-[#151b22]/90 px-1 shadow-[0_12px_40px_rgb(0_0_0/0.55),inset_0_0_0_1px_rgb(255_255_255/0.09),inset_0_1px_0_rgb(255_255_255/0.08)] backdrop-blur-xl backdrop-saturate-150 lg:hidden"
    >
      {NAV.map((n) => {
        const on = n.href === active
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={on ? 'page' : undefined}
            title={n.label}
            className={`group/t flex min-w-0 flex-col items-center justify-center gap-0.5 transition-colors ${on ? 'text-fg' : 'text-fg/60'}`}
          >
            <span
              className={`grid h-7 w-11 place-items-center rounded-full transition-colors ${on ? 'bg-white/[0.14]' : 'group-active/t:bg-white/[0.08]'}`}
            >
              <Icon href={n.href} />
            </span>
            {/* подпись — только у выбранного (как в Android): пять длинных слов в узкой капсуле еле влезали и толкались
                (владелец: «текст как будто еле влазит»); у остальных — только для экранного диктора и в подсказке */}
            <span className={on ? 'max-w-full truncate px-0.5 text-[10.5px] font-medium leading-tight' : 'sr-only'}>{n.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
