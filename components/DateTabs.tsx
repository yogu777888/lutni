import Link from 'next/link'
import { SITE } from '@/config/site'
import { addDays, dayLabel, formatDayShort, ymdToNoonTs } from '@/lib/format'
import { dayHref } from '@/lib/links'

export function DateTabs({ active, today }: { active: string; today: string }) {
  const days = Array.from({ length: SITE.daysAhead + 2 }, (_, i) => addDays(today, i - 1))
  return (
    <nav aria-label="Выбор дня" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {days.map((d) => {
        const on = d === active
        return (
          <Link
            key={d}
            href={dayHref(d, today)}
            prefetch={false}
            aria-current={on ? 'page' : undefined}
            className={`flex min-w-[76px] shrink-0 flex-col items-center rounded-xl px-3 py-2 text-center ring-1 ring-inset transition ${
              on ? 'bg-acid text-acid-ink ring-acid' : 'bg-panel text-fg ring-edge hover:ring-edge-2'
            }`}
          >
            <span className="text-[13px] font-bold capitalize leading-tight">{dayLabel(d, today).split(',')[0]}</span>
            <span className={`num text-[11px] ${on ? 'text-acid-ink/70' : 'text-dim'}`}>{formatDayShort(ymdToNoonTs(d))}</span>
          </Link>
        )
      })}
    </nav>
  )
}
