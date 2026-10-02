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
    <section className="card p-5 sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow flex items-center gap-2">
            Прогноз tag.bet
            {pick.kind === 'value' ? <span className="rounded-full bg-acid px-2 py-0.5 text-[10px] tracking-[0.08em] text-acid-ink">value</span> : null}
          </div>
          <div className="display mt-3 text-[48px] sm:text-[64px]">{c.label}</div>
          <p className="mt-2 text-[16px] text-dim first-letter:uppercase">{describePick(c, match)}</p>
        </div>
        <div className="flex flex-col items-end gap-1 pt-0.5">
          <Stars value={pick.confidence} />
          <span className="text-[11px] text-mute">уверенность</span>
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-edge bg-panel-2 px-3 py-3.5">
          <dt className="text-[12px] text-dim">Вероятность</dt>
          <dd className="num mt-1 text-[24px] font-extrabold tracking-[-0.03em] sm:text-[30px]">{pct(c.prob)}</dd>
        </div>
        <div className="rounded-xl border border-edge bg-panel-2 px-3 py-3.5">
          <dt className="text-[12px] text-dim">Честный кэф</dt>
          <dd className="num mt-1 text-[24px] font-extrabold tracking-[-0.03em] sm:text-[30px]">{c.fairOdd.toFixed(2)}</dd>
        </div>
        <div className="rounded-xl border border-edge bg-panel-2 px-3 py-3.5">
          <dt className="text-[12px] text-dim">Перевес</dt>
          <dd className={`num mt-1 text-[24px] font-extrabold tracking-[-0.03em] sm:text-[30px] ${ev != null && ev > 0 ? 'text-acid' : 'text-dim'}`}>
            {ev != null ? signedPct(ev) : '—'}
          </dd>
        </div>
      </dl>
      <div className="mt-5">
        <CtaLink href={goHref(partner, 'pick', match.id)} size="lg" className="w-full">
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
