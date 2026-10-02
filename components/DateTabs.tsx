import Link from 'next/link'
import { SITE } from '@/config/site'
import { addDays, dayLabel, formatDayShort, ymdToNoonTs } from '@/lib/format'
import { dayHref } from '@/lib/links'

/** Выбор дня: «пилюли», выбранная — светлая. */
export function DateTabs({ active, today }: { active: string; today: string }) {
  const days = Array.from({ length: SITE.daysAhead + 2 }, (_, i) => addDays(today, i - 1))
  return (
    <nav aria-label="Выбор дня" className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      {days.map((d) => {
        const on = d === active
        return (
          <Link
            key={d}
            href={dayHref(d, today)}
            prefetch={false}
            aria-current={on ? 'page' : undefined}
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13.5px] font-semibold capitalize transition-colors ${
              on ? 'border-fg bg-fg text-ink' : 'border-edge-2 text-fg hover:bg-white/[0.04]'
            }`}
          >
            {dayLabel(d, today).split(',')[0]}
            <span className={`num text-[12px] font-medium ${on ? 'text-ink/55' : 'text-mute'}`}>{formatDayShort(ymdToNoonTs(d))}</span>
          </Link>
        )
      })}
    </nav>
  )
}
