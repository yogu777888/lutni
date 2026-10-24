import { primaryPartner } from '@/config/bookmakers'
import { goHref } from '@/lib/affiliate'
import { formatTime, pct } from '@/lib/format'
import type { Pick } from '@/lib/model'
import type { Match } from '@/lib/types'
import { outcomeText, split100, type Verdict } from '@/lib/verdict'
import { AdMark } from '../AdMark'
import { CtaLink } from '../CtaLink'
import type { TagHit } from '@/lib/tags'
import { StorySymbol } from '../story/StorySymbol'
import { TeamLogo } from '../TeamLogo'
import { PredictShare, type PredictCard } from './PredictShare'

/**
 * «Прогноз» — отдельный блок под табло до начала матча (владелец: «блок матча супер некрасивый» — вынесли из табло; потом
 * «и блок прогноза вот вообще сейчас не нравится» — «да»): вывод словами одной строкой; под ним полоса шансов трёх исходов
 * (самый вероятный — белым, остальные серым) и подписи под ней — хозяева слева, ничья по центру, гости справа (строкой
 * «66% … 20% … 14%» на телефоне разваливалось на две); доводы «почему так» — факты подборок (`facts`); под чертой — ставка одной
 * строкой: слева «Выгодная ставка» / «Наш выбор» и исход, справа крупно кэф и букмекер; ниже одна фраза вместо трёх строк
 * цифр («Честная цена — 1.51, PARI платит на 5,5% больше») и кнопка «Поставить в PARI» (кэф уже крупно рядом). Было:
 * «Явный фаворит — «X»» и тут же «Победа «X»» двумя заголовками, столбик «Честная цена / Кэф PARI / Выгода».
 */
