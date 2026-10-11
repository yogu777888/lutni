import { getPartner } from '@/config/bookmakers'
import { goHref, SPONSORED_REL } from '@/lib/affiliate'
import type { FeedItem } from '@/lib/data'
import { formatTime } from '@/lib/format'
import { matchHref } from '@/lib/links'
import { outcomeText } from '@/lib/verdict'
import { edgeTone, Flaps } from './Flaps'
import { SHELF_CARD, Shelf } from './Shelf'
import { StoryLink } from './story/StoryLink'

const edge = (ev: number) => `${ev >= 0 ? '+' : '−'}${Math.abs(ev * 100).toFixed(1).replace('.', ',')}%`

/** Метка-чип в карточке: турнир, время. */
const Chip = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex h-6 max-w-full items-center truncate rounded-full border border-white/15 px-2.5 text-[12px] text-dim">{children}</span>
)

/**
 * «Выгодно сегодня» — полка, как у Spotify (`Shelf`): ставки, где легальный букмекер платит больше честной цены
 * рынка. В карточке — чипы (турнир, время), матч, исход словами, крупный кэф на флапах, «стоит» и выгода, белая
 * кнопка к букмекеру (лайм на экране — только у «выгодно» и «Бонуса»). «Показать все» — страница тега.
 */
export function ValueBoard({ items }: { items: FeedItem[] }) {
  if (!items.length) return null
  return (
    <Shelf
      title={
        <>
          <span className="text-acid">Выгодно</span> сегодня
        </>
      }
      more={{ href: '/tag/value' }}
      note="Выгода — насколько букмекер платит больше, чем стоит исход (честная цена — по рынку без маржи). Это оценка, а не гарантия. Ссылки на букмекеров — реклама · 18+"
    >
        {items.map(({ match: m, summary }, i) => {
          const p = summary!.pick!
          const partner = p.partnerSlug ? getPartner(p.partnerSlug) : undefined
          const odd = p.odd ? p.odd.toFixed(2) : '—'
          return (
            <article key={m.id} className={SHELF_CARD}>
              <div className="flex flex-wrap gap-1.5">
                <Chip>{m.league.name}</Chip>
                <Chip>{formatTime(m.ts)}</Chip>
              </div>
              <StoryLink id={m.id} href={matchHref(m)} className="mt-4 text-[18px] font-bold leading-snug tracking-[-0.02em] transition-colors hover:text-acid">
                {m.home.name} — {m.away.name}
              </StoryLink>
              {/* исход словами: «победа «X»», «3 гола и больше» — вместо «П1», «ТБ 2.5» */}
              <p className="mt-1.5 text-[15px] leading-snug text-dim first-letter:uppercase">{outcomeText(p.key, m)}</p>

              <div className="mt-auto flex items-end justify-between gap-3 pt-6">
                <div>
                  <span className="block text-[12px] text-mute">Платят{partner ? ` в ${partner.name}` : ''}</span>
                  <Flaps text={odd} className="mt-1 text-[26px] sm:text-[28px]" start={i * 3} />
                </div>
                <div className="text-right text-[13px] leading-relaxed text-dim">
                  <div>
                    стоит <span className="num font-semibold text-fg">{(1 / p.prob).toFixed(2)}</span>
                  </div>
                  <Flaps text={edge(p.ev ?? 0)} tone={edgeTone(p.ev ?? 0)} className="mt-1 text-[15px]" start={i * 3 + 2} />
                </div>
              </div>
              {partner && p.odd ? (
                <a
                  href={goHref(partner, 'value', m.id)}
                  target="_blank"
                  rel={SPONSORED_REL}
                  className="mt-5 inline-flex h-11 items-center justify-between rounded-ctl bg-white px-4 text-[15px] font-semibold text-ink transition-colors hover:bg-white/85"
                >
                  Перейти в {partner.name}
                  <span aria-hidden>→</span>
                </a>
              ) : null}
            </article>
          )
        })}
    </Shelf>
  )
}
