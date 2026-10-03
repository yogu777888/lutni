import Link from 'next/link'
import { SITE } from '@/config/site'
import { addDays, diffDays, formatWeekday, ymdToNoonTs } from '@/lib/format'
import { dayHref } from '@/lib/links'

/** Короткая подпись дня: «Вчера», «Сегодня», «Завтра», дальше — «Вс 4». */
function shortDay(ymd: string, today: string): string {
  const d = diffDays(ymd, today)
  if (d === 0) return 'Сегодня'
  if (d === 1) return 'Завтра'
  if (d === -1) return 'Вчера'
  const wd = formatWeekday(ymdToNoonTs(ymd)).replace('.', '')
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)} ${Number(ymd.slice(8))}`
}

/**
 * Выбор дня — простые текстовые вкладки с лаймовой чертой под выбранным днём.
 * Не капсула: иначе их путают с меню в шапке.
 */
export function DateTabs({ active, today }: { active: string; today: string }) {
  const days = Array.from({ length: SITE.daysAhead + 2 }, (_, i) => addDays(today, i - 1))
  return (
    <nav aria-label="Выбор дня" className="scrollbar-none -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      <div className="flex w-max items-center gap-5">
        {days.map((d) => {
          const on = d === active
          return (
            <Link
              key={d}
              href={dayHref(d, today)}
              prefetch={false}
              aria-current={on ? 'page' : undefined}
              className={`inline-flex h-9 shrink-0 items-center border-b-2 text-[15px] font-medium transition-colors ${
                on ? 'border-acid text-fg' : 'border-transparent text-dim hover:text-fg'
              }`}
            >
              {shortDay(d, today)}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
