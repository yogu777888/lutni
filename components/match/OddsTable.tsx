import { PARTNERS, partnerForApiBookmaker, type Partner } from '@/config/bookmakers'
import { goHref, SPONSORED_REL } from '@/lib/affiliate'
import { formatOdd } from '@/lib/format'
import { isValue, valueThreshold, type Candidate, type ModelOutput } from '@/lib/model'
import type { BookOdds, Quote } from '@/lib/odds'
import type { Match } from '@/lib/types'
import { pluralN } from '@/lib/format'
import { BlockMore } from '../BlockMore'
import { PartnerBadge } from '../PartnerBadge'
import { Segmented } from '../Segmented'

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
 * Строки «букмекер — три кэфа» на всех ширинах, рынки — сегментами «Исход | Голы».
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
  // легальные партнёры, чьих кэфов нет в API (Фонбет, Winline, BetBoom, Лига Ставок — их нет в /Odds SStats): ссылка
  // на сайт, а не прочерки — шесть «—» подряд читаются как «сломалось» (владелец: «у кого нет кэфов просто ссылку на их
  // сайт»); чужие кэфы под их имя не подставляем
  const shown = new Set(rows.map((b) => partnerForApiBookmaker(b.bookmakerId, b.bookmakerName)?.slug))
  const others = open ? PARTNERS.filter((p) => !shown.has(p.slug)) : []

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
      {[anyValue ? 'Лаймом — кэф выше честной цены (по оценке tag.bet)' : '', anyBest ? 'белым жирным — лучший в колонке' : '']
        .filter(Boolean)
        .join(', ')
        .replace(/^./, (ch) => ch.toUpperCase())}
      {anyValue || anyBest ? '. ' : ''}
      Кэфы меняются — проверяйте у букмекера. <span className="whitespace-nowrap">Реклама · 18+</span>
    </>
  )
  if (part === 'note') return note

  /** Ячейка кэфа: число по центру колонки, выгодный — лаймовой плашкой, лучший — жирным; у партнёра — ссылка к нему. */
  const cell = (b: BookOdds, c: Col, partner: Partner | null | undefined) => {
    const { q, isBest, p, val } = info(b, c)
    if (!q) return <span className="text-mute">—</span>
    const moved = q.opening ? q.value / q.opening - 1 : 0
    const chip = (
      // лаймом — только кэф выше честной цены, как в строках списка и «Выгодно сегодня»; лучший в колонке — белым жирным
      <span
        className={`num relative inline-flex h-8 min-w-[58px] items-center justify-center rounded-full px-2 text-[15px] ${
          val ? 'bg-acid font-semibold text-acid-ink' : isBest ? 'font-semibold text-fg' : 'font-medium text-fg/85'
        }`}
        title={
          [`${c.title ?? c.label}: ${formatOdd(q.value)}`, val && p ? `выгодно — выше честной цены ${(1 / p).toFixed(2)}` : '', isBest ? 'лучший кэф' : '', q.opening ? `открытие ${q.opening.toFixed(2)}` : '']
            .filter(Boolean)
            .join(' · ')
        }
      >
        {formatOdd(q.value)}
        {moved <= -0.05 ? (
          <span className={`ml-0.5 text-[10px] ${val ? '' : 'text-hot'}`}>▼</span>
        ) : moved >= 0.05 ? (
          <span className={`ml-0.5 text-[10px] ${val ? '' : 'text-mute'}`}>▲</span>
        ) : null}
      </span>
    )
    return partner && open ? (
      <a href={goHref(partner, 'odds-table', match.id)} target="_blank" rel={SPONSORED_REL} className="inline-block rounded-full transition-colors hover:bg-white/[0.08]">
        {chip}
      </a>
    ) : (
      chip
    )
  }
  const fair = (c: Col) => {
    const p = prob.get(c.key)
    return p ? (1 / p).toFixed(2) : '—'
  }

  // одна строка подписей на таблицу и строки «букмекер — три кэфа», как список в iOS (владелец: «виджеты довольно грязно
  // выглядят … куча мелкого текста в блоке» — подписи исходов повторялись у каждого букмекера и у «Честной цены», 18
  // подписей на 18 чисел); голы — вторым сегментом «Исход | Голы», а не вторым рядом чисел; кнопки «Ставка» нет — к
  // букмекеру ведёт сам кэф
  const GRID = 'grid grid-cols-[minmax(0,1fr)_repeat(3,minmax(58px,68px))] items-center gap-x-1 sm:grid-cols-[minmax(0,1fr)_repeat(3,96px)]'
  const table = (group: Col[]) => (
    <div className="text-[15px]">
      {/* названия — до двух строк по низу («Райо / Вальекано»), а не «Райо Вал…» */}
      <div className={`${GRID} !items-end pb-2 text-[13px] leading-tight text-mute`}>
        <span />
        {group.map((c) => (
          <span key={c.key} title={c.title ?? c.label} className="line-clamp-2 break-words text-center">
            {c.label}
          </span>
        ))}
      </div>
      {rows.map((b) => {
        const partner = partnerForApiBookmaker(b.bookmakerId, b.bookmakerName)
        return (
          <div key={`${b.bookmakerId}-${b.bookmakerName}`} className={`${GRID} min-h-12 border-t border-edge py-1.5`}>
            <span className="flex min-w-0 items-center gap-2.5">
              {partner ? <PartnerBadge partner={partner} size={24} /> : null}
              <span className="truncate font-medium">{partner?.name ?? b.bookmakerName}</span>
            </span>
            {group.map((c) => (
              <span key={c.key} className="text-center">
                {cell(b, c, partner)}
              </span>
            ))}
          </div>
        )
      })}
      {model ? (
        <div className={`${GRID} min-h-12 border-t border-edge py-1.5 text-dim`} title="Сколько стоит исход по оценке tag.bet — без маржи букмекера">
          <span className="truncate">Честная цена</span>
          {group.map((c) => (
            <span key={c.key} className="num text-center">
              {fair(c)}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
  const x12 = cols.filter((c) => ['home', 'draw', 'away'].includes(c.key))
  const goals = cols.filter((c) => !['home', 'draw', 'away'].includes(c.key))

  return (
    <div>
      {rows.length ? (
        <Segmented
          label="Рынок"
          items={[
            ...(x12.length ? [{ key: 'x12', label: 'Исход', content: table(x12) }] : []),
            ...(goals.length ? [{ key: 'goals', label: 'Голы', content: table(goals) }] : []),
          ]}
        />
      ) : null}

      {others.length ? (
        // остальные легальные — одной строкой внизу блока (чипы в три строки были ярче самой таблицы)
        <BlockMore href="/bookmakers" className="-mx-5 -mb-5 mt-3 !px-5 !py-3.5 sm:-mx-7 sm:-mb-7 sm:!px-7">
          {rows.length ? `Ещё ${pluralN(others.length, ['легальный букмекер', 'легальных букмекера', 'легальных букмекеров'])}` : 'Линия — на сайтах легальных букмекеров'}
        </BlockMore>
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
