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
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <a
        href={goHref(partner, placement)}
        target="_blank"
        rel={SPONSORED_REL}
        className="group grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3"
      >
        <PartnerBadge partner={partner} size={34} />
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold">{partner.name}</span>
          {bonus ? <span className="block truncate text-[12px] text-dim">{bonus}</span> : null}
        </span>
        <span className="inline-flex rounded-full bg-white/[0.08] px-3 py-1.5 text-[12px] font-medium text-fg transition-colors group-hover:bg-btn group-hover:text-btn-ink">
          На сайт
        </span>
      </a>
      <AdMark partner={partner} className="mt-1 pl-[46px]" />
    </div>
  )
}
