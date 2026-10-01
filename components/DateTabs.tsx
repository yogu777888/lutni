import Link from 'next/link'
import { SITE } from '@/config/site'
import { addDays, dayLabel, formatDayShort, ymdToNoonTs } from '@/lib/format'
import { dayHref } from '@/lib/links'

/** Выбор дня — сегментированный переключатель, как в macOS. */
export function DateTabs({ active, today }: { active: string; today: string }) {
  const days = Array.from({ length: SITE.daysAhead + 2 }, (_, i) => addDays(today, i - 1))
  return (
    <nav aria-label="Выбор дня" className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="inline-flex gap-0.5 rounded-[14px] bg-panel p-1 ring-1 ring-inset ring-edge">
        {days.map((d) => {
          const on = d === active
          return (
            <Link
              key={d}
              href={dayHref(d, today)}
              prefetch={false}
              aria-current={on ? 'page' : undefined}
              className={`flex min-w-[66px] shrink-0 flex-col items-center rounded-[10px] px-3 py-1.5 text-center transition-colors ${
                on ? 'bg-panel-3 text-fg shadow-[0_1px_2px_rgb(0_0_0/0.4)]' : 'text-dim hover:text-fg'
              }`}
            >
              <span className="text-[13px] font-medium capitalize leading-tight">{dayLabel(d, today).split(',')[0]}</span>
              <span className={`num text-[11px] leading-tight ${on ? 'text-dim' : 'text-mute'}`}>{formatDayShort(ymdToNoonTs(d))}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
