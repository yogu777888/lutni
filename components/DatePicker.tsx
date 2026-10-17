'use client'

import { useRouter } from 'next/navigation'
import { useRef } from 'react'

/**
 * Кнопка «календарь» рядом с вкладками дней: любой день в пределах года назад и двух месяцев вперёд.
 * Сам выбор — системный календарь браузера (input type=date), без своих попапов.
 */
export function DatePicker({ active, today, min, max, hash = '', section, chips = false }: { active: string; today: string; min: string; max: string; hash?: string; section?: string; chips?: boolean }) {
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
        // `chips` — ниже lg чипом, как дни рядом (ряд шапки на главной)
        className={`inline-flex h-9 items-center gap-1.5 border-b-2 border-transparent text-[15px] font-medium text-dim transition-colors hover:text-fg ${
          chips ? 'max-lg:h-8 max-lg:rounded-full max-lg:border-0 max-lg:bg-white/[0.08] max-lg:px-3 max-lg:text-[14px] max-lg:text-fg/85' : ''
        }`}
        aria-label="Выбрать дату"
        title="Выбрать дату"
      >
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="4.5" width="18" height="16.5" rx="3" />
          <path d="M16 2.5v4M8 2.5v4M3 10h18" />
        </svg>
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
