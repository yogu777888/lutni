import { getPartner } from '@/config/bookmakers'
import { goHref, SPONSORED_REL } from '@/lib/affiliate'
import type { FeedItem } from '@/lib/data'
import { formatTime } from '@/lib/format'
import { matchHref } from '@/lib/links'
import { outcomeText } from '@/lib/verdict'
import { edgeTone, Flaps } from './Flaps'
import { StoryLink } from './story/StoryLink'

const edge = (ev: number) => `${ev >= 0 ? '+' : '−'}${Math.abs(ev * 100).toFixed(1).replace('.', ',')}%`

/** Метка-чип в карточке, как у reg.ru: турнир, время. */
const Chip = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex h-6 items-center rounded-full border border-white/15 px-2.5 text-[12px] text-dim">{children}</span>
)

/**
 * «Выгодно сегодня» — тёмная графитовая плита на голубом фоне (ритм страницы плитами, как у reg.ru — выбрал
 * владелец): заголовок с лаймовым словом, карточки ставок, где легальный букмекер платит больше честной цены рынка.
 * В карточке — чипы (турнир, время), матч, исход словами, крупный кэф на флапах, «стоит» и выгода, переход к букмекеру.
 */
export function ValueBoard({ items }: { items: FeedItem[] }) {
  if (!items.length) return null
  return (
    <section className="on-dark mt-14 rounded-slab bg-[#11161d] px-4 py-8 sm:mt-20 sm:px-10 sm:py-12">
      <div className="mx-auto max-w-[44rem] text-center">
        <h2 className="h2 text-[32px] sm:text-[48px]">
          <span className="text-acid">Выгодно</span> сегодня
        </h2>
        <p className="mt-4 text-[16px] text-dim sm:text-[17px]">
          Где легальный букмекер платит больше, чем стоит исход: сравниваем его коэффициент с{' '}
          <span className="font-semibold text-fg">честной ценой</span> мирового рынка без маржи.
        </p>
      </div>

      <div className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {items.map(({ match: m, summary }, i) => {
          const p = summary!.pick!
          const partner = p.partnerSlug ? getPartner(p.partnerSlug) : undefined
          const odd = p.odd ? p.odd.toFixed(2) : '—'
          return (
            <article key={m.id} className="flex flex-col rounded-card bg-white/[0.05] p-5 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)] sm:p-6">
              <div className="flex flex-wrap gap-1.5">
                <Chip>{m.league.name}</Chip>
                <Chip>{formatTime(m.ts)}</Chip>
              </div>
              <StoryLink id={m.id} href={matchHref(m)} className="mt-4 text-[19px] font-bold leading-snug tracking-[-0.02em] transition-colors hover:text-acid">
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
                  className="mt-5 inline-flex h-11 items-center justify-between rounded-ctl bg-btn px-4 text-[15px] font-semibold text-btn-ink transition-colors hover:bg-btn-hover"
                >
                  Перейти в {partner.name}
                  <span aria-hidden>→</span>
                </a>
              ) : null}
            </article>
          )
        })}
      </div>
      <p className="mt-6 text-center text-[12.5px] text-mute">
        Выгода — насколько букмекер платит больше, чем стоит исход: чем больше, тем ярче. Это оценка, а не гарантия. Ссылки на букмекеров — реклама · 18+
      </p>
    </section>
  )
}
