import { primaryPartner } from '@/config/bookmakers'
import { goHref, SPONSORED_REL } from '@/lib/affiliate'
import { PartnerBadge } from '@/components/PartnerBadge'
import { formatTime, pct } from '@/lib/format'
import type { Pick } from '@/lib/model'
import type { Match } from '@/lib/types'
import { outcomeText, split100, type Verdict } from '@/lib/verdict'
import { AdMark } from '../AdMark'
import { CtaLink } from '../CtaLink'
import type { TagHit } from '@/lib/tags'
import { StorySymbol } from '../story/StorySymbol'
import { PredictShare, type PredictCard } from './PredictShare'
import { Icon } from '@/components/Icon'

/**
 * «Прогноз» — отдельный блок под табло до начала матча (владелец: «блок матча супер некрасивый» — вынесли из табло; потом
 * «и блок прогноза вот вообще сейчас не нравится» — «да»): вывод словами одной строкой; под ним полоса шансов трёх исходов
 * (самый вероятный — белым, остальные серым) и подписи под ней — хозяева слева, ничья по центру, гости справа (строкой
 * «66% … 20% … 14%» на телефоне разваливалось на две); доводы «почему так» — факты подборок (`facts`); под чертой — ставка одной
 * строкой: слева «Выгодная ставка» / «Наш выбор» и исход, справа крупно кэф и букмекер; ниже одна фраза вместо трёх строк
 * цифр («Честная цена — 1.51, PARI платит на 5,5% больше») и кнопка «Поставить в PARI» (кэф уже крупно рядом). Было:
 * «Явный фаворит — «X»» и тут же «Победа «X»» двумя заголовками, столбик «Честная цена / Кэф PARI / Выгода».
 */
type Props = {
  m: Match
  v: Verdict | null
  pick: Pick | null
  probs: { home: number; draw: number; away: number } | null
  tags?: TagHit[]
  /** «Ла Лига · сегодня» */
  when: string
  /** адрес матча на tag.bet — для картинки и «Поделиться» */
  url: string
}

/** Всё, что считает блок: картинка «···» и данные ставки — общие для блока и кнопки в заголовке (`PredictShareButton`). */
function compute({ m, v, pick, probs, tags = [], when, url }: Props) {
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
            ? `кэф ${partner.name} выше неё на ${pctComma(c.ev)}`
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
    facts: fs.map((f) => (f.side ? `${f.pro ? 'За ' : ''}${f.side.name}: ${f.text}` : f.text.charAt(0).toUpperCase() + f.text.slice(1))),
    bet: c && value
      ? {
          label: 'Выгодная ставка',
          outcome: outcomeText(c.key, m).replace(/^./, (x) => x.toUpperCase()),
          fair: `${x12 ? '' : `Шанс ${pct(c.prob)} · `}честная цена — ${c.fairOdd.toFixed(2)}`.replace(/^./, (x) => x.toUpperCase()),
        }
      : null,
    url,
  }
  return { n, c, value, partner, odd, x12, why, fs, card }
}

/** «···» — справа в строке заголовка «Расклада по кэфам» (владелец на план «до матча» — «да»: строки с командами в блоке нет — они на табло). */
export function PredictShareButton(p: Props) {
  return <PredictShare card={compute(p).card} />
}

