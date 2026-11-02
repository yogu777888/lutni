import { PARTNERS, partnerForApiBookmaker, type Partner } from '@/config/bookmakers'
import { goHref, SPONSORED_REL } from '@/lib/affiliate'
import { pct, type BetMarket } from '@/lib/bet-markets'
import { formatOdd } from '@/lib/format'
import { isValue, valueThreshold, type Candidate } from '@/lib/model'
import type { BookOdds, Quote } from '@/lib/odds'
import type { Match } from '@/lib/types'
import { PartnerBadge } from '../PartnerBadge'
import { ShadowSymbol } from '../story/StorySymbol'
import { DARK_PLATE } from '@/lib/crest-geo'
import { CrestPlate } from '../CrestPlate'
import { ClubVars } from './ClubVars'
import { ymdInTz } from '@/lib/format'
import { Section } from '../Section'

const TITLE: Record<BetMarket['key'], string> = { x12: 'Кто выиграет?', goals: 'Сколько голов?', btts: 'Обе забьют?' }

/** короткие названия в строке витрины: вопрос — в заголовке карточки */
const SHORT: Record<string, (m: Match) => string> = {
  home: (m) => m.home.name,
  draw: () => 'Ничья',
  away: (m) => m.away.name,
  'over2.5': () => '3 гола и больше',
  'under2.5': () => 'Не больше 2',
  bttsYes: () => 'Да',
  bttsNo: () => 'Нет',
}

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

/** Значок исхода — скруглённым квадратом, как иконка приложения в iOS: у победы — эмблема команды, у остальных —
 * знак подборки той же темы белым; подложка — графит на тон светлее плашки, длинная тень — темнее её (владелец: светлая «не сочетается с карточкой»; до того — «с текстом сливается»).
 * В плашке «Ставок» — 40px слева от названия (`big`), в строках «Разбора исходов» — 32px слева. */
export function OutcomeIcon({ k, m, big = false }: { k: string; m: Match; big?: boolean }) {
  const size = big ? 40 : 32
  const shape = big ? 'rounded-ctl' : 'rounded-lg'
  if (k === 'home' || k === 'away') {
    const t = k === 'home' ? m.home : m.away
    return <CrestPlate name={t.name} logo={t.logo} size={size} crest={0.66} shape={shape} dark />
  }
  const sym = ({ draw: 'ravnye', 'over2.5': 'tb-2-5', 'under2.5': 'tm-2-5', bttsYes: 'obe-zabyut', bttsNo: 'kto-ne-zabyot' } as Record<string, string>)[k]
  return sym ? (
    <span aria-hidden className={`grid shrink-0 place-items-center overflow-hidden ${shape}`} style={{ width: size, height: size, background: DARK_PLATE }}>
      <ShadowSymbol k={sym} dark className={big ? 'size-6' : 'size-[18px]'} />
    </span>
  ) : null
}

