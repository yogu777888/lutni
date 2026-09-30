export function Stars({ value, max = 5, className = '' }: { value: number; max?: number; className?: string }) {
  const full = Math.round(value)
  return (
    <span className={`inline-flex gap-0.5 ${className}`} aria-label={`${value} из ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <svg key={i} viewBox="0 0 20 20" className={`h-3.5 w-3.5 ${i < full ? 'fill-acid' : 'fill-edge-2'}`} aria-hidden>
          <path d="M10 1.5l2.6 5.5 6 .8-4.4 4.1 1.1 5.9L10 15l-5.3 2.8 1.1-5.9L1.4 7.8l6-.8z" />
        </svg>
      ))}
    </span>
  )
}
