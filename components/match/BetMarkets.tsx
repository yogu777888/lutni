import { PARTNERS, partnerForApiBookmaker, type Partner } from '@/config/bookmakers'
import { goHref, SPONSORED_REL } from '@/lib/affiliate'
import { pct, type BetMarket, type Rate } from '@/lib/bet-markets'
import { formatOdd } from '@/lib/format'
import { isValue, valueThreshold, type Candidate } from '@/lib/model'
import type { BookOdds, Quote } from '@/lib/odds'
import type { Match } from '@/lib/types'
import { PartnerBadge } from '../PartnerBadge'
import { Section } from '../Section'

const TITLE: Record<BetMarket['key'], string> = { x12: 'Исход матча', goals: 'Голы в матче', btts: 'Обе забьют?' }

const quoteOf = (b: BookOdds, key: string): Quote | undefined => {
  if (key === 'home' || key === 'draw' || key === 'away') return b.x12?.[key]
  if (key === 'over2.5') return b.totals.find((t) => t.line === 2.5)?.over
  if (key === 'under2.5') return b.totals.find((t) => t.line === 2.5)?.under
  if (key === 'bttsYes') return b.btts?.yes
  if (key === 'bttsNo') return b.btts?.no
}

const label = (key: string, m: Match) =>
  ({
    home: `Победа «${m.home.name}»`,
    draw: 'Ничья',
    away: `Победа «${m.away.name}»`,
    'over2.5': '3 гола и больше',
    'under2.5': 'Не больше 2 голов',
    bttsYes: 'Обе забьют',
    bttsNo: 'Кто-то не забьёт',
  })[key] ?? key

/** Строка доли: подпись, процент, тонкая полоса; выборка — в подсказке («4 из 9»). */
function Stat({ name, r }: { name: string; r: Rate | null }) {
  return (
    <div className="mt-2" title={r ? `${r.hit} из ${r.of}` : 'мало данных'}>
      <div className="flex items-baseline justify-between gap-2 text-[13px]">
        <span className="text-dim">{name}</span>
        <span className={`num text-[14px] ${r ? 'font-semibold text-fg' : 'text-mute'}`}>{r ? `${pct(r)}%` : '—'}</span>
      </div>
      <div className="mt-1 h-1 rounded-full bg-white/[0.09]">
        {r ? <div className="h-full rounded-full bg-white/70" style={{ width: `${pct(r)}%` }} /> : null}
      </div>
    </div>
  )
}

/**
 * Вкладка «Ставки» — у каждого исхода своя плашка: как часто он был в прошлых матчах команд, как часто — в турнире за
 * сезон, и кэфы партнёров кнопками той же формы, что в подборках (знак букмекера и кэф в серой рамке; выгодный — лаймовой).
 * Вместо таблицы «Коэффициенты букмекеров». Только до начала матча.
 */
