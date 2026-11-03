import { PARTNERS, partnerForApiBookmaker, type Partner } from '@/config/bookmakers'
import { goHref, SPONSORED_REL } from '@/lib/affiliate'
import { pct, type BetMarket, type Rate } from '@/lib/bet-markets'
import { formatOdd, plural } from '@/lib/format'
import { isValue, quoteOf, valueThreshold, type Candidate } from '@/lib/model'
import type { BookOdds, Quote } from '@/lib/odds'
import type { Match } from '@/lib/types'
import { PartnerBadge } from '../PartnerBadge'
import { ShadowSymbol } from '../story/StorySymbol'
import { DARK_PLATE } from '@/lib/crest-geo'
import { CrestPlate } from '../CrestPlate'
import { ClubVars } from './ClubVars'
import { ymdInTz } from '@/lib/format'
import { BlockNote } from '../Section'

export const label = (key: string, m: Match) =>
  ({
    home: `Победа «${m.home.name}»`,
    draw: 'Ничья',
    away: `Победа «${m.away.name}»`,
    hd: `«${m.home.name}» или ничья`,
    da: `«${m.away.name}» или ничья`,
    ha: 'Кто-то победит',
    'over1.5': '2 гола и больше',
    'under1.5': 'Не больше 1 гола',
    'over3.5': '4 гола и больше',
    'under3.5': 'Не больше 3 голов',
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
  // двойной шанс с ничьей — эмблема той команды, что в названии
  if (k === 'home' || k === 'away' || k === 'hd' || k === 'da') {
    const t = k === 'home' || k === 'hd' ? m.home : m.away
    return <CrestPlate name={t.name} logo={t.logo} size={size} crest={0.66} shape={shape} dark />
  }
  // тоталы 1,5 и 3,5 — числом, как знаки «3+» / «≤2» у 2,5
  const t = /^(over|under)(1\.5|3\.5)$/.exec(k)
  if (t) {
    const n = Number(t[2])
    return (
      <span aria-hidden className={`grid shrink-0 place-items-center ${shape}`} style={{ width: size, height: size, background: DARK_PLATE }}>
        <span className={`display-num leading-none text-fg ${big ? 'text-[20px]' : 'text-[16px]'}`}>{t[1] === 'over' ? `${n + 0.5}+` : `≤${n - 0.5}`}</span>
      </span>
    )
  }
  const sym = ({ draw: 'ravnye', ha: 'h2h', 'over2.5': 'tb-2-5', 'under2.5': 'tm-2-5', bttsYes: 'obe-zabyut', bttsNo: 'kto-ne-zabyot' } as Record<string, string>)[k]
  return sym ? (
    <span aria-hidden className={`grid shrink-0 place-items-center overflow-hidden ${shape}`} style={{ width: size, height: size, background: DARK_PLATE }}>
      <ShadowSymbol k={sym} dark className={big ? 'size-6' : 'size-[18px]'} />
    </span>
  ) : null
}

/** Строка доли: подпись, процент, тонкая полоса; выборка — в подсказке («4 из 9»). */
function Stat({ name, tip, r }: { name: string; tip: string; r: Rate | null }) {
  return (
    <div title={r ? `${tip}: ${r.hit} из ${r.of}` : `${tip}: мало данных`}>
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="min-w-0 leading-snug text-dim">{name}</span>
        <span className={`num shrink-0 text-[14px] ${r ? 'font-semibold text-fg' : 'text-mute'}`}>{r ? `${pct(r)}%` : '—'}</span>
      </div>
      <div className="mt-1.5 h-1 rounded-full bg-white/[0.09]">
        {r ? <div className="h-full rounded-full bg-linear-to-r from-white/30 to-white/85" style={{ width: `${pct(r)}%` }} /> : null}
      </div>
    </div>
  )
}

/** сколько карточек исходов видно сразу */
const SHOWN = 6

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
        className="group/odd flex h-11 w-[108px] items-center gap-2 transition-transform duration-150 active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100"
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
    (k === 'x12' || k === 'dc'
      ? `До 10 последних домашних матчей «${m.home.name}» и выездных «${m.away.name}»`
      : `До 10 последних матчей ${teams}`
    ).replace(/^Д/, low ? 'д' : 'Д')
  const leagueTip = `Сыгранные матчи турнира «${leagueName}» в сезоне${seasonName ? ` ${seasonName}` : ''}`

  // все исходы — отдельными карточками одной формы в одной сетке, без заголовков разделов, зазоры между карточками
  // одинаковые по горизонтали и вертикали (владелец: «чтоб все карточки были по форме как те 3 штуки что в верхнем ряду
  // и убери все заголовки и сделай отступы сверху снизу слева справа равные между карточками»)
  const items = shown.flatMap((mk) =>
    mk.outcomes.map((o) => {
      const pr = prob.get(o.key)
      // самый вероятный исход своего рынка — светлее рамкой и цифрой шанса; почти поровну (50 на 50) — без выделения
      const top = pr != null && mk.outcomes.every((x) => x.key === o.key || (prob.get(x.key) ?? 0) <= pr - 0.02)
      return { mk, o, pr, top }
    }),
  )
  // два порядка — переключателем над сеткой (владелец: «сделай тогда по популярности и по шансам сортировку?»): «По
  // популярности» — порядок рынков в `betMarkets` (исход, «3 гола», «обе забьют», двойной шанс, тоталы 1,5 / 3,5 — на что
  // обычно ставят; своих данных о ставках у нас нет), «По шансам» — самый вероятный первым, без шанса — в конце. Без JS:
  // карточки переставляет CSS `order`, а «Показать больше» прячет седьмую и дальше в выбранном порядке
  const byChance = items.map((_, i) => i).sort((a, b) => (items[b].pr ?? -1) - (items[a].pr ?? -1) || a - b)
  const chanceIdx = new Map(byChance.map((i, rank) => [i, rank]))
  return (
    // первые 6 карточек, остальные — по «Показать больше исходов», как на Polymarket (владелец: «можно после 6 сделать кнопку
    // как на полимаркете типа показать больше исходов?»); без JS — флажок и `has()`, разметка целиком в коде страницы
    <section className="bets">
      {/* скругление пунктов вложено в скругление капсулы: 10 = 6 + 4 */}
      <div role="radiogroup" aria-label="Порядок исходов" className="mb-3 flex w-fit rounded-ctl bg-white/[0.06] p-1 text-[14px] font-semibold">
        {(
          [
            ['По популярности', false],
            ['По шансам', true],
          ] as const
        ).map(([name, chance]) => (
          <label
            key={name}
            className="flex h-8 cursor-pointer items-center rounded-md px-3 text-dim transition-colors hover:text-fg has-[:checked]:bg-fg has-[:checked]:text-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-fg"
          >
            <input type="radio" name={`bets-sort-${m.id}`} defaultChecked={!chance} className={`${chance ? 'bets-by-chance ' : ''}sr-only`} />
            {name}
          </label>
        ))}
      </div>
      <ClubVars id={m.id} ymd={ymdInTz(m.ts)} className="@container">
        <ul className="grid gap-2 @2xl:grid-cols-3">
          {items.map(({ mk, o, pr, top }, idx) => {
            // свет цветом клуба — только у победы и только если она самый вероятный исход (владелец: «если например победа
            // эльче это не топ по шансу то убери градиент с карточки»)
            const club = top ? (o.key === 'home' ? 'var(--club-h)' : o.key === 'away' ? 'var(--club-a)' : null) : null
            const qs = partners.map(({ b, p }) => ({ p, q: quoteOf(b, o.key) })).filter((x): x is { p: Partner; q: Quote } => Boolean(x.q))
            return (
              // на телефоне — шапка (значок, название, шанс) во всю ширину, под ней полосы слева и кэфы справа;
              // от 42rem — три ряда подсетки (шапка · полосы · кэфы): в карточках одного ряда ряды на одной высоте
              <li
                key={o.key}
                style={{ '--op': idx, '--oc': chanceIdx.get(idx), ...(club ? { backgroundImage: `radial-gradient(120% 90% at 0% 0%, color-mix(in oklch, ${club} 20%, transparent), transparent 70%)` } : {}) } as React.CSSProperties}
                className={`${idx >= SHOWN ? 'in-[.bets:not(:has(.bets-by-chance:checked)):not(:has(.bets-more:checked))]:hidden ' : ''}${(chanceIdx.get(idx) ?? 0) >= SHOWN ? 'in-[.bets:has(.bets-by-chance:checked):not(:has(.bets-more:checked))]:hidden ' : ''}order-(--op) in-[.bets:has(.bets-by-chance:checked)]:order-(--oc) card grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-4 !p-4 @2xl:row-span-3 @2xl:grid-cols-1 @2xl:grid-rows-subgrid ${top ? 'ring-1 ring-inset ring-white/15' : ''}`}
              >
                {/* значок слева от названия, шанс справа — одной строкой (владелец: «иконку перенести слева от заголовка») */}
                <div className="col-span-2 flex items-center gap-3 @2xl:col-span-1">
                  <OutcomeIcon k={o.key} m={m} big />
                  <p className="min-w-0 flex-1 break-words text-[16px] font-semibold leading-tight">{label(o.key, m)}</p>
                  {pr != null ? (
                    <span className="shrink-0 text-right" title="Шанс по кэфам букмекеров без маржи">
                      <span className={`display-num block text-[28px] leading-none ${top ? 'text-fg' : 'text-fg/55'}`}>{Math.round(pr * 100)}%</span>
                      <span className="mt-1 block text-[12px] text-mute">шанс</span>
                    </span>
                  ) : null}
                </div>
                <div className="min-w-0 space-y-3">
                  <Stat name="Среднее у команд" tip={pastTip(mk.key)} r={o.past} />
                  {leagueN ? <Stat name="Среднее в лиге" tip={leagueTip} r={o.league} /> : null}
                </div>
                <div className="flex shrink-0 flex-col justify-center gap-2 @2xl:flex-row @2xl:items-end @2xl:justify-start">
                  {qs.length ? qs.map(({ p, q }) => button(p, q, o.key)) : <span className="text-[13px] text-mute">Кэфов нет</span>}
                </div>
              </li>
            )
          })}
        </ul>
      </ClubVars>
      {items.length > SHOWN ? (
        <label className="mx-auto mt-4 flex h-11 w-fit cursor-pointer items-center rounded-full border border-white/15 px-5 text-[15px] font-semibold transition-colors hover:bg-white/[0.06] has-[:checked]:hidden has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-fg">
          <input type="checkbox" className="bets-more sr-only" />
          Показать больше исходов
        </label>
      ) : null}
      <BlockNote>
        Среднее у команд — {pastTip('x12', true)} (у голов — {pastTip('goals', true)}).
        {leagueN ? ` Среднее в лиге — ${leagueN} ${plural(leagueN, ['матч', 'матча', 'матчей'])} турнира «${leagueName}» в сезоне${seasonName ? ` ${seasonName}` : ''}.` : ''}{' '}
        {note}Это прошлые матчи, а не прогноз. Лаймом — кэф выше честной цены. {names ? `${names} · ` : ''}Реклама · Ставки — это риск · 18+.
      </BlockNote>
    </section>
  )
}
