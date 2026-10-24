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
export function PartnerCard({ partner, placement, className = '' }: { partner: Partner; placement: Placement; rank?: number; className?: string }) {
  const bonus = realBonus(partner)
  // строка — как на странице «Букмекеры» (владелец: «блоки с букмекерами и подборками визуально сделать как на страницах?»):
  // знак 40px, название 16px, справа «Реклама · 18+» и тихая плашка «На сайт» (лаймом при наведении); на телефоне пометка —
  // под кнопкой; подсветка строки — во всю ширину, поля задаёт место (`className`)
  return (
    <a
      href={goHref(partner, placement)}
      target="_blank"
      rel={SPONSORED_REL}
      className={`group grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-4 py-3.5 transition-colors hover:bg-white/[0.02] ${className}`}
    >
      <PartnerBadge partner={partner} size={40} />
      <div className="min-w-0">
        <div className="truncate text-[16px] font-semibold tracking-tight">{partner.name}</div>
        {bonus ? <div className="truncate text-[13px] text-dim">{bonus}</div> : null}
      </div>
      <div className="flex flex-col-reverse items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
        <AdMark partner={partner} className="max-w-[12rem] text-right" />
        <span className="inline-flex h-[34px] shrink-0 items-center rounded-ctl bg-white/[0.08] px-3.5 text-[13px] font-semibold transition-colors group-hover:bg-btn group-hover:text-btn-ink">
          На сайт
        </span>
      </div>
    </a>
  )
}
