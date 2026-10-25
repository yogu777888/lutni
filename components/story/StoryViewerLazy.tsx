'use client'

import { useEffect, useRef, useState, type ComponentType } from 'react'
import { OPEN_STORY, type OpenStoryDetail } from './events'

/**
 * Просмотр историй — отдельным куском кода, не со страницей (владелец: «чтоб не все сразу грузилось»): его открывают по
 * нажатию, а со слайдами и графиками он — самый тяжёлый клиентский код сайта. Подгружаем, когда браузер свободен, или
 * сразу по первому открытию (`openStory`, `?story=`); нажатие до загрузки не теряется — передаём его просмотру, как
 * только он начал слушать.
 */
export function StoryViewerLazy() {
  const [Viewer, setViewer] = useState<ComponentType | null>(null)
  const pending = useRef<OpenStoryDetail | null>(null)
  const ready = useRef(false)

  useEffect(() => {
    let started = false
    const load = () => {
      if (started) return
      started = true
      void import('./StoryViewer').then((m) => setViewer(() => m.StoryViewer))
    }
    const onOpen = (e: Event) => {
      if (ready.current) return
      pending.current = (e as CustomEvent<OpenStoryDetail>).detail
      load()
    }
    window.addEventListener(OPEN_STORY, onOpen)
    if (new URLSearchParams(location.search).get('story')) load()
    const idle = window.requestIdleCallback ? window.requestIdleCallback(load, { timeout: 4000 }) : window.setTimeout(load, 2500)
    return () => {
      window.removeEventListener(OPEN_STORY, onOpen)
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle)
      else window.clearTimeout(idle)
    }
  }, [])

  // эффекты просмотра (подписка на OPEN_STORY) отработали раньше этого — повторяем отложенное открытие
  useEffect(() => {
    if (!Viewer) return
    ready.current = true
    if (!pending.current) return
    const d = pending.current
    pending.current = null
    window.dispatchEvent(new CustomEvent<OpenStoryDetail>(OPEN_STORY, { detail: d }))
  }, [Viewer])

  return Viewer ? <Viewer /> : null
}
