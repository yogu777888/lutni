'use client'

import { useEffect, useState } from 'react'

/**
 * Согласие на cookie аналитики: 'yes' / 'no' в localStorage, нет записи — ещё не выбирали (показываем плашку).
 * Яндекс Метрика грузится только при 'yes' (`Metrika.tsx`). Старый ключ `tb-cookie-ok` (плашка с одной кнопкой
 * «Хорошо») считаем согласием. Смена выбора — событие `tb-consent` на window.
 */
export type Consent = 'yes' | 'no' | null

const KEY = 'tb-cookie'
const EVENT = 'tb-consent'

export function readConsent(): Consent {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'yes' || v === 'no') return v
    if (localStorage.getItem('tb-cookie-ok')) return 'yes'
  } catch {}
  return null
}

export function setConsent(v: Consent) {
  try {
    localStorage.removeItem('tb-cookie-ok')
    if (v) localStorage.setItem(KEY, v)
    else localStorage.removeItem(KEY)
  } catch {}
  window.dispatchEvent(new Event(EVENT))
}

/** undefined — ещё не прочитали (сервер и первый кадр). */
export function useConsent(): Consent | undefined {
  const [v, setV] = useState<Consent | undefined>(undefined)
  useEffect(() => {
    const read = () => setV(readConsent())
    read()
    window.addEventListener(EVENT, read)
    window.addEventListener('storage', read)
    return () => {
      window.removeEventListener(EVENT, read)
      window.removeEventListener('storage', read)
    }
  }, [])
  return v
}
