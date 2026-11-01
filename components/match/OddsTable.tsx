import { PARTNERS, partnerForApiBookmaker, type Partner } from '@/config/bookmakers'
import { goHref, SPONSORED_REL } from '@/lib/affiliate'
import { formatOdd } from '@/lib/format'
import { isValue, valueThreshold, type Candidate, type ModelOutput } from '@/lib/model'
import type { BookOdds, Quote } from '@/lib/odds'
import type { Match } from '@/lib/types'
import { PartnerBadge } from '../PartnerBadge'

type Col = { key: string; label: string; title?: string; get: (b: BookOdds) => Quote | undefined }

/** Колонки — простыми словами вместо «П1 / Х / П2 / ТБ 2.5 / ТМ 2.5 / ОЗ да» (владелец согласился). */
const colsFor = (m: Match): Col[] => [
  { key: 'home', label: m.home.name, title: `Победа «${m.home.name}»`, get: (b) => b.x12?.home },
  { key: 'draw', label: 'Ничья', get: (b) => b.x12?.draw },
  { key: 'away', label: m.away.name, title: `Победа «${m.away.name}»`, get: (b) => b.x12?.away },
  { key: 'over2.5', label: '3+ гола', title: '3 гола и больше', get: (b) => b.totals.find((t) => t.line === 2.5)?.over },
  { key: 'under2.5', label: 'До 2 голов', title: 'Не больше 2 голов', get: (b) => b.totals.find((t) => t.line === 2.5)?.under },
  { key: 'bttsYes', label: 'Обе забьют', get: (b) => b.btts?.yes },
]

function partnerOrder(b: BookOdds) {
  const p = partnerForApiBookmaker(b.bookmakerId, b.bookmakerName)
  return p ? PARTNERS.indexOf(p) : 100
}

/**
 * Сравнение коэффициентов: выгодные (выше честной цены) — лаймом, лучший в колонке — белым жирным (только при трёх
 * букмекерах и больше: при двух жирной была половина таблицы — «шахматка»), кэф партнёра — ссылка к нему (через /go
 * с subid); остальные легальные — строкой «Ещё N легальных букмекеров →». Пояснение — только про то, что есть на экране.
 * Строки — исходы словами, колонки — букмекеры и «Честная» (одна шапка с логотипами).
 * Показывается только до начала матча (после — кэфы «сейчас» на табло, по доматчевым не поставить).
 */
