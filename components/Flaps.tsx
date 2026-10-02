/**
 * Перекидное табло: «4.35» → по «флапу» на символ, как на вокзале или стадионе.
 * hot — флапы горят лаймом: цена выше честной. Анимация — чистый CSS (globals.css).
 */
const PUNCT = /[.,%+−\-:/·× ]/

export function Flaps({ text, hot = false, className = '', start = 0 }: { text: string; hot?: boolean; className?: string; start?: number }) {
  return (
    <span className={`flaps ${hot ? 'hot' : ''} ${className}`}>
      <span className="sr-only">{text}</span>
      {[...text].map((c, i) => (
        <span key={i} aria-hidden className={`flap ${PUNCT.test(c) ? 'p' : ''}`} style={{ ['--i' as string]: start + i }}>
          {c === ' ' ? ' ' : c}
        </span>
      ))}
    </span>
  )
}
