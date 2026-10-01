import { primaryPartner } from '@/config/bookmakers'
import { goHref } from '@/lib/affiliate'
import { pct, signedPct } from '@/lib/format'
import type { Pick } from '@/lib/model'
import { describePick } from '@/lib/preview'
import type { Match } from '@/lib/types'
import { AdMark } from '../AdMark'
import { CtaLink } from '../CtaLink'
import { Stars } from '../Stars'

export function PickCard({ pick, match }: { pick: Pick; match: Match }) {
  const c = pick.candidate
  const offer = c.bestPartner ?? c.best
  const partner = c.bestPartner?.partner ?? primaryPartner()
  const ev = c.ev
  return (
    <section className="card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[12px] font-medium text-acid">
            Прогноз tag.bet
            {pick.kind === 'value' ? <span className="rounded-full bg-acid/[0.12] px-2 py-0.5 text-[11px]">value</span> : null}
          </div>
          <div className="mt-2 text-[34px] font-semibold leading-none tracking-[-0.03em]">{c.label}</div>
          <p className="mt-2 text-[15px] text-dim first-letter:uppercase">{describePick(c, match)}</p>
        </div>
        <div className="flex flex-col items-end gap-1 pt-0.5">
          <Stars value={pick.confidence} />
          <span className="text-[11px] text-mute">уверенность</span>
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-panel-2 px-3 py-3">
          <dt className="text-[11px] text-mute">Вероятность</dt>
          <dd className="num mt-1 text-[19px] font-semibold tracking-tight">{pct(c.prob)}</dd>
        </div>
        <div className="rounded-2xl bg-panel-2 px-3 py-3">
          <dt className="text-[11px] text-mute">Справедливый кэф</dt>
          <dd className="num mt-1 text-[19px] font-semibold tracking-tight">{c.fairOdd.toFixed(2)}</dd>
        </div>
        <div className="rounded-2xl bg-panel-2 px-3 py-3">
          <dt className="text-[11px] text-mute">Перевес</dt>
          <dd className={`num mt-1 text-[19px] font-semibold tracking-tight ${ev != null && ev > 0 ? 'text-acid' : 'text-dim'}`}>
            {ev != null ? signedPct(ev) : '—'}
          </dd>
        </div>
      </dl>
      <div className="mt-5">
        <CtaLink href={goHref(partner, 'pick', match.id)} className="w-full py-3.5 text-[15px]">
          {c.bestPartner && offer
            ? `Поставить ${c.label} за ${offer.value.toFixed(2)} в БК ${partner.name}`
            : `Сделать ставку в БК ${partner.name}`}
        </CtaLink>
        <AdMark partner={partner} className="mt-2 text-center" />
      </div>
      {offer && !c.bestPartner ? (
        <p className="mt-2 text-center text-[11px] text-mute">
          Лучший коэффициент на рынке — {offer.value.toFixed(2)} ({offer.bookmakerName})
        </p>
      ) : null}
    </section>
  )
}
