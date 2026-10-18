import type { Verdict } from '@/lib/verdict'

/** Иконки строк: тонкая линия, как в виджетах сводки. */
const ICON = {
  chances: (
    <>
      <path d="M12 3v18M5 7h14" />
      <path d="m5 7-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z" />
    </>
  ),
  goals: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m12 7 4.3 3.1-1.6 5H9.3l-1.6-5z" />
    </>
  ),
  money: (
    <>
      <path d="m22 17-8.5-8.5-5 5L2 7" />
      <path d="M16 17h6v-6" />
    </>
  ),
  bet: (
    <>
      <path d="M19 5 5 19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </>
  ),
} as const

function Row({ icon, tone = 'text-dim', children }: { icon: keyof typeof ICON; tone?: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/[0.06] ${tone}`}>
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          {ICON[icon]}
        </svg>
      </span>
      <span className="min-w-0 pt-[3px]">{children}</span>
    </li>
  )
}

/** Строки под выводом: голы и падение кэфа. */
export function VerdictRows({ v, className = '' }: { v: Verdict; className?: string }) {
  if (!v.goals && !v.drop) return null
  return (
    <ul className={`space-y-3 text-[15px] leading-snug text-chalk ${className}`}>
      {v.goals ? <Row icon="goals">{v.goals}</Row> : null}
      {v.drop ? (
        <Row icon="money" tone="text-hot">
          {v.drop}
        </Row>
      ) : null}
    </ul>
  )
}
