'use client'

import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/Icon'

/** закрыта на этом матче: `tb-cta-closed:<адрес страницы>` */
const key = () => `tb-cta-closed:${location.pathname}`

/**
 * Обёртка нижней плашки: пока кнопка в `target` (кнопка ставки в первом блоке) видна целиком, плашка уезжает вниз.
 * Целиком, а не «хоть краем»: у «Лидса» на 390×844 кнопка начиналась на 828px — плашка пряталась, а от кнопки было видно
 * 16px, и на первом экране кнопки не оставалось вовсе. Отдельно от `StickyCta`: та — серверная и получает партнёра
 * целиком (в нём RegExp — в клиентский компонент его не передать).
 *
 * Крестик над правым краем плашки и свайп вниз закрывают плашку только на этом матче до конца сессии (владелец: «над попапом
 * снизу … сверху справа надо крестик сделать?» — «да»; сначала закрывалась на всех матчах — владелец: «после того как я
 * его закрыл и он вообще перестал появляться», а «Бонуса» в шапке на телефоне больше нет, и плашка — главный путь к
 * букмекеру на матче); на другом матче — снова видна.
 */
export function StickyHide({ target, className, children }: { target: string; className: string; children: React.ReactNode }) {
  const [hide, setHide] = useState(false)
  const [closed, setClosed] = useState(false)
  const y0 = useRef<number | null>(null)
  useEffect(() => {
    try {
      setClosed(Boolean(sessionStorage.getItem(key())))
    } catch {}
    const box = document.getElementById(target)
    const el = box?.querySelector('a') ?? box
    if (!el) return
    const io = new IntersectionObserver(([e]) => setHide(e.intersectionRatio > 0.98), { threshold: [0, 1] })
    io.observe(el)
    return () => io.disconnect()
  }, [target])
  const close = () => {
    setClosed(true)
    try {
      sessionStorage.setItem(key(), '1')
    } catch {}
  }
  const off = hide || closed
  return (
    <div
      aria-hidden={off}
      inert={off}
      // закрыта крестиком — место под неё в конце подвала больше не держим (app/globals.css)
      data-closed={closed || undefined}
      onTouchStart={(e) => (y0.current = e.touches[0].clientY)}
      onTouchEnd={(e) => {
        if (y0.current != null && e.changedTouches[0].clientY - y0.current > 40) close()
        y0.current = null
      }}
      className={`${className} transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none ${off ? 'pointer-events-none translate-y-4 opacity-0' : ''}`}
    >
      {/* крестик — над правым краем плашки, в её же стекле и с той же обводкой, без тени (владелец: «в попапе не всё
          влазит … крестик справа сверху над попапом» — место слева отдали тексту; прошлый угловой кружок с тяжёлой тенью
          владелец отверг — «как то она не очень выглядит»); поле нажатия шире самого кружка */}
      <button
        type="button"
        aria-label="Скрыть"
        title="Скрыть"
        onClick={close}
        className="absolute -top-3 right-3 grid h-6 w-6 place-items-center rounded-full bg-[#151b22]/90 text-mute shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)] backdrop-blur-xl transition-colors before:absolute before:-inset-x-2.5 before:-top-2.5 before:bottom-0 before:content-[''] hover:text-fg"
      >
        <Icon k="close" className="h-3 w-3" />
      </button>
      {children}
    </div>
  )
}