/**
 * Вкладка «Ставки» — витрина: карточка на рынок (исход, голы, «обе забьют»), строка на исход — значок, название, шанс по
 * кэфам без маржи и кэфы партнёров кнопками; доли прошлых матчей — в подсказке строки. Только до начала матча.
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

  // кнопка кэфа — компактная, как в правой панели (92×36): в строке витрины рядом с названием и шансом
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
        className="group/odd flex h-9 w-[92px] items-center gap-1.5 transition-transform duration-150 active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        <PartnerBadge partner={p} size={28} />
        <span
          className={`flex h-full flex-1 rounded-ctl p-[3px] transition-colors duration-150 ${
            val ? 'bg-acid' : 'bg-white/10 group-hover/odd:bg-fg group-focus-visible/odd:bg-fg'
          }`}
        >
          <span
            className={`num grid flex-1 place-items-center rounded-md bg-panel text-[15px] font-bold text-fg transition-colors duration-150 group-hover/odd:text-ink group-focus-visible/odd:text-ink ${
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
  const teams = `«${m.home.name}» и «${m.away.name}»`
  const pastTip = (k: BetMarket['key']) =>
    k === 'x12' ? `в последних домашних матчах «${m.home.name}» и выездных «${m.away.name}»` : `в последних матчах ${teams}`
  const leagueTip = `в турнире «${leagueName}»${seasonName ? ` за сезон ${seasonName}` : ''}`

  return (
    <Section
      outside
      title="Ставки на матч"
      aside={names ? `${names} · Реклама · 18+` : undefined}
      note={
        <>
          Шанс — по кэфам букмекеров без маржи. {note}Лаймом — кэф
          выше честной цены. Ставки — это риск · 18+.
        </>
      }
      className="!p-2"
    >
      {/* витрина, как у Polymarket (владелец: «из карточек просто витрину … чтоб сразу было видно у какой ставки больше
          шанс … все карточки одинаковыми формами»): карточка на рынок, строка на исход — значок, название, шанс, кэфы */}
      <ClubVars id={m.id} ymd={ymdInTz(m.ts)} className="@container">
        <div className="grid gap-2 @[60rem]:grid-cols-3">
          {shown.map((mk) => {
            const top = mk.outcomes.reduce<string | null>((best, o) => {
              const pr = prob.get(o.key)
              if (pr == null) return best
              return best == null || pr > (prob.get(best) ?? 0) ? o.key : best
            }, null)
            const topP = top ? prob.get(top)! : 0
            // почти поровну (50 на 50) — без выделения
            const lead = top && mk.outcomes.every((x) => x.key === top || (prob.get(x.key) ?? 0) <= topP - 0.02) ? top : null
            return (
              <section key={mk.key} className="@container/card flex flex-col rounded-tile bg-white/[0.04] p-2">
                <h3 className="px-2 pb-2 pt-1.5 text-[16px] font-semibold">{TITLE[mk.key]}</h3>
                <ul className="space-y-1">
                  {mk.outcomes.map((o) => {
                    const pr = prob.get(o.key)
                    const isTop = o.key === lead
                    // свет цветом клуба — только у самого вероятного исхода, и только у победы (владелец: «если победа эльче
                    // не топ по шансу то убери градиент»)
                    const club = isTop ? (o.key === 'home' ? 'var(--club-h)' : o.key === 'away' ? 'var(--club-a)' : null) : null
                    const qs = partners.map(({ b, p }) => ({ p, q: quoteOf(b, o.key) })).filter((x): x is { p: Partner; q: Quote } => Boolean(x.q))
                    const facts = [
                      o.past ? `${pct(o.past)}% ${pastTip(mk.key)} (${o.past.hit} из ${o.past.of})` : null,
                      leagueN && o.league ? `${pct(o.league)}% ${leagueTip} (${o.league.hit} из ${o.league.of})` : null,
                    ].filter(Boolean)
                    return (
                      <li
                        key={o.key}
                        title={facts.length ? `${label(o.key, m)}: ${facts.join('; ')}` : undefined}
                        className={`flex min-h-[60px] flex-wrap items-center gap-x-3 gap-y-2 rounded-ctl px-2 py-2 ${isTop ? 'bg-white/[0.05] ring-1 ring-inset ring-white/12' : ''}`}
                        style={club ? { backgroundImage: `radial-gradient(120% 140% at 0% 0%, color-mix(in oklch, ${club} 22%, transparent), transparent 70%)` } : undefined}
                      >
                        <OutcomeIcon k={o.key} m={m} />
                        <span className="min-w-0 flex-1 text-[15px] font-semibold leading-tight">{SHORT[o.key]?.(m) ?? label(o.key, m)}</span>
                        {pr != null ? (
                          <span className={`num shrink-0 text-[20px] font-bold ${isTop ? 'text-fg' : 'text-fg/55'}`} title="Шанс по кэфам букмекеров без маржи">
                            {Math.round(pr * 100)}%
                          </span>
                        ) : null}
                        {/* узкая карточка — кэфы строкой под названием, широкая — справа в той же строке */}
                        <span className="flex basis-full gap-1.5 pl-11 @[28rem]/card:basis-auto @[28rem]/card:pl-0">
                          {/* у букмекера нет этой ставки — пустое место той же ширины: кэфы одного букмекера стоят колонкой */}
                          {qs.length ? (
                            partners.map(({ b, p }) => {
                              const q = quoteOf(b, o.key)
                              return q ? button(p, q, o.key) : <span key={p.slug} aria-hidden className="h-9 w-[92px]" />
                            })
                          ) : (
                            <span className="text-[13px] text-mute">Кэфов нет</span>
                          )}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      </ClubVars>
    </Section>
  )
}
