/**
 * Кнопки и чипы внутри карточек — одна система: 32px, углы 10px, мягкая заливка без обводки.
 * Без 'use client': нужны и серверному слайду «Главных матчей», и клиентской ленте.
 */
export const CHIP = 'inline-flex h-8 items-center rounded-[10px] bg-white/[0.07] text-[13px] font-medium text-fg transition-colors hover:bg-white/[0.11]'

/** «Выгодно» — лаймовый чип. */
export const VALUE_CHIP = 'inline-flex h-8 min-w-0 items-center gap-1.5 rounded-[10px] bg-acid/[0.12] px-3 text-[13px] font-semibold text-acid'

/** Содержимое кнопки «Разбор за минуту»: лаймовый квадрат с «плей» и подпись. */
export function StoryChipFace() {
  return (
    <>
      <span className="grid h-6 w-6 place-items-center rounded-[7px] bg-acid text-acid-ink" aria-hidden>
        <svg viewBox="0 0 12 12" className="ml-px h-2.5 w-2.5" fill="currentColor">
          <path d="M3 1.5v9l7.5-4.5z" />
        </svg>
      </span>
      Разбор за минуту
    </>
  )
}

/** «Выгодно: победа «X» · 2.73» — что выгодно и за сколько. */
export function ValueChip({ label, odd }: { label: string; odd: number | null }) {
  return (
    <span className={VALUE_CHIP}>
      <span className="truncate">{label}</span>
      {odd ? <span className="num shrink-0">· {odd.toFixed(2)}</span> : null}
    </span>
  )
}
