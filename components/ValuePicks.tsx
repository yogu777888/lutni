import { getPartner } from '@/config/bookmakers'
import { goHref } from '@/lib/affiliate'
import type { FeedItem } from '@/lib/data'
import { formatTime, pct } from '@/lib/format'
import { matchHref } from '@/lib/links'
import { CtaLink } from './CtaLink'
import { Section } from './Section'
import { StoryLink } from './story/StoryLink'

export function ValuePicks({ items, title = 'Value дня' }: { items: FeedItem[]; title?: string }) {
  if (!items.length) return null
  return (
    <Section title={title} aside="коэффициент выше справедливого">
      <div className="grid gap-2.5 sm:grid-cols-2">
        {items.map(({ match: m, summary }) => {
          const p = summary!.pick!
          const partner = p.partnerSlug ? getPartner(p.partnerSlug) : undefined
          return (
            <div key={m.id} className="flex flex-col rounded-xl bg-panel-2 p-3 ring-1 ring-inset ring-acid/25">
              <StoryLink id={m.id} href={matchHref(m)} className="text-[13px] font-semibold hover:text-acid">
                {m.home.name} — {m.away.name}
              </StoryLink>
              <div className="mt-0.5 text-[11px] text-dim">
                {formatTime(m.ts)} · {m.league.name}
              </div>
              <div className="mt-2.5 flex items-end justify-between gap-2">
                <div>
                  <div className="font-display text-lg font-bold leading-none">{p.label}</div>
                  <div className="mt-1 text-[11px] text-dim">
                    вероятность {pct(p.prob)} · <span className="font-bold text-acid">+{((p.ev ?? 0) * 100).toFixed(1)}%</span>
                  </div>
                </div>
                {partner && p.odd ? (
                  <CtaLink href={goHref(partner, 'value', m.id)} className="px-3 py-2">
                    <span className="num">{p.odd.toFixed(2)}</span>
                    <span className="text-[11px] font-semibold opacity-70">{partner.name}</span>
                  </CtaLink>
                ) : p.odd ? (
                  <span className="num rounded-lg bg-panel-3 px-3 py-2 text-sm font-bold">
                    {p.odd.toFixed(2)} <span className="text-[11px] text-dim">{p.bookmaker}</span>
                  </span>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </Section>
  )
}
