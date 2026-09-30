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
          <tr className="text-[11px] font-bold uppercase tracking-wide text-mute">
            <th className="sticky left-0 z-10 bg-panel py-2 pl-4 pr-2 text-left sm:pl-0">Букмекер</th>
            {cols.map((c) => (
              <th key={c.key} className="px-1 py-2 text-center">
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
              <tr key={`${b.bookmakerId}-${b.bookmakerName}`} className={partner ? 'bg-acid/[0.03]' : ''}>
                <td className="sticky left-0 z-10 border-t border-edge bg-panel py-2 pl-4 pr-2 sm:pl-0">
                  <span className="flex items-center gap-2">
                    {partner ? <PartnerBadge partner={partner} size={22} /> : <span className="h-[22px] w-[22px] rounded-md bg-panel-3" />}
                    <span className={`whitespace-nowrap ${partner ? 'font-bold' : 'text-dim'}`}>{partner?.name ?? b.bookmakerName}</span>
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
                      className={`num relative inline-flex min-w-[52px] items-center justify-center rounded-md px-1.5 py-1 font-bold ${
                        isBest ? 'bg-acid/15 text-acid ring-1 ring-inset ring-acid/40' : 'bg-panel-2'
                      }`}
                      title={q?.opening ? `Открытие: ${q.opening.toFixed(2)}` : undefined}
                    >
                      {formatOdd(q?.value)}
                      {moved <= -0.05 ? <span className="ml-0.5 text-[9px] text-loss">▼</span> : moved >= 0.05 ? <span className="ml-0.5 text-[9px] text-win">▲</span> : null}
                      {val ? <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-panel" title="Value" /> : null}
                    </span>
                  )
                  return (
                    <td key={c.key} className="border-t border-edge px-1 py-2 text-center">
                      {q && partner && open ? (
                        <a href={goHref(partner, 'odds-table', match.id)} target="_blank" rel={SPONSORED_REL} className="inline-block transition hover:brightness-125">
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
                <td className="border-t border-edge py-2 pl-1 pr-4 text-right sm:pr-0">
                  {partner && open ? (
                    <a
                      href={goHref(partner, 'odds-table', match.id)}
                      target="_blank"
                      rel={SPONSORED_REL}
                      className="inline-flex rounded-lg bg-acid px-3 py-1.5 text-xs font-extrabold text-acid-ink hover:brightness-110"
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
              <td className="sticky left-0 z-10 border-t border-edge-2 bg-panel py-2 pl-4 pr-2 text-xs font-semibold sm:pl-0">
                Справедливый (tag.bet)
              </td>
              {cols.map((c) => {
                const p = prob.get(c.key)
                return (
                  <td key={c.key} className="num border-t border-edge-2 px-1 py-2 text-center text-xs">
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
