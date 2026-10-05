import { getPartner } from '@/config/bookmakers'
import { goHref, SPONSORED_REL } from '@/lib/affiliate'
import type { FeedItem } from '@/lib/data'
import { formatTime } from '@/lib/format'
import { matchHref } from '@/lib/links'
import { outcomeText } from '@/lib/verdict'
import { edgeTone, Flaps } from './Flaps'
import { StoryLink } from './story/StoryLink'

const edge = (ev: number) => `${ev >= 0 ? '+' : '−'}${Math.abs(ev * 100).toFixed(1).replace('.', ',')}%`

const COLS = 'sm:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_repeat(3,minmax(0,0.8fr))]'

/**
 * «Табло перевеса» — главный экран tag.bet: где легальный букмекер платит больше
 * честной цены рынка. Цифры — на перекидных флапах, перевес горит лаймом.
 */
export function ValueBoard({ items }: { items: FeedItem[] }) {
  if (!items.length) return null
  return (
    <section className="mt-16 sm:mt-20">
      <p className="eyebrow">Выгодные ставки</p>
      <h2 className="h2 mt-3 max-w-[20ch] text-[30px] sm:text-[44px]">Где букмекер платит больше, чем стоит исход</h2>
      <p className="mt-4 max-w-[58ch] text-[16px] text-dim sm:text-[17px]">
        Сравниваем коэффициент легального букмекера с <span className="font-semibold text-fg">честной ценой</span> мирового рынка без маржи. Когда
        платят больше — цифра загорается.
      </p>

      <div className="card mt-8 overflow-hidden shadow-[0_40px_80px_-40px_#000]">
        <div className={`hidden items-center gap-4 border-b border-edge px-6 py-3.5 text-[11px] uppercase tracking-[0.14em] text-mute sm:grid ${COLS}`}>
          <span>Матч</span>
          <span>Ставка</span>
          <span className="text-right">Платят</span>
          <span className="text-right">Стоит</span>
          <span className="text-right">Выгода</span>
        </div>
        {items.map(({ match: m, summary }, i) => {
          const p = summary!.pick!
          const partner = p.partnerSlug ? getPartner(p.partnerSlug) : undefined
          const odd = p.odd ? p.odd.toFixed(2) : '—'
          const cell = (label: string, children: React.ReactNode) => (
            <div className="min-w-0 sm:text-right">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.12em] text-mute sm:hidden">{label}</span>
              {children}
            </div>
          )
          return (
            <div
              key={m.id}
              className={`grid grid-cols-3 gap-x-4 gap-y-3 border-b border-edge px-4 py-4 transition-colors last:border-b-0 hover:bg-white/[0.02] sm:items-center sm:px-6 ${COLS}`}
            >
              <div className="col-span-3 min-w-0 sm:col-span-1">
                <StoryLink id={m.id} href={matchHref(m)} className="block truncate text-[16px] font-semibold transition-colors hover:text-acid">
                  {m.home.name} — {m.away.name}
                </StoryLink>
                <span className="text-[12px] text-mute">
                  {m.league.name} · {formatTime(m.ts)}
                </span>
              </div>
              {/* исход словами: «победа «X»», «3 гола и больше» — вместо «П1», «ТБ 2.5» */}
              <div className="col-span-3 -mt-1 text-[14px] leading-snug text-chalk first-letter:uppercase sm:col-span-1 sm:mt-0">{outcomeText(p.key, m)}</div>
              {cell(
                'Платят',
                partner && p.odd ? (
                  <a href={goHref(partner, 'value', m.id)} target="_blank" rel={SPONSORED_REL} className="group inline-flex flex-col sm:items-end" title={`Поставить в БК ${partner.name}`}>
                    <Flaps text={odd} className="text-[17px] sm:text-[19px]" start={i * 3} />
                    <span className="mt-1 text-[11px] text-mute transition-colors group-hover:text-fg">{partner.name} →</span>
                  </a>
                ) : (
                  <Flaps text={odd} className="text-[17px] sm:text-[19px]" start={i * 3} />
                ),
              )}
              {cell('Стоит', <Flaps text={(1 / p.prob).toFixed(2)} className="text-[17px] sm:text-[19px]" start={i * 3 + 2} />)}
              {cell('Выгода', <Flaps text={edge(p.ev ?? 0)} tone={edgeTone(p.ev ?? 0)} className="text-[17px] sm:text-[19px]" start={i * 3 + 4} />)}
            </div>
          )
        })}
        <div className="flex flex-wrap justify-between gap-2 border-t border-edge bg-black/[0.18] px-4 py-3 text-[12px] text-mute sm:px-6">
          <span>Выгода — насколько букмекер платит больше, чем стоит исход: чем больше, тем ярче. Это оценка, а не гарантия.</span>
          <span>Ссылки на букмекеров — реклама · 18+</span>
        </div>
      </div>
    </section>
  )
}