export function PredictBlock(p: Props) {
  const { m, v, pick } = p
  const { n, c, value, partner, odd, x12, why, fs } = compute(p)
  const top = n ? (n.home >= n.draw && n.home >= n.away ? 'home' : n.away >= n.draw ? 'away' : 'draw') : null
  return (
    <div>
      {/* вывод, полоса шансов и доводы — своим внутренним блоком, как ставка ниже; поля и зазоры — как в «Давлении команд» */}
      <div className="rounded-tile bg-white/[0.04] p-4">
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
                {f.side ? <>{f.pro ? `За ${f.side.name}: ` : `${f.side.name}: `}</> : null}
                {f.side ? f.text : <span className="inline-block first-letter:uppercase">{f.text}</span>}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      </div>
      {c && value ? (
        // выгодная ставка — своей плашкой: исход, крупно кэф лаймом, одна фраза и кнопка к букмекеру
        <div className="mt-4 rounded-tile bg-white/[0.04] p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-good">Выгодная ставка</p>
              {/* исход словами вместо «П1» — тем же размером, что вывод в блоке выше */}
              <p className="mt-1 text-[20px] font-bold leading-tight tracking-[-0.02em] first-letter:uppercase sm:text-[22px]">{outcomeText(c.key, m)}</p>
            </div>
            {odd != null ? (
              <div className="shrink-0 text-right">
                <div className="num text-[30px] font-semibold leading-none tracking-[-0.03em] text-good">{odd.toFixed(2)}</div>
                <div className="mt-1 text-[13px] text-dim">{partner.name}</div>
              </div>
            ) : null}
          </div>
          <p className="mt-3 text-[14px] leading-snug text-dim first-letter:uppercase">{why}.</p>
          {/* #pick-cta — по нему нижняя плашка на телефоне прячется, пока эта кнопка на экране (`StickyCta`) */}
          <div id="pick-cta" className="mt-4">
            <CtaLink href={goHref(partner, 'pick', m.id)} size="lg" className="relative w-full">
              {odd != null ? `Поставить в ${partner.name}` : `Сделать ставку в ${partner.name}`}
              <Icon k="arrow-right" className="absolute right-5 h-5 w-5" />
            </CtaLink>
            <AdMark partner={partner} className="mt-2 text-center" />
          </div>
        </div>
      ) : c && odd != null ? (
        // выгоды нет — без «Нашего выбора» и лаймовой кнопки (владелец: «а сам блок безопасный?» — «да»): совет ставить при
        // «кэф ниже — выгоды нет» внутри рекламы читался бы недостоверно; одна строка с кэфом и честной ценой и тихая ссылка
        // кнопка с кэфом — той же формы, что в подборках и «Выгодных ставках» (знак букмекера и кэф в серой рамке; лайм — только «выгодно»)
        <div className="mt-4 flex items-center justify-between gap-4 rounded-tile bg-white/[0.04] p-4">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold first-letter:uppercase">{outcomeText(c.key, m)}</p>
            <p className="mt-0.5 text-[13px] text-dim first-letter:uppercase">{why}</p>
          </div>
          <div id="pick-cta" className="w-[108px] shrink-0">
            <a
              href={goHref(partner, 'pick', m.id)}
              target="_blank"
              rel={SPONSORED_REL}
              title={`${outcomeText(c.key, m)}: ${odd.toFixed(2)} в ${partner.name} · Реклама 18+`}
              aria-label={`${outcomeText(c.key, m)}: ${odd.toFixed(2)} в ${partner.name}`}
              className="group/odd flex h-11 w-full items-center gap-2 transition-transform duration-150 active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              <PartnerBadge partner={partner} size={36} />
              <span className="flex h-full flex-1 rounded-tile bg-white/10 p-1 transition-colors duration-150 group-hover/odd:bg-fg group-focus-visible/odd:bg-fg">
                <span className="num grid flex-1 place-items-center rounded-lg bg-panel text-[17px] font-bold text-fg transition-colors duration-150 group-hover/odd:bg-fg group-hover/odd:text-ink group-focus-visible/odd:bg-fg group-focus-visible/odd:text-ink">
                  {odd.toFixed(2)}
                </span>
              </span>
            </a>
            <AdMark partner={partner} className="mt-1.5 text-center" />
          </div>
        </div>
      ) : null}
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
      // за кого довод: падение кэфа, «дома не проигрывают», форма аутсайдера и серия побед — за команду; травмы, серия
      // без побед — нет (владелец: довод «Эльче · 13 очков…» под «Скорее выиграет Атлетико» читался спором с заголовком)
      const pro = ['progruz', 'krepost', 'andedog'].includes(t.slug) || (t.slug === 'seriya' && !/без побед|поражени/.test(text))
      return { slug: t.slug, side, text, pro, mine: Boolean(pickTeam && fact.includes(`«${pickTeam}»`)) }
    })
    .sort((a, b) => Number(b.mine) - Number(a.mine))
    .slice(0, 4)
}
