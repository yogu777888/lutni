'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import { pluralN } from '@/lib/format'

/** Фильтр шлёт запрос, `MoreCountries` — что страны догружены (фильтр проходит список заново). */
export const FILTER_EVENT = 'tb-league-q'
export const MORE_EVENT = 'tb-leagues-more'

/**
 * «Ещё N стран» на «Лигах и турнирах» — не в первой отдаче страницы, а следом (владелец: «чтоб на странице лиги не все сразу
 * грузилось а например при скроллинге остальное подгружалось»): грузим, когда до блока меньше 600px, его раскрыли или в
 * фильтр что-то ввели. Разметка та же (`details[data-more]`, строки `Group`) — фильтр работает с ней, как раньше.
 */
export function MoreCountries({ count, load }: { count: number; load: () => Promise<ReactNode> }) {
  const [rows, setRows] = useState<ReactNode>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')
  const ref = useRef<HTMLDetailsElement>(null)
  const started = useRef(false)

  const start = useCallback(() => {
    if (started.current) return
    started.current = true
    setState('loading')
    load().then(
      (r) => {
        setRows(r)
        setState('idle')
      },
      () => {
        started.current = false
        setState('error')
      },
    )
  }, [load])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && start(), { rootMargin: '600px 0px' })
    io.observe(el)
    const onQ = (e: Event) => (e as CustomEvent<string>).detail && start()
    window.addEventListener(FILTER_EVENT, onQ)
    return () => {
      io.disconnect()
      window.removeEventListener(FILTER_EVENT, onQ)
    }
  }, [start])

  // строки на месте — фильтру пройти список ещё раз (иначе введённое до загрузки не сузит догруженные страны)
  useEffect(() => {
    if (rows) window.dispatchEvent(new Event(MORE_EVENT))
  }, [rows])

  return (
    <details ref={ref} data-more className="group/more border-t border-edge" onToggle={(e) => e.currentTarget.open && start()}>
      <summary className="flex items-center justify-between gap-3 px-4 py-3.5 text-[14px] text-dim transition-colors hover:text-fg sm:px-5">
        <span>Ещё {pluralN(count, ['страна', 'страны', 'стран'])}</span>
        <Icon k="chevron-right" className="h-4 w-4 shrink-0 rotate-90 text-mute transition-transform group-open/more:-rotate-90" />
      </summary>
      {rows ? (
        <ul>{rows}</ul>
      ) : (
        <p data-pending className="border-t border-edge px-4 py-4 text-[14px] text-dim sm:px-5">
          {state === 'error' ? (
            <button type="button" onClick={start} className="text-fg underline-offset-4 hover:underline">
              Не загрузилось — повторить
            </button>
          ) : (
            'Загружаем страны…'
          )}
        </p>
      )}
    </details>
  )
}
