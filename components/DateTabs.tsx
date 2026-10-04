import Link from 'next/link'
import { SITE } from '@/config/site'
import { addDays, diffDays, formatWeekday, ymdToNoonTs } from '@/lib/format'
import { dayHref } from '@/lib/links'
import { DatePicker } from './DatePicker'

/** «28 сент» — день вне полосы вкладок (выбран через календарь). */
const dayMonthFmt = new Intl.DateTimeFormat('ru-RU', { timeZone: SITE.timeZone, day: 'numeric', month: 'short' })

/** Короткая подпись дня: «Вчера», «Сегодня», «Завтра», дальше — день недели («Вт»): дни идут подряд, число лишнее. */
function shortDay(ymd: string, today: string): string {
  const d = diffDays(ymd, today)
  if (d === 0) return 'Сегодня'
  if (d === 1) return 'Завтра'
  if (d === -1) return 'Вчера'
  const wd = formatWeekday(ymdToNoonTs(ymd)).replace('.', '')
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)}`
}

/**
 * Выбор дня — простые текстовые вкладки с лаймовой чертой под выбранным днём.
 * Не капсула: иначе их путают с меню в шапке. Пока матчи идут — красная точка у «Сегодня».
 * Стоят у списка «Все матчи дня», поэтому ведут сразу к списку выбранного дня (`hash`).
 */
export function DateTabs({ active, today, liveToday = false, hash = '' }: { active: string; today: string; liveToday?: boolean; hash?: string }) {
  const strip = Array.from({ length: SITE.daysAhead + 2 }, (_, i) => addDays(today, i - 1))
  // день, выбранный через календарь, — отдельной вкладкой с датой: раньше полосы или после неё
  const days = strip.includes(active) ? strip : active < strip[0] ? [active, ...strip] : [...strip, active]
  const label = (d: string) => (strip.includes(d) ? shortDay(d, today) : dayMonthFmt.format(ymdToNoonTs(d)).replace('.', ''))
  return (
    <nav aria-label="Выбор дня" className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex w-max items-center gap-5">
        {days.map((d) => {
          const on = d === active
          return (
            <Link
              key={d}
              href={`${dayHref(d, today)}${hash}`}
              prefetch={false}
              aria-current={on ? 'page' : undefined}
              className={`inline-flex h-9 shrink-0 items-center border-b-2 text-[15px] font-medium transition-colors ${
                on ? 'border-acid text-fg' : 'border-transparent text-dim hover:text-fg'
              }`}
            >
              {label(d)}
              {d === today && liveToday ? (
                <span className="ml-1.5 h-1.5 w-1.5 animate-pulse-live rounded-full bg-live" title="Сейчас идут матчи" aria-label="идут матчи" />
              ) : null}
            </Link>
          )
        })}
        <DatePicker active={active} today={today} min={addDays(today, -365)} max={addDays(today, 60)} hash={hash} />
      </div>
    </nav>
  )
}
