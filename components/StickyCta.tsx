import type { Partner } from '@/config/bookmakers'
import { SPONSORED_REL } from '@/lib/affiliate'
import { PartnerBadge } from './PartnerBadge'
import { StickyHide } from './StickyHide'

/**
 * Нижняя плашка на мобильных: главный CTA всегда под пальцем. Пока на экране кнопка ставки из первого блока
 * (`#pick-cta`), плашка уезжает вниз (владелец согласился): две одинаковые кнопки стояли рядом, и плашка наполовину
 * закрывала «Поставить за 3.12 в PARI» (на 390×844 — 750–798px против 783–844px).
 */
export function StickyCta({ partner, href, title, subtitle, action }: { partner: Partner; href: string; title: string; subtitle: string; action: string }) {
  return (
    <StickyHide
      target="pick-cta"
      // над нижним меню (`TabBar`, место — `--tabbar`): той же капсулой — та же ширина и поля от краёв (`inset-x-4`,
      // от 380px `inset-x-5`, не шире 360px), то же стекло и скругление (владелец: «нижний попап имеет другое скругление?
      // и кнопка ставка не совпадает со скруглением попапа»: была карточка 20px шире меню, а кнопка внутри — капсулой);
      // высота 52px, кнопка 36px с отступом 8px — её скругление вложено в скругление плашки (26 = 18 + 8); владелец: «а по
      // размерам эти элементы как?» — меню 50px, плашка 52px, между ними 6px
      className="sticky-cta fixed inset-x-4 bottom-[var(--tabbar)] z-40 mx-auto max-w-[360px] rounded-full bg-[#151b22]/90 py-2 pl-2.5 pr-2 shadow-[0_12px_40px_rgb(0_0_0/0.55),inset_0_0_0_1px_rgb(255_255_255/0.09),inset_0_1px_0_rgb(255_255_255/0.08)] backdrop-blur-xl backdrop-saturate-150 min-[380px]:inset-x-5 lg:hidden"
    >
      <a href={href} target="_blank" rel={SPONSORED_REL} className="flex items-center gap-2.5">
        <PartnerBadge partner={partner} size={32} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-semibold leading-tight">{title}</span>
          {/* «Реклама · 18+» не обрезается никогда (пометка обязательна) — сжимается только тип ставки и букмекер */}
          <span className="mt-0.5 flex min-w-0 text-[12px] leading-tight text-mute">
            <span className="truncate">{subtitle}</span>
            <span className="shrink-0 whitespace-nowrap">&nbsp;· Реклама · 18+</span>
          </span>
        </span>
        <span className="inline-flex h-9 shrink-0 items-center rounded-full bg-btn px-4 text-[15px] font-semibold text-btn-ink num">{action}</span>
      </a>
    </StickyHide>
  )
}
