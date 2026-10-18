import { realBonus, type Partner } from '@/config/bookmakers'
import { goHref, SPONSORED_REL, type Placement } from '@/lib/affiliate'
import { AdMark } from './AdMark'
import { PartnerBadge } from './PartnerBadge'

/**
 * Строка «Где поставить»: знак, название, бонус и кнопка «На сайт»; вся строка — ссылка на букмекера (владелец: «а где
 * поставить как?»). Оценки «4.6» здесь нет: голое число без «из 5», а PARI первым с 4.6 над Фонбетом 4.8 выглядел
 * подкрученным списком; оценки со звёздами — на странице «Букмекеры». Бонус — только настоящий (`AFF_<SLUG>_BONUS`),
 * заглушка «Бонус для новых клиентов» у всех одна — её не показываем.
 */
export function PartnerCard({ partner, placement }: { partner: Partner; placement: Placement; rank?: number }) {
  const bonus = realBonus(partner)
  // «Реклама · 18+» — второй строкой под названием, в той же колонке: кнопка стоит по центру всей строки (владелец: «кнопки
  // на сайт как будто криво отцентрованы?» — пометка шла отдельной строкой под всей ссылкой, и кнопка висела выше середины);
  // кнопка — 36px, жирнее, со стрелкой «↗» (уводит на сайт букмекера), при наведении — лаймом, как все переходы к букмекеру
  return (
    <a
      href={goHref(partner, placement)}
      target="_blank"
      rel={SPONSORED_REL}
      className="group flex min-h-16 items-center gap-3 py-3"
    >
      <PartnerBadge partner={partner} size={40} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold">{partner.name}</div>
        {bonus ? <div className="truncate text-[13px] text-dim">{bonus}</div> : null}
        <AdMark partner={partner} className="mt-0.5 !text-[12px]" />
      </div>
      <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white/[0.08] pl-4 pr-3 text-[14px] font-semibold text-fg transition-colors group-hover:bg-btn group-hover:text-btn-ink">
        На сайт
        <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 17 17 7M8 7h9v9" />
        </svg>
      </span>
    </a>
  )
}
