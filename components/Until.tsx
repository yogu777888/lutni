'use client'

import { useEffect, useState } from 'react'
import { untilText } from './shell/StateLine'

/** Не дальше 6 часов: «через 9 ч 40 мин» в списке уже ничего не говорит — время начала и так слева. */
const MAX_MIN = 6 * 60

/**
 * Отсчёт до начала в строке матча на месте счёта — когда кэфы выключены («Без кэфов»; владелец: «матчи без счёта там всё
 * равно пусто» — выбрал «отсчёт до начала»): «через 40 мин», «через 2 ч 15 мин». Страница готовая на 30 с, поэтому текст
 * считает браузер после загрузки (с сервера — пусто, разметка совпадает), часы — браузера со сдвигом часов сайта (`skew`:
 * в демо часы стоят), пересчёт раз в 30 с.
 */
export function Until({ ts, skew }: { ts: number; skew: number }) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    const tick = () => setNow(Date.now() + skew)
    tick()
    const id = window.setInterval(tick, 30_000)
    return () => window.clearInterval(id)
  }, [skew])
  if (now === null) return null
  const min = Math.ceil((ts - now) / 60_000)
  if (min > MAX_MIN) return null
  const t = untilText(min)
  const rest = t.replace(/^через /, '')
  // на телефоне — в две строки по правому краю («через» / «3 ч 30 мин»): одной строкой обрезались названия команд
  return t === rest ? (
    <span className="text-right text-[13px] leading-tight text-mute sm:whitespace-nowrap sm:text-[14px]">{t}</span>
  ) : (
    <span className="text-right text-[13px] leading-tight text-mute sm:whitespace-nowrap sm:text-[14px]">
      через<span className="max-sm:block sm:before:content-['_']">{rest}</span>
    </span>
  )
}
