'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const KEY = 'tb-cookie-ok'

/**
 * Плашка про cookie — небольшая карточка в левом нижнем углу (на телефоне — во всю ширину снизу), как на аккуратных
 * сайтах: одна фраза, «Подробнее» и «Понятно». Нужна по 152-ФЗ: на сайте Яндекс Метрика с cookie и Вебвизором.
 * Закрыли — запоминаем в localStorage и больше не показываем. До проверки ничего не рисуем — без мигания.
 */
export function CookieNotice() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true)
    } catch {
      setShow(true)
    }
  }, [])
  if (!show) return null
  const close = () => {
    try {
      localStorage.setItem(KEY, '1')
    } catch {}
    setShow(false)
  }
  return (
    <div
      role="region"
      aria-label="Cookie"
      className="fixed inset-x-3 bottom-3 z-[60] rounded-[18px] bg-[#151b22]/95 p-4 text-[13.5px] leading-relaxed text-[#eef2f6]/80 shadow-[0_12px_40px_rgb(0_0_0/0.45),inset_0_0_0_1px_rgb(255_255_255/0.08)] backdrop-blur-md sm:inset-x-auto sm:bottom-5 sm:left-5 sm:max-w-[380px]"
    >
      Мы используем cookie и Яндекс Метрику, чтобы понимать, какие разделы полезны. Пользуясь сайтом, вы соглашаетесь с этим.{' '}
      <Link href="/privacy" className="whitespace-nowrap text-[#eef2f6] underline decoration-white/30 underline-offset-2 hover:decoration-white">
        Подробнее
      </Link>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={close}
          className="inline-flex h-9 items-center rounded-[11px] bg-[#c8ff2e] px-4 text-[14px] font-semibold text-[#141a00] transition-colors hover:bg-[#d8ff6b]"
        >
          Понятно
        </button>
      </div>
    </div>
  )
}
