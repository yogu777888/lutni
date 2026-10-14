import { PARTNERS, partnerForApiBookmaker } from '@/config/bookmakers'
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
 * Сравнение коэффициентов: лучший в колонке — белым жирным, выгодные (выше честной цены)
 * лаймом, у партнёров — кнопка «Ставка» (через /go с subid); партнёры без линии в API — чипами под таблицей.
 */
export function OddsTable({
  match,
  books,
  model,
  candidates,
}: {
  match: Match
  books: BookOdds[]
  model: ModelOutput | null
  candidates: Candidate[]
}) {
  const cols = colsFor(match).filter((c) => books.some((b) => c.get(b)))
  const best = new Map(cols.map((c) => [c.key, Math.max(0, ...books.map((b) => c.get(b)?.value ?? 0))]))
  const prob = new Map(candidates.map((c) => [c.key, c.prob]))
  const valueKeys = new Set(candidates.filter(isValue).map((c) => c.key))
  const rows = [...books].sort((a, b) => partnerOrder(a) - partnerOrder(b) || a.bookmakerName.localeCompare(b.bookmakerName))
  const open = match.status === 'scheduled'
  // легальные партнёры, чьих кэфов нет в API (Фонбет, Winline, BetBoom, Лига Ставок — их нет в /Odds SStats): строка
  // со ссылкой на сайт, а не прочерки — шесть «—» подряд читаются как «сломалось» (владелец: «у кого нет кэфов просто
  // ссылку на их сайт»); чужие кэфы под их имя не подставляем
  const shown = new Set(rows.map((b) => partnerForApiBookmaker(b.bookmakerId, b.bookmakerName)?.slug))
  const linkOnly = open ? PARTNERS.filter((p) => !shown.has(p.slug)) : []

  return (
    <div className="scrollbar-none -mx-4 overflow-x-auto sm:mx-0">
      <table className="w-full min-w-[560px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-[11px] font-medium text-mute">
            <th className="sticky left-0 z-10 odds-sticky py-2 pl-4 pr-2 text-left font-medium sm:pl-0">Букмекер</th>
            {cols.map((c) => (
              <th key={c.key} title={c.title ?? c.label} className="max-w-[88px] px-1 py-2 text-center align-bottom font-medium leading-tight">
                <span className="line-clamp-2">{c.label}</span>
              </th>
            ))}
            <th className="py-2 pr-4 sm:pr-0" />
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => {
            const partner = partnerForApiBookmaker(b.bookmakerId, b.bookmakerName)
            return (
              <tr key={`${b.bookmakerId}-${b.bookmakerName}`}>
                <td className="sticky left-0 z-10 border-t border-edge odds-sticky py-2.5 pl-4 pr-2 sm:pl-0">
                  <span className="flex items-center gap-2.5">
                    {partner ? <PartnerBadge partner={partner} size={22} /> : <span className="h-[22px] w-[22px] rounded-[6px] bg-white/[0.06]" />}
                    <span className={`whitespace-nowrap ${partner ? 'font-medium' : 'text-dim'}`}>{partner?.name ?? b.bookmakerName}</span>
                  </span>
                </td>
                {cols.map((c) => {
                  const q = c.get(b)
                  const isBest = q && q.value === best.get(c.key) && rows.length > 1
                  const p = prob.get(c.key)
                  const val = q && p && open && valueKeys.has(c.key) && p * q.value - 1 >= valueThreshold(q.value)
                  const moved = q?.opening ? q.value / q.opening - 1 : 0
                  const cell = (
                    // лаймом — только кэф выше честной цены, как в строках списка и «Выгодно сегодня» (владелец согласился: лаймом
                    // горел «лучший в колонке», и при двух букмекерах выгодными выглядели кэфы ниже честной цены); лучший в
                    // колонке — белым жирным
                    <span
                      className={`num relative inline-flex min-w-[54px] items-center justify-center rounded-full px-2 py-1 ${
                        val ? 'bg-acid font-semibold text-acid-ink' : isBest ? 'font-semibold text-fg' : 'font-medium text-fg/70'
                      }`}
                      title={
                        [val && p ? `Выгодно: выше честной цены ${(1 / p).toFixed(2)}` : '', isBest ? 'Лучший кэф в колонке' : '', q?.opening ? `Открытие: ${q.opening.toFixed(2)}` : '']
                          .filter(Boolean)
                          .join(' · ') || undefined
                      }
                    >
                      {formatOdd(q?.value)}
                      {moved <= -0.05 ? (
                        <span className={`ml-0.5 text-[9px] ${val ? '' : 'text-hot'}`}>▼</span>
                      ) : moved >= 0.05 ? (
                        <span className={`ml-0.5 text-[9px] ${val ? '' : 'text-mute'}`}>▲</span>
                      ) : null}
                    </span>
                  )
                  return (
                    <td key={c.key} className="border-t border-edge px-1 py-2.5 text-center">
                      {q && partner && open ? (
                        <a href={goHref(partner, 'odds-table', match.id)} target="_blank" rel={SPONSORED_REL} className="inline-block rounded-full transition-colors hover:bg-white/[0.06]">
                          {cell}
                        </a>
                      ) : q ? (
                        cell
                      ) : (
                        <span className="text-mute">—</span>
                      )}
                    </td>
                  )
                })}
                <td className="border-t border-edge py-2.5 pl-1 pr-4 text-right sm:pr-0">
                  {partner && open ? (
                    <a
                      href={goHref(partner, 'odds-table', match.id)}
                      target="_blank"
                      rel={SPONSORED_REL}
                      className="inline-flex rounded-full bg-white/[0.08] px-3 py-1.5 text-[12px] font-medium text-fg transition-colors hover:bg-btn hover:text-btn-ink"
                    >
                      Ставка
                    </a>
                  ) : null}
                </td>
              </tr>
            )
          })}
          {model ? (
            <tr className="text-dim">
              <td className="sticky left-0 z-10 border-t border-edge-2 odds-sticky py-2.5 pl-4 pr-2 text-[12.5px] font-semibold text-fg sm:pl-0">
                Честная цена <span className="font-normal text-mute">tag.bet</span>
              </td>
              {cols.map((c) => {
                const p = prob.get(c.key)
                return (
                  <td key={c.key} className="num border-t border-edge-2 px-1 py-2.5 text-center text-[13px] font-medium">
                    {p ? (1 / p).toFixed(2) : '—'}
                  </td>
                )
              })}
              <td className="border-t border-edge-2" />
            </tr>
          ) : null}
        </tbody>
      </table>
      {linkOnly.length ? (
        // одной строкой чипов, а не строкой на каждого: четыре одинаковые «Линия — на сайте букмекера» были выше самих кэфов
        <div className="mt-4 flex flex-wrap items-center gap-2 px-4 sm:px-0">
          <span className="mr-1 text-[13px] text-mute">{rows.length ? 'Ещё легальные букмекеры:' : 'Линия — на сайтах легальных букмекеров:'}</span>
          {linkOnly.map((p) => (
            <a
              key={p.slug}
              href={goHref(p, 'odds-table', match.id)}
              target="_blank"
              rel={SPONSORED_REL}
              className="inline-flex h-8 items-center gap-2 rounded-full bg-white/[0.06] pl-1 pr-3 text-[13px] font-medium text-fg transition-colors hover:bg-white/[0.12]"
            >
              <PartnerBadge partner={p} size={22} />
              {p.name}
            </a>
          ))}
        </div>
      ) : null}
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
