import Link from 'next/link'
import { SITE } from '@/config/site'
import { addDays, diffDays, formatWeekday, ymdToNoonTs } from '@/lib/format'
import { dayHref } from '@/lib/links'

const monthFmt = new Intl.DateTimeFormat('ru-RU', { timeZone: SITE.timeZone, month: 'short' })

/** Подпись под числом: «Сегодня», «Завтра», «Вчера» или месяц («окт»). */
function note(ymd: string, today: string): string {
  const d = diffDays(ymd, today)
  if (d === 0) return 'Сегодня'
  if (d === 1) return 'Завтра'
  if (d === -1) return 'Вчера'
  return monthFmt.format(new Date(ymdToNoonTs(ymd))).replace('.', '')
}

/**
 * Выбор дня — полоска-календарь под заголовком: день недели, число и «сегодня/завтра».
 * Специально не похожа на меню в шапке: это не раздел сайта, а дата, на которую показана вся страница.
 */
export function DateTabs({ active, today }: { active: string; today: string }) {
  const days = Array.from({ length: SITE.daysAhead + 2 }, (_, i) => addDays(today, i - 1))
  return (
    <nav aria-label="Выбор дня" className="scrollbar-none -mx-5 flex gap-1.5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      {days.map((d) => {
        const on = d === active
        return (
          <Link
            key={d}
            href={dayHref(d, today)}
            prefetch={false}
            aria-current={on ? 'date' : undefined}
            className={`flex w-[68px] shrink-0 flex-col items-center rounded-2xl border pb-2 pt-1.5 transition-colors ${
              on ? 'border-edge-2 bg-panel-2 text-fg' : 'border-transparent text-dim hover:bg-white/[0.03] hover:text-fg'
            }`}
          >
            <span className="text-[11px] font-medium uppercase tracking-[0.08em]">{formatWeekday(ymdToNoonTs(d)).replace('.', '')}</span>
            <span className="num text-[22px] font-semibold leading-tight">{Number(d.slice(8))}</span>
            <span className={`text-[11px] ${on ? 'font-semibold text-acid' : 'text-mute'}`}>{note(d, today)}</span>
          </Link>
        )
      })}
    </nav>
  )
}
