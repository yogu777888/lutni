const STAR = 'M10 1.5l2.6 5.5 6 .8-4.4 4.1 1.1 5.9L10 15l-5.3 2.8 1.1-5.9L1.4 7.8l6-.8z'

/** Звёзды с дробным заполнением: 4.6 — это 4 полные и 0.6 пятой. */
export function Stars({ value, max = 5, className = '' }: { value: number; max?: number; className?: string }) {
  const pct = Math.max(0, Math.min(1, value / max)) * 100
  const row = (cls: string) => (
    <span className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <svg key={i} viewBox="0 0 20 20" className={`h-3.5 w-3.5 shrink-0 ${cls}`} aria-hidden>
          <path d={STAR} />
        </svg>
      ))}
    </span>
  )
  return (
    <span className={`relative inline-flex ${className}`} role="img" aria-label={`Рейтинг ${value.toFixed(1)} из ${max}`}>
      {row('fill-edge-2')}
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${pct}%` }}>
        {row('fill-acid')}
      </span>
    </span>
  )
}
