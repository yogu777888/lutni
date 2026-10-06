import { PARTNERS, partnerForApiBookmaker } from '@/config/bookmakers'
import { goHref, SPONSORED_REL } from '@/lib/affiliate'
import { formatOdd } from '@/lib/format'
import { isValue, valueThreshold, type Candidate, type ModelOutput } from '@/lib/model'
import type { BookOdds, Quote } from '@/lib/odds'
import type { Match } from '@/lib/types'
import { PartnerBadge } from '../PartnerBadge'

type Col = { key: string; label: string; get: (b: BookOdds) => Quote | undefined }

const COLS: Col[] = [
  { key: 'home', label: 'П1', get: (b) => b.x12?.home },
  { key: 'draw', label: 'Х', get: (b) => b.x12?.draw },
  { key: 'away', label: 'П2', get: (b) => b.x12?.away },
  { key: 'over2.5', label: 'ТБ 2.5', get: (b) => b.totals.find((t) => t.line === 2.5)?.over },
  { key: 'under2.5', label: 'ТМ 2.5', get: (b) => b.totals.find((t) => t.line === 2.5)?.under },
  { key: 'bttsYes', label: 'ОЗ да', get: (b) => b.btts?.yes },
]

function partnerOrder(b: BookOdds) {
  const p = partnerForApiBookmaker(b.bookmakerId, b.bookmakerName)
  return p ? PARTNERS.indexOf(p) : 100
}

/**
 * Сравнение коэффициентов: лучший в колонке подсвечен, value-коэффициенты
 * отмечены точкой, у партнёров — кнопка «Ставка» (через /go с subid).
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
  const cols = COLS.filter((c) => books.some((b) => c.get(b)))
  const best = new Map(cols.map((c) => [c.key, Math.max(0, ...books.map((b) => c.get(b)?.value ?? 0))]))
  const prob = new Map(candidates.map((c) => [c.key, c.prob]))
  const valueKeys = new Set(candidates.filter(isValue).map((c) => c.key))
  const rows = [...books].sort((a, b) => partnerOrder(a) - partnerOrder(b) || a.bookmakerName.localeCompare(b.bookmakerName))
  const open = match.status === 'scheduled'

  return (
    <div className="scrollbar-none -mx-4 overflow-x-auto sm:mx-0">
      <table className="w-full min-w-[560px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-[11px] font-medium text-mute">
            <th className="sticky left-0 z-10 bg-panel-2 py-2 pl-4 pr-2 text-left font-medium sm:pl-0">Букмекер</th>
            {cols.map((c) => (
              <th key={c.key} className="px-1 py-2 text-center font-medium">
                {c.label}
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
                <td className="sticky left-0 z-10 border-t border-edge bg-panel-2 py-2.5 pl-4 pr-2 sm:pl-0">
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
                    <span
                      className={`num relative inline-flex min-w-[54px] items-center justify-center rounded-full px-2 py-1 ${
                        isBest ? 'bg-acid/[0.12] font-semibold text-acid' : 'font-medium text-fg/85'
                      }`}
                      title={q?.opening ? `Открытие: ${q.opening.toFixed(2)}` : undefined}
                    >
                      {formatOdd(q?.value)}
                      {moved <= -0.05 ? <span className="ml-0.5 text-[9px] text-hot">▼</span> : moved >= 0.05 ? <span className="ml-0.5 text-[9px] text-mute">▲</span> : null}
                      {val ? <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-acid" title="Value" /> : null}
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
                      className="inline-flex rounded-full bg-white/[0.08] px-3 py-1.5 text-[12px] font-medium text-fg transition-colors hover:bg-fg hover:text-ink"
                    >
                      Ставка
                    </a>
                  ) : null}
                </td>
              </tr>
            )
          })}
          {model ? (
            <tr className="text-mute">
              <td className="sticky left-0 z-10 border-t border-edge-2 bg-panel-2 py-2.5 pl-4 pr-2 text-[12px] font-medium sm:pl-0">
                Справедливый (tag.bet)
              </td>
              {cols.map((c) => {
                const p = prob.get(c.key)
                return (
                  <td key={c.key} className="num border-t border-edge-2 px-1 py-2.5 text-center text-[12px]">
                    {p ? (1 / p).toFixed(2) : '—'}
                  </td>
                )
              })}
              <td className="border-t border-edge-2" />
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}
