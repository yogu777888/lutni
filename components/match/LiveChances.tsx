import { SPONSORED_REL } from '@/lib/affiliate'
import { formatOdd } from '@/lib/format'

export type LiveChanceRow = {
  key: string
  label: string
  /** шанс до матча, % (по кэфам всех букмекеров без маржи); нет — «—» */
  before: number | null
  /** шанс сейчас, % (по live-кэфам PARI без маржи) */
  now: number
  odd: number
}

/**
 * «Шансы сейчас» на странице идущего матча (владелец на план «во время матча» — «давай дальше»): строка — исход, шанс до
 * матча серым, шанс сейчас белым и кэф PARI кнопкой той же формы, что в «Коэффициентах букмекеров» (рамка 4px, число на
 * цвете карточки; без лайма — «выгодно» по ходу матча мы не считаем). Пометка «PARI · Реклама · 18+» — в заголовке блока.
 */
export function LiveChances({ rows, href }: { rows: LiveChanceRow[]; href: string }) {
  const grid = 'grid grid-cols-[minmax(0,1fr)_4.25rem_3.25rem_clamp(54px,17vw,84px)] items-center gap-x-3 sm:grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_84px] sm:gap-x-4'
  return (
    <div className="-my-1">
      <div className={`${grid} whitespace-nowrap pb-2 text-[13px] text-mute`}>
        <span />
        <span className="text-right">До матча</span>
        <span className="text-right">Сейчас</span>
        <span className="text-center">PARI</span>
      </div>
      <ul className="divide-y divide-edge border-t border-edge">
        {rows.map((r) => {
          const d = r.before == null ? null : r.now - r.before
          return (
            <li key={r.key} className={`${grid} py-2.5 last:pb-1`}>
              <span className="text-[15px] leading-snug">{r.label}</span>
              <span className="num text-right text-[15px] text-dim">{r.before == null ? '—' : `${r.before}%`}</span>
              <span className="num text-right">
                <span className="block text-[16px] font-semibold">{r.now}%</span>
                {d ? (
                  <span className="block text-[12px] text-mute">
                    {d > 0 ? '▲' : '▼'} {Math.abs(d)}
                  </span>
                ) : null}
              </span>
              <a
                href={href}
                target="_blank"
                rel={SPONSORED_REL}
                title={`${r.label}: ${formatOdd(r.odd)} в PARI · Реклама 18+`}
                className="group/odd mx-auto flex h-[34px] w-full max-w-[84px] rounded-ctl bg-white/10 p-1 transition-transform duration-150 active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                <span className="num flex flex-1 items-center justify-center rounded-md bg-panel text-[15px] font-medium text-fg transition-colors duration-150 group-hover/odd:bg-fg group-hover/odd:text-ink group-focus-visible/odd:bg-fg group-focus-visible/odd:text-ink">
                  {formatOdd(r.odd)}
                </span>
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
