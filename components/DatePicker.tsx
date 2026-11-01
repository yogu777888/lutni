'use client'

import { useRouter } from 'next/navigation'
import { useRef } from 'react'
import { Icon } from '@/components/Icon'

/**
 * Кнопка «календарь» рядом с вкладками дней: любой день в пределах года назад и двух месяцев вперёд.
 * Сам выбор — системный календарь браузера (input type=date), без своих попапов.
 */
export function DatePicker({ active, today, min, max, hash = '', section }: { active: string; today: string; min: string; max: string; hash?: string; section?: string }) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)

  const open = () => {
    const el = input.current
    if (!el) return
    // showPicker есть во всех свежих браузерах; если нет — фокус откроет выбор даты на телефоне
    try {
      el.showPicker()
    } catch {
      el.focus()
      el.click()
    }
  }

  return (
    <span className="relative inline-flex shrink-0">
      <button
        type="button"
        onClick={open}
        // как дни рядом — текстом без заливки, на всех ширинах
        className="inline-flex h-9 items-center gap-1.5 rounded-ctl px-3 text-[15px] font-medium text-dim transition-colors hover:bg-white/12 hover:text-fg"

        aria-label="Выбрать дату"
        title="Выбрать дату"
      >
        <Icon k="calendar" className="h-[18px] w-[18px]" />
        <span className="hidden sm:inline">Дата</span>
      </button>
      <input
        ref={input}
        type="date"
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 h-px w-px opacity-0"
        value={active}
        min={min}
        max={max}
        onChange={(e) => {
          const d = e.target.value
          if (/^\d{4}-\d{2}-\d{2}$/.test(d) && d >= min && d <= max) router.push(section === 'all' ? (d === today ? '/matches' : `/matches/${d}/all`) : section ? `/matches/${d}/${section}` : `${d === today ? '/' : `/matches/${d}`}${hash}`)
        }}
      />
    </span>
  )
}
