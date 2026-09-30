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
    <section className="card relative overflow-hidden p-4 ring-1 ring-acid/25 sm:p-5">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-acid/10 blur-3xl" aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-acid">
            Прогноз tag.bet{pick.kind === 'value' ? ' · value' : ''}
          </div>
          <div className="mt-1 font-display text-3xl font-bold tracking-tight">{c.label}</div>
          <p className="mt-1 text-sm text-dim first-letter:uppercase">{describePick(c, match)}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Stars value={pick.confidence} />
          <span className="text-[11px] text-mute">уверенность</span>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-panel-2 px-2 py-2.5">
          <dt className="text-[11px] text-dim">Вероятность</dt>
          <dd className="num mt-0.5 text-lg font-bold">{pct(c.prob)}</dd>
        </div>
        <div className="rounded-xl bg-panel-2 px-2 py-2.5">
          <dt className="text-[11px] text-dim">Справедливый кэф</dt>
          <dd className="num mt-0.5 text-lg font-bold">{c.fairOdd.toFixed(2)}</dd>
        </div>
        <div className="rounded-xl bg-panel-2 px-2 py-2.5">
          <dt className="text-[11px] text-dim">Перевес</dt>
          <dd className={`num mt-0.5 text-lg font-bold ${ev != null && ev > 0 ? 'text-acid' : 'text-dim'}`}>
            {ev != null ? signedPct(ev) : '—'}
          </dd>
        </div>
      </dl>
      <div className="mt-4">
        <CtaLink href={goHref(partner, 'pick', match.id)} className="w-full py-3 text-[15px]">
          {c.bestPartner && offer
            ? `Поставить ${c.label} за ${offer.value.toFixed(2)} в БК ${partner.name}`
            : `Сделать ставку в БК ${partner.name}`}
        </CtaLink>
        <AdMark partner={partner} className="mt-1.5 text-center" />
      </div>
      {offer && !c.bestPartner ? (
        <p className="mt-2 text-center text-[11px] text-mute">
          Лучший коэффициент на рынке — {offer.value.toFixed(2)} ({offer.bookmakerName})
        </p>
      ) : null}
    </section>
  )
}
