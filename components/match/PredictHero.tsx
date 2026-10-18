import { primaryPartner } from '@/config/bookmakers'
import { goHref } from '@/lib/affiliate'
import { pct } from '@/lib/format'
import type { Pick } from '@/lib/model'
import type { Match } from '@/lib/types'
import { outcomeText, split100, type Verdict } from '@/lib/verdict'
import { AdMark } from '../AdMark'
import { CtaLink } from '../CtaLink'
import { VerdictRows } from './VerdictCard'

/**
 * «Прогноз» — отдельный блок под табло до начала матча (владелец: «блок матча супер некрасивый» — вынесли из табло; потом
 * «и блок прогноза вот вообще сейчас не нравится» — «да»): вывод словами одной строкой; под ним полоса шансов трёх исходов
 * (самый вероятный — белым, остальные серым) и подписи под ней — хозяева слева, ничья по центру, гости справа (строкой
 * «66% … 20% … 14%» на телефоне разваливалось на две); голы и падение кэфа (`VerdictRows`); под чертой — ставка одной
 * строкой: слева «Выгодная ставка» / «Наш выбор» и исход, справа крупно кэф и букмекер; ниже одна фраза вместо трёх строк
 * цифр («Честная цена — 1.51, PARI платит на 5,5% больше») и кнопка «Поставить в PARI» (кэф уже крупно рядом). Было:
 * «Явный фаворит — «X»» и тут же «Победа «X»» двумя заголовками, столбик «Честная цена / Кэф PARI / Выгода».
 */
export function PredictBlock({ m, v, pick, probs }: { m: Match; v: Verdict | null; pick: Pick | null; probs: { home: number; draw: number; away: number } | null }) {
  const n = probs ? split100(probs) : null
  const c = pick?.candidate
  const value = pick?.kind === 'value'
  const partner = c?.bestPartner?.partner ?? primaryPartner()
  const odd = c?.bestPartner?.value ?? null
  const x12 = c ? c.key === 'home' || c.key === 'draw' || c.key === 'away' : false
  const pctComma = (x: number) => `${Math.abs(x * 100).toFixed(1).replace('.', ',')}%`
  // одна фраза: шанс (если ставка не исход матча — исходы уже на полосе), честная цена и что с ней у букмекера
  const why = c
    ? [
        x12 ? null : `Шанс ${pct(c.prob)}`,
        `честная цена — ${c.fairOdd.toFixed(2)}`,
        odd == null
          ? null
          : value && c.ev != null && c.ev > 0
            ? `${partner.name} платит на ${pctComma(c.ev)} больше`
            : c.ev != null && c.ev < 0
              ? 'кэф ниже — выгоды нет'
              : 'кэф около неё',
      ]
        .filter(Boolean)
        .join(', ')
    : ''
  const top = n ? (n.home >= n.draw && n.home >= n.away ? 'home' : n.away >= n.draw ? 'away' : 'draw') : null
  return (
    <div>
      {v ? <p className="text-[20px] font-bold leading-tight tracking-[-0.02em] sm:text-[22px]">{v.headline}</p> : null}
      {n ? (
        <div className="mt-4">
          <div className="flex h-1.5 gap-0.5" aria-hidden>
            {(['home', 'draw', 'away'] as const).map((k, i) => (
              <div
                key={k}
                className={`h-full ${i === 0 ? 'rounded-l-full' : ''} ${i === 2 ? 'rounded-r-full' : ''} ${k === top ? 'bg-white/85' : 'bg-white/25'}`}
                style={{ width: `${n[k]}%` }}
              />
            ))}
          </div>
          {/* процент — строкой, название — под ним (до двух строк): в одну строку «57% Атлетико / Мадрид» рвалось на три */}
          <div className="mt-2 grid grid-cols-3 gap-2 text-dim">
            {(['home', 'draw', 'away'] as const).map((k) => (
              <div key={k} className={`min-w-0 ${k === 'draw' ? 'text-center' : k === 'away' ? 'text-right' : ''}`}>
                <div className={`num text-[15px] font-semibold ${top === k ? 'text-fg' : ''}`}>{n[k]}%</div>
                <div className="line-clamp-2 break-words text-[13px] leading-snug">{k === 'home' ? m.home.name : k === 'away' ? m.away.name : 'Ничья'}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {v ? <VerdictRows v={v} className="mt-4" /> : null}
      {c ? (
        <div className="mt-5 border-t border-edge pt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className={`text-[13px] font-semibold ${value ? 'text-good' : 'text-dim'}`}>{value ? 'Выгодная ставка' : 'Наш выбор'}</p>
              {/* исход словами вместо «П1» */}
              <p className="mt-1 text-[18px] font-bold leading-tight tracking-[-0.02em] first-letter:uppercase">{outcomeText(c.key, m)}</p>
            </div>
            {odd != null ? (
              <div className="shrink-0 text-right">
                <div className={`num text-[30px] font-semibold leading-none tracking-[-0.03em] ${value ? 'text-good' : ''}`}>{odd.toFixed(2)}</div>
                <div className="mt-1 text-[13px] text-dim">{partner.name}</div>
              </div>
            ) : null}
          </div>
          <p className="mt-3 text-[14px] leading-snug text-dim first-letter:uppercase">{why}.</p>
          {/* #pick-cta — по нему нижняя плашка на телефоне прячется, пока эта кнопка на экране (`StickyCta`) */}
          <div id="pick-cta" className="mt-4 sm:max-w-sm">
            <CtaLink href={goHref(partner, 'pick', m.id)} size="lg" className="w-full">
              {odd != null ? `Поставить в ${partner.name}` : `Сделать ставку в ${partner.name}`}
            </CtaLink>
            <AdMark partner={partner} className="mt-2 text-center" />
          </div>
        </div>
      ) : null}
    </div>
  )
}
