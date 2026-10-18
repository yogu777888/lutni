'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { activeNav, NAV } from './NavLinks'
import { NavIcon } from './NavIcon'

/**
 * Меню на телефоне и планшете (ниже lg) — внизу, под большим пальцем, как у YouTube и Apple Sports (владелец: «может меню
 * перенести в нижнюю колонку отдельную примерно как на ютубе?»): плавающая капсула графитовым стеклом, значок и подпись,
 * выбранный — белый залитый значок и подпись под ним; у остальных — контурный значок. Компактная — 54px, по 20px от краёв, не шире 360px, на 16px
 * выше низа экрана или полоски жестов (владелец: «нижнее меню немного некрасивое? на ютубе чуть компактнее и чуть выше»;
 * было 64px почти во всю ширину и на 10px от низа, выбранный — капсулой во всю высоту). Размытие постоянное (анимация backdrop-filter на iPhone дрожала — см. истории).
 * Место под ней — `--tabbar` в app/globals.css: отступ страницы снизу, нижняя плашка ставки и cookie — над ней.
 */
export function TabBar() {
  const active = activeNav(usePathname())
  return (
    <nav
      aria-label="Основное меню"
      className="tabbar fixed inset-x-4 bottom-[max(env(safe-area-inset-bottom),16px)] z-40 mx-auto grid h-[50px] max-w-[360px] grid-cols-5 min-[380px]:inset-x-5 rounded-full bg-[#151b22]/90 px-1 shadow-[0_12px_40px_rgb(0_0_0/0.55),inset_0_0_0_1px_rgb(255_255_255/0.09),inset_0_1px_0_rgb(255_255_255/0.08)] backdrop-blur-xl backdrop-saturate-150 lg:hidden"
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
            {/* без подложки за значком: выбранный и так виден — залитый значок, белый, с подписью */}
            <span className="grid h-7 w-11 place-items-center rounded-full transition-colors group-active/t:bg-white/[0.08]">
              <NavIcon href={n.href} on={on} />
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
