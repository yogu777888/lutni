import { primaryPartner } from '@/config/bookmakers'
import { goHref } from '@/lib/affiliate'
import { pct, signedPct } from '@/lib/format'
import type { Pick } from '@/lib/model'
import type { Match } from '@/lib/types'
import { outcomeText, split100, type Verdict } from '@/lib/verdict'
import { AdMark } from '../AdMark'
import { CtaLink } from '../CtaLink'
import { VerdictRows } from './VerdictCard'

/**
 * «Прогноз tag.bet» — отдельный блок под табло до начала матча (владелец: «блок матча супер некрасивый» — «да»): раньше
 * прогноз жил внутри табло — плашка ставки в карточке и три плитки в плашке (коробка в коробке в коробке), «Явный
 * фаворит — «X»» и тут же «Победа «X»», 66% строкой и плиткой «Шанс», чипы «#выгодно» с решёткой; табло на телефоне
 * было ~800px. Теперь: вывод словами, шансы исходов строкой, голы и падение кэфа, ниже под чертой — ставка строками
 * «название — значение», как остальные блоки, и кнопка к букмекеру. Шанс ставки — строкой, только если это не исход
 * матча (исходы уже в строке шансов выше).
 */
export function PredictBlock({ m, v, pick, probs }: { m: Match; v: Verdict | null; pick: Pick | null; probs: { home: number; draw: number; away: number } | null }) {
  const n = probs ? split100(probs) : null
  const c = pick?.candidate
  const value = pick?.kind === 'value'
  const partner = c?.bestPartner?.partner ?? primaryPartner()
  const x12 = c ? c.key === 'home' || c.key === 'draw' || c.key === 'away' : false
  const rows: { k: string; v: string; good?: boolean }[] = c
    ? [
        ...(x12 ? [] : [{ k: 'Шанс', v: pct(c.prob) }]),
        { k: 'Честная цена', v: c.fairOdd.toFixed(2) },
        ...(c.bestPartner ? [{ k: `Кэф ${partner.name}`, v: c.bestPartner.value.toFixed(2) }] : []),
        ...(value && c.ev != null ? [{ k: 'Выгода', v: signedPct(c.ev), good: c.ev > 0 }] : []),
      ]
    : []
  const note = value
    ? 'Букмекер платит за этот исход больше, чем он стоит по нашей оценке.'
    : c?.ev != null && c.ev < 0
      ? 'Самый вероятный исход, но кэф ниже честной цены — выгоды нет.'
      : 'Самый вероятный исход, кэф — около честной цены.'
  return (
    <div>
      {v ? <p className="text-[22px] font-bold leading-tight tracking-[-0.02em] sm:text-[26px]">{v.headline}</p> : null}
      {n ? (
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[15px] text-dim">
          <span>
            <b className="num font-semibold text-fg">{n.home}%</b> {m.home.name}
          </span>
          <span>
            <b className="num font-semibold text-fg">{n.draw}%</b> ничья
          </span>
          <span>
            <b className="num font-semibold text-fg">{n.away}%</b> {m.away.name}
          </span>
        </p>
      ) : null}
      {v ? <VerdictRows v={v} className="mt-4" /> : null}
      {c ? (
        <div className="mt-5 border-t border-edge pt-5">
          <p className={`text-[13px] font-semibold ${value ? 'text-good' : 'text-dim'}`}>{value ? 'Выгодная ставка' : 'Наш выбор'}</p>
          {/* исход словами вместо «П1» */}
          <p className="mt-1 text-[20px] font-bold leading-tight tracking-[-0.02em] first-letter:uppercase">{outcomeText(c.key, m)}</p>
          <p className="mt-1 text-[14px] text-dim">{note}</p>
          <dl className="mt-3">
            {rows.map((r) => (
              <div key={r.k} className="flex min-h-11 items-center justify-between gap-4 border-t border-edge py-1.5 text-[16px]">
                <dt className="text-[14px] text-dim">{r.k}</dt>
                <dd className={`num font-semibold ${r.good ? 'text-good' : ''}`}>{r.v}</dd>
              </div>
            ))}
          </dl>
          {/* #pick-cta — по нему нижняя плашка на телефоне прячется, пока эта кнопка на экране (`StickyCta`) */}
          <div id="pick-cta" className="mt-3 sm:max-w-sm">
            <CtaLink href={goHref(partner, 'pick', m.id)} size="lg" className="w-full">
              {c.bestPartner ? `Поставить за ${c.bestPartner.value.toFixed(2)} в ${partner.name}` : `Сделать ставку в ${partner.name}`}
            </CtaLink>
            <AdMark partner={partner} className="mt-2 text-center" />
          </div>
        </div>
      ) : null}
    </div>
  )
}
