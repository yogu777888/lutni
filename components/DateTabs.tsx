import Link from 'next/link'
import { SITE } from '@/config/site'
import { addDays, diffDays, formatWeekday, ymdToNoonTs } from '@/lib/format'
import { dayHref, listHref } from '@/lib/links'
import { DatePicker } from './DatePicker'

/** «28 сент» — день вне полосы вкладок (выбран через календарь). */
const dayMonthFmt = new Intl.DateTimeFormat('ru-RU', { timeZone: SITE.timeZone, day: 'numeric', month: 'short' })

/** Число месяца у дня недели. */
const dayNumFmt = new Intl.DateTimeFormat('ru-RU', { timeZone: SITE.timeZone, day: 'numeric' })

/**
 * Короткая подпись дня: «Вчера», «Сегодня», «Завтра», дальше — день недели с числом («Вт 6»; без числа к концу недели
 * было непонятно, какой это день — владелец согласился).
 */
function shortDay(ymd: string, today: string): string {
  const d = diffDays(ymd, today)
  if (d === 0) return 'Сегодня'
  if (d === 1) return 'Завтра'
  if (d === -1) return 'Вчера'
  const ts = ymdToNoonTs(ymd)
  const wd = formatWeekday(ts).replace('.', '')
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)} ${dayNumFmt.format(ts)}`
}

/**
 * Выбор дня — простые текстовые вкладки с лаймовой чертой под выбранным днём.
 * Не капсула: иначе их путают с меню в шапке. Пока матчи идут — красная точка у «Сегодня».
 * Стоят у списка «Все матчи дня», поэтому ведут сразу к списку выбранного дня (`hash`).
 */
export function DateTabs({
  active,
  today,
  liveToday = false,
  hash = '',
  section,
  fade = false,
  chips = false,
}: {
  active: string
  today: string
  liveToday?: boolean
  hash?: string
  /** подборка дня (`goals`, `odds`): вкладки ведут на ту же подборку другого дня */
  section?: string
  /** ниже lg слева — переключатель порядка: дни начинаются после него и листаются до края экрана, правый край затухает */
  fade?: boolean
  /** ниже lg — чипами, как у YouTube (второй ряд шапки на главной и «Матчах»): выбранный белый, остальные серые; от lg — чертой */
  chips?: boolean
}) {
  const href = (d: string) => (section === 'all' ? listHref(d, today) : section ? `/matches/${d}/${section}` : `${dayHref(d, today)}${hash}`)
  const strip = Array.from({ length: SITE.daysAhead + 2 }, (_, i) => addDays(today, i - 1))
  // день, выбранный через календарь, — отдельной вкладкой с датой: раньше полосы или после неё
  const days = strip.includes(active) ? strip : active < strip[0] ? [active, ...strip] : [...strip, active]
  const label = (d: string) => (strip.includes(d) ? shortDay(d, today) : dayMonthFmt.format(ymdToNoonTs(d)).replace('.', ''))
  return (
    <nav aria-label="Выбор дня" className={`scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 ${fade ? 'max-lg:mx-0 max-lg:pl-0 max-lg:pr-6 max-sm:[mask-image:linear-gradient(to_right,#000_calc(100%-32px),transparent)] lg:mr-0' : ''}`}
    >
      <div className={`flex w-max items-center ${chips ? 'gap-2 lg:gap-5' : 'gap-5'}`}>
        {days.map((d) => {
          const on = d === active
          return (
            <Link
              key={d}
              href={href(d)}
              prefetch={false}
              aria-current={on ? 'page' : undefined}
              // черта выбранного дня — белая, как у пункта меню в шапке (владелец спросил «а хедер как?», согласился): лаймовая
              // была единственным лаймом на экране не про ставку и спорила с выгодными кэфами; «вы здесь» — везде одного цвета
              className={
                chips
                  ? `inline-flex shrink-0 items-center font-medium transition-colors max-lg:h-8 max-lg:rounded-full max-lg:px-3.5 max-lg:text-[14px] lg:h-9 lg:border-b-2 lg:text-[15px] ${
                      on ? 'max-lg:bg-fg max-lg:text-ink lg:border-fg lg:text-fg' : 'max-lg:bg-white/[0.08] max-lg:text-fg/85 lg:border-transparent lg:text-dim lg:hover:text-fg'
                    }`
                  : `inline-flex h-9 shrink-0 items-center border-b-2 text-[15px] font-medium transition-colors ${
                      on ? 'border-fg text-fg' : 'border-transparent text-dim hover:text-fg'
                    }`
              }
            >
              {label(d)}
              {d === today && liveToday ? (
                <span className="ml-1.5 h-1.5 w-1.5 animate-pulse-live rounded-full bg-live" title="Сейчас идут матчи" aria-label="идут матчи" />
              ) : null}
            </Link>
          )
        })}
        <DatePicker active={active} today={today} min={addDays(today, -365)} max={addDays(today, 60)} hash={hash} section={section} chips={chips} />
      </div>
    </nav>
  )
}
