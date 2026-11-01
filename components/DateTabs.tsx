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
  /** второй ряд шапки на главной и «Матчах»: ряд сдвинут на −12px только от lg (ниже lg слева значки порядка и кэфов) */
  chips?: boolean
}) {
  const href = (d: string) => (section === 'all' ? listHref(d, today) : section ? `/matches/${d}/${section}` : `${dayHref(d, today)}${hash}`)
  const strip = Array.from({ length: SITE.daysAhead + 2 }, (_, i) => addDays(today, i - 1))
  // день, выбранный через календарь, — отдельной вкладкой с датой: раньше полосы или после неё
  const days = strip.includes(active) ? strip : active < strip[0] ? [active, ...strip] : [...strip, active]
  const label = (d: string) => (strip.includes(d) ? shortDay(d, today) : dayMonthFmt.format(ymdToNoonTs(d)).replace('.', ''))
  return (
    <nav aria-label="Выбор дня" className={`scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 ${chips ? 'lg:-ml-3' : 'max-sm:pl-1 sm:-ml-3'} ${fade ? 'max-lg:mx-0 max-lg:pl-0 max-lg:pr-6 max-sm:[mask-image:linear-gradient(to_right,#000_calc(100%-32px),transparent)] lg:mr-0' : ''}`}
    >
      <div className={`flex w-max items-center gap-0.5`}>
        {days.map((d) => {
          const on = d === active
          return (
            <Link
              key={d}
              href={href(d)}
              prefetch={false}
              aria-current={on ? 'page' : undefined}
              // черта выбранного дня — белая, как у пункта меню в шапке (владелец спросил «а хедер как?», согласился): лаймовая
              // была единственным лаймом на экране не про ставку и спорила с выгодными кэфами; «вы здесь» — везде одного цвета.
              // На компьютере дни — тем же видом, что меню в шапке (`NavLinks`; владелец: «при наведении на кнопки в меню есть
              // задний фон светлый прямоугольный а … в сортировке по дням другие эффекты»): поле 12px, при наведении — светлая
              // плашка `white/12`, черта выбранного — короткая под текстом; ряд сдвинут на −12px, текст стоит, где стоял
              // ниже lg — тем же видом, что на компьютере (владелец: «а кнопки навигации сделать как на пк?»): текст, у
              // выбранного — белый и короткая черта под ним; чипов с заливкой, как у YouTube, больше нет; нажатие — плашкой
              className={`relative inline-flex h-9 shrink-0 items-center rounded-ctl px-3 text-[15px] font-medium transition-colors ${
                on ? 'text-fg' : 'text-dim hover:bg-white/12 hover:text-fg max-lg:active:bg-white/12'
              }`}
            >
              {label(d)}
              {on ? <span aria-hidden className="absolute inset-x-3 bottom-0.5 h-[2.5px] rounded-full bg-fg" /> : null}
              {/* точка «идут матчи» — только у невыбранного «Сегодня»: на белом чипе она читалась бледным значком уведомления, а
                  идущие матчи и так видны ниже */}
              {d === today && liveToday && !on ? (
                <span className="ml-1.5 h-1.5 w-1.5 animate-pulse-live rounded-full bg-live" title="Сейчас идут матчи" aria-label="идут матчи" />
              ) : null}
            </Link>
          )
        })}
        <DatePicker active={active} today={today} min={addDays(today, -365)} max={addDays(today, 60)} hash={hash} section={section} />
      </div>
    </nav>
  )
}
