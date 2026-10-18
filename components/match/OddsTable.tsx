import Link from 'next/link'
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
 * букмекерах и больше: при двух жирной была половина таблицы — «шахматка»), у партнёров — кнопка «Ставка» (через /go
 * с subid); партнёры без линии в API — чипами под таблицей. Пояснение снизу — только про то, что есть на экране.
 * На телефоне вместо таблицы с прокруткой вбок (было видно три колонки из шести, «Ставка» уезжала за край) — карточка
 * на букмекера: название и «Ставка», ниже два ряда по три ячейки (исходы матча / голы); так же — «Честная цена».
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
  // не больше пяти чипов (легальных букмекеров теперь 17 — чипы заняли бы полэкрана), остальные — «Все букмекеры →»
  const others = open ? PARTNERS.filter((p) => !shown.has(p.slug)) : []
  const linkOnly = others.slice(0, 5)

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

  /** Ячейка кэфа — общая для таблицы и карточек на телефоне. */
  const cell = (b: BookOdds, c: Col, partner: Partner | null | undefined) => {
    const { q, isBest, p, val } = info(b, c)
    if (!q) return <span className="text-mute">—</span>
    const moved = q.opening ? q.value / q.opening - 1 : 0
    const chip = (
      // лаймом — только кэф выше честной цены, как в строках списка и «Выгодно сегодня»; лучший в колонке — белым жирным
      <span
        className={`num relative inline-flex min-w-[54px] items-center justify-center rounded-full px-2 py-1 ${
          val ? 'bg-acid font-semibold text-acid-ink' : isBest ? 'font-semibold text-fg' : 'font-medium text-fg/70'
        }`}
        title={
          [val && p ? `Выгодно: выше честной цены ${(1 / p).toFixed(2)}` : '', isBest ? 'Лучший кэф в колонке' : '', q.opening ? `Открытие: ${q.opening.toFixed(2)}` : '']
            .filter(Boolean)
            .join(' · ') || undefined
        }
      >
        {formatOdd(q.value)}
        {moved <= -0.05 ? (
          <span className={`ml-0.5 text-[9px] ${val ? '' : 'text-hot'}`}>▼</span>
        ) : moved >= 0.05 ? (
          <span className={`ml-0.5 text-[9px] ${val ? '' : 'text-mute'}`}>▲</span>
        ) : null}
      </span>
    )
    return partner && open ? (
      <a href={goHref(partner, 'odds-table', match.id)} target="_blank" rel={SPONSORED_REL} className="inline-block rounded-full transition-colors hover:bg-white/[0.06]">
        {chip}
      </a>
    ) : (
      chip
    )
  }
  const bet = (partner: Partner | null | undefined) =>
    partner && open ? (
      <a
        href={goHref(partner, 'odds-table', match.id)}
        target="_blank"
        rel={SPONSORED_REL}
        className="inline-flex rounded-full bg-white/[0.08] px-3 py-1.5 text-[12px] font-medium text-fg transition-colors hover:bg-btn hover:text-btn-ink"
      >
        Ставка
      </a>
    ) : null
  const name = (b: BookOdds, partner: Partner | null | undefined) => (
    <span className="flex min-w-0 items-center gap-2.5">
      {partner ? <PartnerBadge partner={partner} size={22} /> : <span className="h-[22px] w-[22px] rounded-[6px] bg-white/[0.06]" />}
      <span className={`truncate whitespace-nowrap ${partner ? 'font-medium' : 'text-dim'}`}>{partner?.name ?? b.bookmakerName}</span>
    </span>
  )
  const fair = (c: Col) => {
    const p = prob.get(c.key)
    return p ? (1 / p).toFixed(2) : '—'
  }

  return (
    <div>
      {/* телефон: карточка на букмекера */}
      <div className="sm:hidden">
        {rows.map((b) => {
          const partner = partnerForApiBookmaker(b.bookmakerId, b.bookmakerName)
          return (
            <div key={`${b.bookmakerId}-${b.bookmakerName}`} className="border-t border-edge py-3 first:border-t-0 first:pt-0">
              <div className="flex items-center justify-between gap-3">
                {name(b, partner)}
                {bet(partner)}
              </div>
              <div className="mt-2.5 grid grid-cols-3 gap-x-1 gap-y-2.5">
                {cols.map((c) => (
                  <div key={c.key} className="min-w-0 text-center">
                    <div title={c.title ?? c.label} className="mb-1 truncate text-[11px] text-mute">
                      {c.label}
                    </div>
                    {cell(b, c, partner)}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        {model ? (
          <div className="border-t border-edge-2 pt-3">
            <div className="text-[12.5px] font-semibold text-fg">
              Честная цена <span className="font-normal text-mute">tag.bet</span>
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-x-1 gap-y-2.5">
              {cols.map((c) => (
                <div key={c.key} className="min-w-0 text-center">
                  <div className="mb-1 truncate text-[11px] text-mute">{c.label}</div>
                  <span className="num text-[13px] font-medium text-dim">{fair(c)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* от sm — таблица */}
      <div className="hidden sm:block">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-[11px] font-medium text-mute">
              <th className="py-2 pr-2 text-left font-medium">Букмекер</th>
              {cols.map((c) => (
                <th key={c.key} title={c.title ?? c.label} className="max-w-[88px] px-1 py-2 text-center align-bottom font-medium leading-tight">
                  <span className="line-clamp-2">{c.label}</span>
                </th>
              ))}
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => {
              const partner = partnerForApiBookmaker(b.bookmakerId, b.bookmakerName)
              return (
                <tr key={`${b.bookmakerId}-${b.bookmakerName}`}>
                  <td className="border-t border-edge py-2.5 pr-2">{name(b, partner)}</td>
                  {cols.map((c) => (
                    <td key={c.key} className="border-t border-edge px-1 py-2.5 text-center">
                      {cell(b, c, partner)}
                    </td>
                  ))}
                  <td className="border-t border-edge py-2.5 pl-1 text-right">{bet(partner)}</td>
                </tr>
              )
            })}
            {model ? (
              <tr className="text-dim">
                <td className="border-t border-edge-2 py-2.5 pr-2 text-[12.5px] font-semibold text-fg">
                  Честная цена <span className="font-normal text-mute">tag.bet</span>
                </td>
                {cols.map((c) => (
                  <td key={c.key} className="num border-t border-edge-2 px-1 py-2.5 text-center text-[13px] font-medium">
                    {fair(c)}
                  </td>
                ))}
                <td className="border-t border-edge-2" />
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {linkOnly.length ? (
        // одной строкой небольших чипов: крупные цветные плашки были ярче самой таблицы, на телефоне — в три строки
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[12.5px] text-mute">{rows.length ? 'Ещё легальные букмекеры:' : 'Линия — на сайтах легальных букмекеров:'}</span>
          {linkOnly.map((p) => (
            <a
              key={p.slug}
              href={goHref(p, 'odds-table', match.id)}
              target="_blank"
              rel={SPONSORED_REL}
              className="inline-flex h-7 items-center gap-1.5 rounded-full bg-white/[0.05] pl-1 pr-2.5 text-[12.5px] font-medium text-fg/85 transition-colors hover:bg-white/[0.1] hover:text-fg"
            >
              <PartnerBadge partner={p} size={18} />
              {p.name}
            </a>
          ))}
          {others.length > linkOnly.length ? (
            <Link href="/bookmakers" className="ml-1 text-[12.5px] font-medium text-dim transition-colors hover:text-fg">
              Все букмекеры →
            </Link>
          ) : null}
        </div>
      ) : null}

      {part === 'all' ? <p className="mt-4 text-[11px] text-mute">{note}</p> : null}
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
