import { primaryPartner } from '@/config/bookmakers'
import { goHref } from '@/lib/affiliate'
import { pct, signedPct } from '@/lib/format'
import type { Pick } from '@/lib/model'
import type { TagHit } from '@/lib/tags'
import type { Match } from '@/lib/types'
import { outcomeText, type Verdict } from '@/lib/verdict'
import { AdMark } from '../AdMark'
import { CtaLink } from '../CtaLink'
import { TagPill } from '../TagPill'

/** Иконки строк: тонкая линия, как в виджетах сводки. */
const ICON = {
  chances: (
    <>
      <path d="M12 3v18M5 7h14" />
      <path d="m5 7-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z" />
    </>
  ),
  goals: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m12 7 4.3 3.1-1.6 5H9.3l-1.6-5z" />
    </>
  ),
  money: (
    <>
      <path d="m22 17-8.5-8.5-5 5L2 7" />
      <path d="M16 17h6v-6" />
    </>
  ),
  bet: (
    <>
      <path d="M19 5 5 19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </>
  ),
} as const

function Row({ icon, tone = 'text-dim', children }: { icon: keyof typeof ICON; tone?: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/[0.06] ${tone}`}>
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          {ICON[icon]}
        </svg>
      </span>
      <span className="min-w-0 pt-[3px]">{children}</span>
    </li>
  )
}

function Stat({ label, value, good = false }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="rounded-tile bg-white/[0.04] px-3 py-3">
      <dt className="text-[12px] text-dim">{label}</dt>
      <dd className={`num mt-1 whitespace-nowrap text-[22px] font-bold tracking-[-0.03em] sm:text-[26px] ${good ? 'text-good' : ''}`}>{value}</dd>
    </div>
  )
}

/** Ставка tag.bet: выгодная или наш выбор, шанс · честная цена · выгода и кнопка к букмекеру (общая у «Нашего вывода» и
 * первого блока «Прогноз tag.bet»). */
export function PickPanel({ pick, match, className = '' }: { pick: Pick; match: Match; className?: string }) {
  const c = pick.candidate
  const offer = c.bestPartner ?? c.best
  const partner = c.bestPartner?.partner ?? primaryPartner()
  const value = pick.kind === 'value'
  return (
    <div className={`rounded-tile bg-white/[0.04] p-4 sm:p-5 ${className}`}>
      <p className={`text-[13px] font-semibold ${value ? 'text-good' : 'text-dim'}`}>{value ? 'Выгодная ставка' : 'Наш выбор'}</p>
      {/* исход словами вместо «П1» */}
      <p className="mt-1 text-[22px] font-bold leading-tight tracking-[-0.02em] first-letter:uppercase sm:text-[26px]">{outcomeText(c.key, match)}</p>
      <p className="mt-1 text-[14px] text-dim">{value ? 'Букмекер платит за этот исход больше, чем он стоит' : 'Самый вероятный исход с нормальным кэфом'}</p>
      <dl className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="Шанс" value={pct(c.prob)} />
        <Stat label="Честная цена" value={c.fairOdd.toFixed(2)} />
        <Stat label="Выгода" value={c.ev != null ? signedPct(c.ev) : '—'} good={c.ev != null && c.ev > 0} />
      </dl>
      <div className="mt-4">
        <CtaLink href={goHref(partner, 'pick', match.id)} size="lg" className="w-full">
          {c.bestPartner && offer ? `Поставить за ${offer.value.toFixed(2)} в ${partner.name}` : `Сделать ставку в ${partner.name}`}
        </CtaLink>
        <AdMark partner={partner} className="mt-2 text-center" />
      </div>
    </div>
  )
}

/** Теги матча чипами: «В подборках: #выгодно #кэф упал…» (повод — в подсказке). */
export function TagsRow({ tags, className = '' }: { tags: TagHit[]; className?: string }) {
  if (!tags.length) return null
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="mr-1 text-[13px] text-mute">В подборках:</span>
      {tags.map((t) => (
        <TagPill key={t.slug} slug={t.slug} reason={t.reason} size="md" />
      ))}
    </div>
  )
}

/** Строки под выводом: голы и падение кэфа. */
export function VerdictRows({ v, className = '' }: { v: Verdict; className?: string }) {
  if (!v.goals && !v.drop) return null
  return (
    <ul className={`space-y-3 text-[15px] leading-snug text-chalk ${className}`}>
      {v.goals ? <Row icon="goals">{v.goals}</Row> : null}
      {v.drop ? (
        <Row icon="money" tone="text-hot">
          {v.drop}
        </Row>
      ) : null}
    </ul>
  )
}