export function BetMarkets({
  match: m,
  markets,
  books,
  candidates,
  leagueN,
  leagueName,
  note,
}: {
  match: Match
  markets: BetMarket[]
  books: BookOdds[]
  candidates: Candidate[]
  /** сколько сыгранных матчей турнира в выборке «в лиге» (0 — её нет) */
  leagueN: number
  leagueName: string
  /** что добавить в пояснение под последним блоком (время кэфов) */
  note?: React.ReactNode
}) {
  const partners = books
    .map((b) => ({ b, p: partnerForApiBookmaker(b.bookmakerId, b.bookmakerName) }))
    .filter((x): x is { b: BookOdds; p: Partner } => Boolean(x.p))
    .sort((a, b) => PARTNERS.indexOf(a.p) - PARTNERS.indexOf(b.p))
  const prob = new Map(candidates.map((c) => [c.key, c.prob]))
  const valueKeys = new Set(candidates.filter(isValue).map((c) => c.key))
  const shown = markets.filter((mk) => mk.outcomes.some((o) => o.past || o.league || partners.some(({ b }) => quoteOf(b, o.key))))

  const button = (p: Partner, q: Quote, key: string) => {
    const pr = prob.get(key)
    const val = !!(pr && valueKeys.has(key) && pr * q.value - 1 >= valueThreshold(q.value))
    const tip = `${label(key, m)}: ${formatOdd(q.value)} в ${p.name}${val && pr ? ` · выше честной цены ${(1 / pr).toFixed(2)}` : ''} · Реклама 18+`
    return (
      <a
        key={p.slug}
        href={goHref(p, 'bet-market', m.id)}
        target="_blank"
        rel={SPONSORED_REL}
        title={tip}
        aria-label={`${label(key, m)}: ${formatOdd(q.value)} в ${p.name}`}
        className="group/odd flex h-11 w-[108px] items-center gap-2 transition-transform duration-150 active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100 @2xl:w-auto @2xl:flex-1"
      >
        <PartnerBadge partner={p} size={36} />
        <span
          className={`flex h-full flex-1 rounded-tile p-1 transition-colors duration-150 ${
            val ? 'bg-acid' : 'bg-white/10 group-hover/odd:bg-fg group-focus-visible/odd:bg-fg'
          }`}
        >
          <span
            className={`num grid flex-1 place-items-center rounded-lg bg-panel text-[17px] font-bold text-fg transition-colors duration-150 group-hover/odd:text-ink group-focus-visible/odd:text-ink ${
              val ? 'group-hover/odd:bg-acid group-focus-visible/odd:bg-acid' : 'group-hover/odd:bg-fg group-focus-visible/odd:bg-fg'
            }`}
          >
            {formatOdd(q.value)}
          </span>
        </span>
      </a>
    )
  }

  const names = [...new Set(partners.map(({ p }) => p.name))].join(', ')
  const past = (k: BetMarket['key']) =>
    k === 'x12'
      ? `«${m.home.name}» дома и «${m.away.name}» в гостях, до 10 последних игр каждой`
      : 'до 10 последних игр каждой команды, где бы ни играли'

  return (
    <>
      {shown.map((mk, i) => (
        <Section
          key={mk.key}
          outside
          title={TITLE[mk.key]}
          aside={names ? `${names} · Реклама · 18+` : undefined}
          note={
            <>
              Прошлые матчи — {past(mk.key)}.{leagueN ? ` В лиге — ${leagueN} сыгранных матчей турнира «${leagueName}» в этом сезоне.` : ''}{' '}
              Это частота в прошлом, а не прогноз.
              {i === shown.length - 1 ? (
                <>
                  {' '}
                  {note}Лаймом — кэф выше честной цены. Кэфы меняются — проверяйте у букмекера. Ставки — это риск · 18+.
                </>
              ) : null}
            </>
          }
          className="!p-2"
        >
          {/* плашка на исход: узкий блок — строкой (доли слева, кнопки справа столбиком), широкий — колонками */}
          <div className="@container">
            <ul className={`grid gap-2 ${mk.outcomes.length === 3 ? '@2xl:grid-cols-3' : '@2xl:grid-cols-2'}`}>
              {mk.outcomes.map((o) => {
                const qs = partners.map(({ b, p }) => ({ p, q: quoteOf(b, o.key) })).filter((x): x is { p: Partner; q: Quote } => Boolean(x.q))
                return (
                  <li key={o.key} className="flex gap-4 rounded-tile bg-white/[0.04] p-4 @2xl:flex-col">
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[15px] font-semibold leading-tight">{label(o.key, m)}</p>
                      <Stat name="Прошлые матчи" r={o.past} />
                      {leagueN ? <Stat name="В лиге" r={o.league} /> : null}
                    </div>
                    <div className="flex shrink-0 flex-col justify-center gap-2 @2xl:flex-row">
                      {qs.length ? qs.map(({ p, q }) => button(p, q, o.key)) : <span className="text-[13px] text-mute">Кэфов нет</span>}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </Section>
      ))}
    </>
  )
}