export function PredictBlock({
  m,
  v,
  pick,
  probs,
  tags = [],
  when,
  url,
}: {
  m: Match
  v: Verdict | null
  pick: Pick | null
  probs: { home: number; draw: number; away: number } | null
  tags?: TagHit[]
  /** «Ла Лига · сегодня» */
  when: string
  /** адрес матча на tag.bet — для картинки и «Поделиться» */
  url: string
}) {
  const n = probs ? split100(probs) : null
  const c = pick?.candidate
  const value = pick?.kind === 'value'
  const partner = c?.bestPartner?.partner ?? primaryPartner()
  const odd = c?.bestPartner?.value ?? null
  const x12 = c ? c.key === 'home' || c.key === 'draw' || c.key === 'away' : false
  const pctComma = (x: number) => `${Math.abs(x * 100).toFixed(1).replace('.', ',')}%`
  // одна фраза: шанс (если ставка не исход матча — исходы уже на полосе), честная цена и что с ней у букмекера
  const why = c
    ? [
        x12 ? null : `Шанс ${pct(c.prob)}`,
        `честная цена — ${c.fairOdd.toFixed(2)}`,
        odd == null
          ? null
          : value && c.ev != null && c.ev > 0
            ? `${partner.name} платит на ${pctComma(c.ev)} больше`
            : c.ev != null && c.ev < 0
              ? 'кэф ниже — выгоды нет'
              : 'кэф около неё',
      ]
        .filter(Boolean)
        .join(', ')
    : ''
  const fs = facts(tags, m, pick)
  const card: PredictCard = {
    home: m.home.name,
    away: m.away.name,
    when: `${when} ${formatTime(m.ts)}`,
    headline: v?.headline ?? null,
    probs: n
      ? (['home', 'draw', 'away'] as const).map((k) => ({
          v: n[k],
          label: k === 'home' ? m.home.name : k === 'away' ? m.away.name : 'Ничья',
          top: k === (n.home >= n.draw && n.home >= n.away ? 'home' : n.away >= n.draw ? 'away' : 'draw'),
        }))
      : null,
    facts: fs.map((f) => (f.side ? `${f.side.name} · ${f.text}` : f.text.charAt(0).toUpperCase() + f.text.slice(1))),
    bet: c
      ? {
          label: value ? 'Выгодная ставка' : 'Наш выбор',
          outcome: outcomeText(c.key, m).replace(/^./, (x) => x.toUpperCase()),
          fair: `${x12 ? '' : `Шанс ${pct(c.prob)} · `}честная цена — ${c.fairOdd.toFixed(2)}`.replace(/^./, (x) => x.toUpperCase()),
        }
      : null,
    url,
  }
  const top = n ? (n.home >= n.draw && n.home >= n.away ? 'home' : n.away >= n.draw ? 'away' : 'draw') : null
  return (
    <div>
      {/* шапка — матч, турнир и время, справа «···»: сохранить картинку или переслать (владелец: «сверху добавь счет и лигу
          и время как на фото и справа кнопочку чтоб можно было фото сохранить или переслать»); до начала счёта нет — «—» */}
      {/* команды — во всю ширину карточки: хозяева от левого края, гости от правого (владелец: «а можно команды как то на
          всю ширину сделать … а то они сжаты сверху»); время — между ними, как на табло, турнир и день — строкой над ними, «···» — справа в той же строке */}
      <div className="px-4">
        <div className="-mr-2 flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-[14px] text-dim">{when}</p>
          <PredictShare card={card} />
        </div>
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 text-[17px] font-semibold">
          {[m.home, null, m.away].map((t, i) =>
            t ? (
              // на телефоне эмблема над названием — в строку «Райо Валье…» обрезалось
              <span
                key={i}
                className={`flex min-w-0 flex-col gap-1.5 sm:items-center sm:gap-2.5 ${i === 0 ? 'items-start sm:flex-row' : 'items-end text-right sm:flex-row-reverse'}`}
              >
                <span className="shrink-0">
                  <TeamLogo name={t.name} src={t.logo} size={32} />
                </span>
                <span className="line-clamp-2 break-words leading-tight">{t.name}</span>
              </span>
            ) : (
              // по центру — время начала, как на табло (до начала счёта нет)
              <span key={i} className="num display-num text-[24px] leading-none">{formatTime(m.ts)}</span>
            ),
          )}
        </div>
      </div>
      {/* вывод, полоса шансов и доводы — своим внутренним блоком, как ставка ниже; поля и зазоры — как в «Давлении команд» */}
      <div className="mt-4 rounded-tile bg-white/[0.04] p-4">
      {v ? <p className="text-[20px] font-bold leading-tight tracking-[-0.02em] sm:text-[22px]">{v.headline}</p> : null}
      {n ? (
        <div className="mt-4">
          <div className="flex h-1.5 gap-0.5" aria-hidden>
            {(['home', 'draw', 'away'] as const).map((k, i) => (
              <div
                key={k}
                className={`h-full ${i === 0 ? 'rounded-l-full' : ''} ${i === 2 ? 'rounded-r-full' : ''} ${k === top ? 'bg-white/85' : 'bg-white/25'}`}
                style={{ width: `${n[k]}%` }}
              />
            ))}
          </div>
          {/* процент — строкой, название — под ним (до двух строк): в одну строку «57% Атлетико / Мадрид» рвалось на три */}
          <div className="mt-2 grid grid-cols-3 gap-2 text-dim">
            {(['home', 'draw', 'away'] as const).map((k) => (
              <div key={k} className={`min-w-0 ${k === 'draw' ? 'text-center' : k === 'away' ? 'text-right' : ''}`}>
                <div className={`num text-[15px] font-semibold ${top === k ? 'text-fg' : ''}`}>{n[k]}%</div>
                <div className="line-clamp-2 break-words text-[13px] leading-snug">{k === 'home' ? m.home.name : k === 'away' ? m.away.name : 'Ничья'}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {fs.length ? (
        // «Почему так» — факты подборок (владелец: «а может оставить пилюли а факты вынести красиво в прогноз?» — «да»):
        // серии, дома, травмы, падение кэфа, форма аутсайдера, личные встречи; шансы исходов и голов здесь не повторяем —
        // они на полосе и в «Голах и счёте»; команда в начале факта — эмблемой; до четырёх, сначала про команду ставки
        // плашками в ряд, команда — названием перед фактом (владелец прислал второй вариант блока: «как тебе?» — «да»;
        // эмблемой 18px было непонятно, о ком речь); плашку «tag.bet оценивает матч как близкий» не делаем — повтор заголовка
        <ul className="mt-5 flex flex-wrap gap-2">
          {fs.map((f) => (
            <li key={f.slug} className="flex min-w-0 items-start gap-2.5 rounded-tile bg-white/[0.06] px-3.5 py-2.5 text-[15px] leading-snug">
              <StorySymbol k={f.slug} tone="currentColor" className="mt-[3px] h-4 w-4 shrink-0 text-mute" />
              <span className="min-w-0">
                {f.side ? <>{f.side.name} · </> : null}
                {f.side ? f.text : <span className="inline-block first-letter:uppercase">{f.text}</span>}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      </div>
      {c ? (
        // ставка — своей плашкой внутри блока: прогноз и ставка — две части, а не список через черту
        <div className="mt-4 rounded-tile bg-white/[0.04] p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className={`text-[13px] font-semibold ${value ? 'text-good' : 'text-dim'}`}>{value ? 'Выгодная ставка' : 'Наш выбор'}</p>
              {/* исход словами вместо «П1» */}
              <p className="mt-1 text-[18px] font-bold leading-tight tracking-[-0.02em] first-letter:uppercase">{outcomeText(c.key, m)}</p>
            </div>
            {odd != null ? (
              <div className="shrink-0 text-right">
                <div className={`num text-[30px] font-semibold leading-none tracking-[-0.03em] ${value ? 'text-good' : ''}`}>{odd.toFixed(2)}</div>
                <div className="mt-1 text-[13px] text-dim">{partner.name}</div>
              </div>
            ) : null}
          </div>
          <p className="mt-3 text-[14px] leading-snug text-dim first-letter:uppercase">{why}.</p>
          {/* #pick-cta — по нему нижняя плашка на телефоне прячется, пока эта кнопка на экране (`StickyCta`) */}
          {/* во всю ширину плашки, стрелка у правого края (было — половина ширины, прижата влево) */}
          <div id="pick-cta" className="mt-4">
            <CtaLink href={goHref(partner, 'pick', m.id)} size="lg" className="relative w-full">
              {odd != null ? `Поставить в ${partner.name}` : `Сделать ставку в ${partner.name}`}
              <svg viewBox="0 0 24 24" className="absolute right-5 h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </CtaLink>
            <AdMark partner={partner} className="mt-2 text-center" />
          </div>
        </div>
      ) : null}
      {/* оговорка — внутри карточки, а не строкой под ней */}
      <p className="mt-4 text-center text-[13px] text-mute">Оценка tag.bet, а не гарантия. Ставки — это риск · 18+</p>
    </div>
  )
}

/** Подборки-доводы для «Почему так»: без шансов исходов и голов (они на полосе и в «Голах и счёте») и без «Выгодно». */
const FACT_SLUGS = ['progruz', 'seriya', 'krepost', 'andedog', 'kadry', 'h2h', 'top-match']

function facts(tags: TagHit[], m: Match, pick: Pick | null) {
  const key = pick?.candidate.key
  const pickTeam = key === 'home' ? m.home.name : key === 'away' ? m.away.name : null
  return tags
    .filter((t) => FACT_SLUGS.includes(t.slug))
    .map((t) => {
      const fact = t.short ?? t.reason
      const side = [m.home, m.away].find((tm) => /^[:,]/.test(fact.slice(tm.name.length + 2)) && fact.startsWith(`«${tm.name}»`)) ?? null
      const text = side ? fact.slice(side.name.length + 2).replace(/^[:,]\s*/, '') : fact
      return { slug: t.slug, side, text, mine: Boolean(pickTeam && fact.includes(`«${pickTeam}»`)) }
    })
    .sort((a, b) => Number(b.mine) - Number(a.mine))
    .slice(0, 4)
}
