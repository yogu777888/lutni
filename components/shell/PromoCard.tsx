import { primaryPartner } from '@/config/bookmakers'
import { goHref, SPONSORED_REL } from '@/lib/affiliate'

/**
 * Яркий виджет внизу правой панели каркаса, как у Spotify «Зарегистрируйся»: градиент цветов бренда (лайм → бирюза),
 * бонус главного партнёра и белая кнопка «Получить» (через /go, rel=sponsored). Реклама — с маркировкой: рекламодатель,
 * erid и 18+ (ст. 18.1 закона «О рекламе»), тёмным по светлому — читается.
 */
export function PromoCard() {
  const p = primaryPartner()
  if (!p) return null
  const marks = [p.ad.advertiser, p.ad.erid ? `erid: ${p.ad.erid}` : '', '18+'].filter(Boolean).join(' · ')
  return (
    <div className="rounded-tile bg-[linear-gradient(135deg,#c8ff2e_0%,#5ee6a8_55%,#2ec8e6_100%)] p-4 text-[#0b0f14]">
      <p className="text-[12px] font-semibold opacity-70">{p.name}</p>
      <p className="mt-0.5 text-[16px] font-bold leading-snug">{p.bonus}</p>
      <a
        href={goHref(p, 'panel')}
        target="_blank"
        rel={SPONSORED_REL}
        className="mt-3 flex h-10 items-center justify-center rounded-full bg-white text-[14px] font-semibold text-[#0b0f14] transition-transform hover:scale-[1.02] active:scale-[0.98]"
      >
        Получить
      </a>
      <p className="mt-2 text-[10.5px] leading-snug opacity-70">Реклама · {marks}</p>
    </div>
  )
}
