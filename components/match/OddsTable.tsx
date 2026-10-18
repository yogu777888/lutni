import { PARTNERS, partnerForApiBookmaker, type Partner } from '@/config/bookmakers'
import { goHref, SPONSORED_REL } from '@/lib/affiliate'
import { formatOdd } from '@/lib/format'
import { isValue, valueThreshold, type Candidate, type ModelOutput } from '@/lib/model'
import type { BookOdds, Quote } from '@/lib/odds'
import type { Match } from '@/lib/types'
import { pluralN } from '@/lib/format'
import { BlockMore } from '../BlockMore'
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
      // ячейкой, как кэфы в строках главной (владелец: «блок Коэффициенты букмекеров некрасивый» — числа висели в воздухе,
      // и было не понять, что на них можно нажать): серая плашка, выгодный — лаймом, лучший в колонке — жирным
      // число без плашки, как цифры в «Форме команд»; плашка — только у выгодного, лаймом (владелец: «Коэффициенты
      // букмекеров тоже некрасивый» — девять серых ячеек давали сетку коробочек); лучший в колонке — жирным
      <span
        className={`num inline-flex h-8 min-w-[52px] items-center justify-center rounded-full px-1.5 text-[15px] ${
          val ? 'bg-acid font-semibold text-acid-ink' : isBest ? 'font-semibold text-fg' : 'font-medium text-fg/90'
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

  // таблица перевёрнута: строки — исходы словами, колонки — букмекеры и «Честная» (владелец: «как будто вытянутый блок
  // получился» — двумя частями «Исход» и «Голы» со своими шапками и «Честной ценой» выходило ~520px на телефоне); одна
  // шапка с логотипами, строку легко сравнить: кэф букмекера рядом с честной ценой
  const colW = 'clamp(54px, 15vw, 96px)'
  const grid = { gridTemplateColumns: `minmax(0,1fr) repeat(${rows.length + (model ? 1 : 0)}, ${colW})` }
  const partners = rows.map((b) => ({ b, partner: partnerForApiBookmaker(b.bookmakerId, b.bookmakerName) }))

  return (
    <div>
      {rows.length ? (
        <div className="text-[15px]">
          <div className="grid items-end gap-x-1 pb-2" style={grid}>
            <span />
            {partners.map(({ b, partner }) => (
              <span key={`${b.bookmakerId}-${b.bookmakerName}`} title={partner?.name ?? b.bookmakerName} className="flex flex-col items-center gap-1 text-center">
                {partner ? <PartnerBadge partner={partner} size={24} /> : null}
                {/* ниже 380px — только логотип: «Мараф…» обрезалось */}
                <span className="max-w-full truncate text-[13px] text-mute max-[379px]:sr-only">{partner?.name ?? b.bookmakerName}</span>
              </span>
            ))}
            {model ? (
              <span className="text-center text-[13px] leading-tight text-mute" title="Сколько стоит исход по оценке tag.bet — без маржи букмекера">
                Честная
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

