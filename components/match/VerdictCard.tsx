import { pct } from '@/lib/format'
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
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {ICON[icon]}
        </svg>
      </span>
      <span className="min-w-0 pt-[3px]">{children}</span>
    </li>
  )
}

/**
 * «Коротко о матче» — первым на странице: кто скорее выиграет, шансы «из 10»,
 * голы, падение кэфа и выгодная ставка словами. Цифры и таблицы — ниже,
 * для тех, кто любит разбираться.
 */
export function VerdictCard({ v, pickAnchor }: { v: Verdict; pickAnchor?: string }) {
  return (
    <section className="card p-5 sm:p-6" aria-label="Коротко о матче">
      <p className="eyebrow">Коротко о матче</p>
      <p className="mt-3 text-[24px] font-bold leading-tight tracking-[-0.025em] sm:text-[30px]">{v.headline}</p>
      <ul className="mt-5 space-y-3 text-[15px] leading-snug text-chalk">
        <Row icon="chances">Шансы: {v.chances}</Row>
        {v.goals ? <Row icon="goals">{v.goals}</Row> : null}
        {v.drop ? (
          <Row icon="money" tone="text-hot">
            {v.drop}
          </Row>
        ) : null}
        {v.bet ? (
          <Row icon="bet" tone={v.bet.value ? 'text-acid' : 'text-dim'}>
            <span className={v.bet.value ? 'font-semibold text-acid' : 'font-semibold text-fg'}>
              {v.bet.value ? 'Выгодная ставка' : 'Наш выбор'}: {v.bet.text}
              {v.bet.odd ? ` за ${v.bet.odd.toFixed(2)}` : ''}
            </span>
            {v.bet.value ? (
              <span className="text-dim"> — букмекер платит больше, чем она стоит.</span>
            ) : v.bet.prob ? (
              <span className="text-dim"> — самый вероятный исход с нормальным кэфом, шанс {pct(v.bet.prob)}.</span>
            ) : null}
            {pickAnchor ? (
              <a href={pickAnchor} className="ml-1.5 whitespace-nowrap text-dim underline decoration-edge-2 underline-offset-4 transition-colors hover:text-fg">
                Подробнее ↓
              </a>
            ) : null}
          </Row>
        ) : null}
      </ul>
      <p className="mt-5 text-[11px] text-mute">Это оценка по коэффициентам и статистике, а не гарантия результата. 18+</p>
    </section>
  )
}
