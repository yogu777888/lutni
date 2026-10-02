/**
 * Перекидное табло: «4.35» → по «флапу» на символ, как на вокзале или стадионе.
 * Тон: hot — флапы горят лаймом (цена выше честной), lime и soft — то же, но
 * слабее (перевес поменьше), amber — движение линии. Анимация — чистый CSS (globals.css).
 */
const PUNCT = /[.,%+−\-:/·× ]/

export type FlapTone = 'hot' | 'lime' | 'soft' | 'amber' | 'dim'

/** Сила перевеса — яркостью одного цвета: чем больше перевес, тем ярче лайм, минус — серый. */
export function edgeTone(ev: number): FlapTone {
  if (ev >= 0.08) return 'hot'
  if (ev >= 0.055) return 'lime'
  if (ev > 0) return 'soft'
  return 'dim'
}

export function Flaps({
  text,
  hot = false,
  tone,
  className = '',
  start = 0,
}: {
  text: string
  hot?: boolean
  tone?: FlapTone
  className?: string
  start?: number
}) {
  return (
    <span className={`flaps ${tone ?? (hot ? 'hot' : '')} ${className}`}>
      <span className="sr-only">{text}</span>
      {[...text].map((c, i) => (
        <span key={i} aria-hidden className={`flap ${PUNCT.test(c) ? 'p' : ''}`} style={{ ['--i' as string]: start + i }}>
          {c === ' ' ? ' ' : c}
        </span>
      ))}
    </span>
  )
}