export function OddsTable({
  match,
  books,
  model,
  candidates,
  part = 'all',
}: {
  match: Match
  books: BookOdds[]
  model: ModelOutput | null
  candidates: Candidate[]
  /** «table» — без пояснения, «note» — только пояснение: на странице матча оно под блоком, как в Настройках iPhone */
  part?: 'all' | 'table' | 'note'
}) {
  const cols = colsFor(match).filter((c) => books.some((b) => c.get(b)))
  const best = new Map(cols.map((c) => [c.key, Math.max(0, ...books.map((b) => c.get(b)?.value ?? 0))]))
  const prob = new Map(candidates.map((c) => [c.key, c.prob]))
  const valueKeys = new Set(candidates.filter(isValue).map((c) => c.key))
  const rows = [...books].sort((a, b) => partnerOrder(a) - partnerOrder(b) || a.bookmakerName.localeCompare(b.bookmakerName))
  const open = match.status === 'scheduled'
  const boldBest = rows.length >= 3

  const info = (b: BookOdds, c: Col) => {
    const q = c.get(b)
    const isBest = !!q && boldBest && q.value === best.get(c.key)
    const p = prob.get(c.key)
    const val = !!(q && p && open && valueKeys.has(c.key) && p * q.value - 1 >= valueThreshold(q.value))
    return { q, isBest, p, val }
  }
  const anyValue = rows.some((b) => cols.some((c) => info(b, c).val))
  const anyBest = rows.some((b) => cols.some((c) => info(b, c).isBest))
  // пояснение — только про то, что есть на экране (лайм, жирный); стрелки ▼▲ — в подписи раздела
  const note = (
    <>
      {[anyValue ? 'Лаймом — кэф выше честной цены (по кэфам всех букмекеров без маржи)' : '', anyBest ? 'белым жирным — лучший в колонке' : '']
        .filter(Boolean)
        .join(', ')
        .replace(/^./, (ch) => ch.toUpperCase())}
      {anyValue || anyBest ? '. ' : ''}
      Кэфы меняются — проверяйте у букмекера. <span className="whitespace-nowrap">Реклама · 18+</span>
    </>
  )
  if (part === 'note') return note

  /** Ячейка кэфа: у партнёра — кнопка-ссылка к нему (рамка, у выгодного лаймовая), без ссылки — число; лучший — жирным. */
  const cell = (b: BookOdds, c: Col, partner: Partner | null | undefined) => {
    const { q, isBest, p, val } = info(b, c)
    if (!q) return <span className="text-mute">—</span>
    const moved = q.opening ? q.value / q.opening - 1 : 0
    const tip = [`${c.title ?? c.label}: ${formatOdd(q.value)}`, val && p ? `выгодно — выше честной цены ${(1 / p).toFixed(2)}` : '', isBest ? 'лучший кэф' : '', q.opening ? `открытие ${q.opening.toFixed(2)}` : '']
      .filter(Boolean)
      .join(' · ')
    const arrow = (cls: string) =>
      moved <= -0.05 ? (
        <span className={`ml-0.5 text-[10px] ${cls || 'text-hot'}`}>▼</span>
      ) : moved >= 0.05 ? (
        <span className={`ml-0.5 text-[10px] ${cls || 'text-mute'}`}>▲</span>
      ) : null
    // без ссылки (не партнёр или матч начался) — простое число: рамка — знак кнопки, а нажать некуда
    if (!(partner && open))
      return (
        <span className={`num text-[15px] ${val ? 'font-semibold text-acid' : isBest ? 'font-semibold text-fg' : 'font-medium text-fg/90'}`} title={tip}>
          {formatOdd(q.value)}
          {arrow('')}
        </span>
      )
    // кнопкой той же формы, что кэфы в строках главной и «Выгодных ставок» (владелец: «и в блоке Коэффициенты букмекеров на
    // странице матча тоже»): рамка 4px серая, у выгодного — лаймовая, число — блоком цвета карточки; лучший в колонке — жирным;
    // наведение — обычный белеет, выгодный заливается лаймом, число графитовое; нажатие — сжатие
    return (
      <a
        href={goHref(partner, 'odds-table', match.id)}
        target="_blank"
        rel={SPONSORED_REL}
        title={`${tip} · Реклама 18+`}
        className={`group/odd mx-auto flex h-[34px] w-full max-w-[84px] rounded-ctl p-1 transition-transform duration-150 active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100 ${
          val ? 'bg-acid' : 'bg-white/10'
        }`}
      >
        <span
          className={`num flex flex-1 items-center justify-center rounded-md bg-panel text-[15px] text-fg transition-colors duration-150 group-hover/odd:text-ink group-focus-visible/odd:text-ink ${
            val ? 'font-semibold group-hover/odd:bg-acid group-focus-visible/odd:bg-acid' : `${isBest ? 'font-semibold' : 'font-medium'} group-hover/odd:bg-fg group-focus-visible/odd:bg-fg`
          }`}
        >
          {formatOdd(q.value)}
          {arrow('group-hover/odd:text-ink group-focus-visible/odd:text-ink')}
        </span>
      </a>
    )
  }
  const fair = (c: Col) => {
    const p = prob.get(c.key)
    return p ? (1 / p).toFixed(2) : '—'
  }

  // таблица перевёрнута: строки — исходы словами, колонки — букмекеры и «Честная» (владелец: «как будто вытянутый блок
  // получился» — двумя частями «Исход» и «Голы» со своими шапками и «Честной ценой» выходило ~520px на телефоне); одна
  // шапка с логотипами, строку легко сравнить: кэф букмекера рядом с честной ценой
  const colW = 'clamp(54px, 15vw, 150px)'
  const grid = { gridTemplateColumns: `minmax(0,1fr) repeat(${rows.length + (model ? 1 : 0)}, ${colW})` }
  const partners = rows.map((b) => ({ b, partner: partnerForApiBookmaker(b.bookmakerId, b.bookmakerName) }))

  return (
    <div>
      {rows.length ? (
        <div className="text-[15px]">
          <div className="grid items-start gap-x-1 pb-2" style={grid}>
            {/* угол над подписями — название колонки, а не пустота (владелец: «в блоке коэффиценты слева пустая область
                образовалась»), по линии подписей букмекеров */}
            <span className="self-end text-[13px] text-mute">Ставка</span>
            {partners.map(({ b, partner }) => (
              <span key={`${b.bookmakerId}-${b.bookmakerName}`} title={partner?.name ?? b.bookmakerName} className="flex flex-col items-center gap-1 text-center">
                {partner ? <PartnerBadge partner={partner} size={24} /> : null}
                {/* ниже 380px — только логотип: «Мараф…» обрезалось */}
                <span className="max-w-full truncate text-[13px] text-mute max-[379px]:sr-only">{partner?.name ?? b.bookmakerName}</span>
              </span>
            ))}
            {model ? (
              // наш знак, как логотипы букмекеров рядом (владелец: «а может в честно лого типа мой фавикон вставить?»); подпись
              // «Честная» видна всегда — без неё колонку не понять
              <span className="flex flex-col items-center gap-1 text-center" title="Честная цена — сколько стоит исход по кэфам всех букмекеров без маржи">
                {/* eslint-disable-next-line @next/next/no-img-element -- маленький SVG */}
                <img
                  src="/brand/icon.svg"
                  alt=""
                  aria-hidden
                  width={24}
                  height={24}
                  className="inline-block shrink-0 outline outline-1 -outline-offset-1 outline-white/10"
                  style={{ width: 24, height: 24, borderRadius: 6 }}
                />
                <span className="text-[13px] text-mute">Честная</span>
              </span>
            ) : null}
          </div>
          {cols.map((c) => (
            <div key={c.key} className="grid min-h-12 items-center gap-x-1 border-t border-edge py-1.5" style={grid}>
              {/* на телефоне — коротко («Райо Вальекано», «3+ гола»): «Победа «Райо…»» обрезалось */}
              <span className="line-clamp-2 break-words pr-2 text-[14px] leading-tight text-dim">
                <span className="sm:hidden">{c.label}</span>
                <span className="max-sm:hidden">{c.title ?? c.label}</span>
              </span>
              {partners.map(({ b, partner }) => (
                <span key={`${b.bookmakerId}-${b.bookmakerName}`} className="text-center">
                  {cell(b, c, partner)}
                </span>
              ))}
              {model ? <span className="num text-center text-dim">{fair(c)}</span> : null}
            </div>
          ))}
        </div>
      ) : null}


      {part === 'all' ? <p className="mt-4 text-[13px] text-mute">{note}</p> : null}
    </div>
  )
}

/** Есть ли в таблице стрелки ▼▲ (кэф сдвинулся от открытия на 5% и больше) — подпись к ним показываем только тогда. */
export function hasMoves(books: BookOdds[], match: Match) {
  return books.some((b) =>
    colsFor(match).some((c) => {
      const q = c.get(b)
      return q?.opening ? Math.abs(q.value / q.opening - 1) >= 0.05 : false
    }),
  )
}

