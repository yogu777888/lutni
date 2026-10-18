'use client'

import { useMatchTint } from '../shell/tint'

/**
 * Кромка цветов клубов по верхнему краю табло, как в телетрансляциях (владелец: «самый верхний блок сделать максимально
 * стильно и круто так как это будет лицо страницы матча» — «сделай как считаешь лучше»): 4px, левая половина — цвет
 * хозяев, правая — гостей. Не размытое свечение (его владелец убрал — «мутные пятна»), а ровная полоса. Цвета эмблем
 * догружаются (`/api/tint`), страница их не ждёт; пока цветов нет — кромки нет.
 */
export function ClubStripe({ id, ymd }: { id: number; ymd: string }) {
  const t = useMatchTint(id, ymd, null)
  if (!t) return null
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 flex h-1">
      <div className="flex-1" style={{ background: t.home }} />
      <div className="flex-1" style={{ background: t.away }} />
    </div>
  )
}
