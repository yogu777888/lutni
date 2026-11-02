import type { OutcomeNote } from '@/lib/outcome-notes'
import type { Match } from '@/lib/types'
import { Icon } from '../Icon'
import { label, OutcomeIcon } from './BetMarkets'

/**
 * «Разбор исходов» во вкладке «Ставки»: у каждого исхода — шанс по кэфам без маржи (откуда «оценка») и факты прошлых игр
 * по теме исхода: «за» — ✓ белым, «против» — ✕ серым, без перевеса — точкой. Строки-раскрывашки, как части «Прогноза на матч»; текст целиком — в разметке.
 */
export function OutcomeNotes({ match: m, notes }: { match: Match; notes: OutcomeNote[] }) {
  const shown = notes.filter((n) => n.lines.length)
  return (
    <div className="-my-2">
      {shown.map((n, i) => (
        <details key={n.key} className={`group ${i ? 'border-t border-edge' : ''}`}>
          <summary className="flex min-h-14 list-none items-center gap-3 py-2 [&::-webkit-details-marker]:hidden">
            <OutcomeIcon k={n.key} m={m} />
            <span className="min-w-0 flex-1 text-[15px] font-semibold leading-tight">{label(n.key, m)}</span>
            {n.chance != null ? (
              <span className="shrink-0 text-right text-[13px] leading-tight text-dim">
                шанс <span className="num text-[15px] font-semibold text-fg">{Math.round(n.chance * 100)}%</span>
              </span>
            ) : null}
            <Icon k="chevron-right" className="h-4 w-4 shrink-0 text-mute transition-transform group-open:rotate-90" />
          </summary>
          <div className="pb-4 pl-[34px] text-[15px] leading-relaxed">
            {n.chance != null ? (
              <p className="text-[14px] text-dim">
                Шанс — по кэфам букмекеров без маржи, честный кэф <span className="num">{(1 / n.chance).toFixed(2)}</span>.
              </p>
            ) : null}
            <ul className="mt-2 space-y-1.5">
              {n.lines.map((l) => (
                <li key={l.text} className={`flex gap-2 ${l.tone === 'pro' ? 'text-fg' : 'text-dim'}`}>
                  {l.tone === 'neutral' ? (
                    <span className="mt-[3px] grid size-4 shrink-0 place-items-center" aria-hidden>
                      <span className="size-1 rounded-full bg-current" />
                    </span>
                  ) : (
                    <Icon k={l.tone === 'pro' ? 'check' : 'close'} className="mt-[3px] size-4 shrink-0" />
                  )}
                  <span>
                    {l.tone === 'pro' ? <span className="sr-only">За: </span> : l.tone === 'con' ? <span className="sr-only">Против: </span> : null}
                    {l.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </details>
      ))}
    </div>
  )
}
