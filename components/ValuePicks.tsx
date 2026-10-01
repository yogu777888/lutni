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
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map(({ match: m, summary }) => {
          const p = summary!.pick!
          const partner = p.partnerSlug ? getPartner(p.partnerSlug) : undefined
          return (
            <div key={m.id} className="flex flex-col rounded-2xl bg-panel-2 p-4">
              <StoryLink id={m.id} href={matchHref(m)} className="truncate text-[14px] font-medium transition-opacity hover:opacity-75">
                {m.home.name} — {m.away.name}
              </StoryLink>
              <div className="mt-0.5 truncate text-[12px] text-mute">
                {formatTime(m.ts)} · {m.league.name}
              </div>
              <div className="mt-3 flex items-end justify-between gap-2">
                <div>
                  <div className="text-[20px] font-semibold leading-none tracking-tight">{p.label}</div>
                  <div className="mt-1.5 text-[12px] text-dim">
                    {pct(p.prob)} · <span className="font-medium text-acid">+{((p.ev ?? 0) * 100).toFixed(1)}%</span>
                  </div>
                </div>
                {partner && p.odd ? (
                  <CtaLink href={goHref(partner, 'value', m.id)} variant="secondary" className="px-3.5 py-2">
                    <span className="num">{p.odd.toFixed(2)}</span>
                    <span className="text-[12px] font-normal text-dim">{partner.name}</span>
                  </CtaLink>
                ) : p.odd ? (
                  <span className="num rounded-full bg-white/[0.06] px-3.5 py-2 text-sm font-semibold">
                    {p.odd.toFixed(2)} <span className="text-[12px] font-normal text-dim">{p.bookmaker}</span>
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
