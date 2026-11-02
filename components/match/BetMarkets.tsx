import { PARTNERS, partnerForApiBookmaker, type Partner } from '@/config/bookmakers'
import { goHref, SPONSORED_REL } from '@/lib/affiliate'
import { pct, type BetMarket, type Rate } from '@/lib/bet-markets'
import { formatOdd, plural } from '@/lib/format'
import { isValue, valueThreshold, type Candidate } from '@/lib/model'
import type { BookOdds, Quote } from '@/lib/odds'
import type { Match } from '@/lib/types'
import { PartnerBadge } from '../PartnerBadge'
import { StorySymbol } from '../story/StorySymbol'
import { TeamLogo } from '../TeamLogo'
import { Section } from '../Section'

const TITLE: Record<BetMarket['key'], string> = { x12: 'Исход матча', goals: 'Голы в матче', btts: 'Обе забьют?' }

const quoteOf = (b: BookOdds, key: string): Quote | undefined => {
  if (key === 'home' || key === 'draw' || key === 'away') return b.x12?.[key]
  if (key === 'over2.5') return b.totals.find((t) => t.line === 2.5)?.over
  if (key === 'under2.5') return b.totals.find((t) => t.line === 2.5)?.under
  if (key === 'bttsYes') return b.btts?.yes
  if (key === 'bttsNo') return b.btts?.no
}

export const label = (key: string, m: Match) =>
  ({
    home: `Победа «${m.home.name}»`,
    draw: 'Ничья',
    away: `Победа «${m.away.name}»`,
    'over2.5': '3 гола и больше',
    'under2.5': 'Не больше 2 голов',
    bttsYes: 'Обе забьют',
    bttsNo: 'Кто-то не забьёт',
  })[key] ?? key

/** Значок исхода слева от названия: у победы — эмблема команды, у остальных — знак подборки той же темы, серым. */
export function OutcomeIcon({ k, m }: { k: string; m: Match }) {
  if (k === 'home' || k === 'away') {
    const t = k === 'home' ? m.home : m.away
    return <TeamLogo name={t.name} src={t.logo ?? null} size={22} />
  }
  const cls = 'size-[22px] shrink-0 text-dim'
  if (k === 'bttsNo')
    // перечёркнутый ноль — «кто-то останется без гола» (тот же знак, что «Матчи без забитых» в статистике)
    return (
      <svg viewBox="0 0 24 24" aria-hidden className={cls} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 4.5c3 0 4.5 3.4 4.5 7.5s-1.5 7.5-4.5 7.5S7.5 16.1 7.5 12S9 4.5 12 4.5M5 19L19 5" />
      </svg>
    )
  const sym = ({ draw: 'ravnye', 'over2.5': 'tb-2-5', 'under2.5': 'tm-2-5', bttsYes: 'obe-zabyut' } as Record<string, string>)[k]
  return sym ? <StorySymbol k={sym} tone="currentColor" className={cls} /> : null
}

/** Строка доли: подпись, процент, тонкая полоса; выборка — в подсказке («4 из 9»). */
function Stat({ name, tip, r }: { name: string; tip: string; r: Rate | null }) {
  return (
    <div className="mt-2" title={r ? `${tip}: ${r.hit} из ${r.of}` : `${tip}: мало данных`}>
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="min-w-0 leading-snug text-dim">{name}</span>
        <span className={`num shrink-0 text-[14px] ${r ? 'font-semibold text-fg' : 'text-mute'}`}>{r ? `${pct(r)}%` : '—'}</span>
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
  seasonName,
  note,
}: {
  match: Match
  markets: BetMarket[]
  books: BookOdds[]
  candidates: Candidate[]
  /** сколько сыгранных матчей турнира в выборке «в лиге» (0 — её нет) */
  leagueN: number
  leagueName: string
  /** «2026/27»; нет сезона — null */
  seasonName: string | null
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
  // подписи у полос — коротко, чьи матчи (владелец: «точнее … и короче»); подробно, какие именно, — в подсказке
  const teams = `«${m.home.name}» и «${m.away.name}»`
  const pastTip = (k: BetMarket['key'], low = false) =>
    (k === 'x12'
      ? `До 10 последних домашних матчей «${m.home.name}» и выездных «${m.away.name}»`
      : `До 10 последних матчей ${teams}`
    ).replace(/^Д/, low ? 'д' : 'Д')
  const leagueTip = `Сыгранные матчи турнира «${leagueName}» в сезоне${seasonName ? ` ${seasonName}` : ''}`

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
              Среднее у команд — {pastTip(mk.key, true)}.
              {leagueN ? ` Среднее в лиге — ${leagueN} ${plural(leagueN, ['матч', 'матча', 'матчей'])} турнира «${leagueName}» в сезоне${seasonName ? ` ${seasonName}` : ''}.` : ''}
              {i === shown.length - 1 ? (
                <>
                  {' '}
                  {note}Это прошлые матчи, а не прогноз. Лаймом — кэф выше честной цены. Ставки — это риск · 18+.
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
                      <p className="flex items-center gap-2 text-[15px] font-semibold leading-tight">
                        <OutcomeIcon k={o.key} m={m} />
                        <span className="line-clamp-2 min-w-0">{label(o.key, m)}</span>
                      </p>
                      <Stat name="Среднее у команд" tip={pastTip(mk.key)} r={o.past} />
                      {leagueN ? <Stat name="Среднее в лиге" tip={leagueTip} r={o.league} /> : null}
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
