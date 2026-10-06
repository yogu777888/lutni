'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { SPONSORED_REL } from '@/lib/affiliate'
import type { StoryData } from '@/lib/story'
import { artFor, artGlow } from '@/lib/story-art'
import { TeamLogo } from '../TeamLogo'
import { OPEN_STORY, openStory, type OpenStoryDetail, type StoryQueueItem } from './events'
import { markSeen, type SeenMark } from './seen'
import { Slide, SLIDE_MS } from './slides'

type Item = StoryQueueItem

/** Как вести себя, если у матча нет сторис: strict — сразу открыть его страницу, иначе пропустить. */
type ShowOpts = { strict?: boolean; fallbackHref?: string }

/** Матчи на странице по порядку — по ним листаем дальше, как в соцсетях. */
function collect(d: OpenStoryDetail): Item[] {
  const seen = new Set<number>()
  const list: Item[] = []
  document.querySelectorAll<HTMLAnchorElement>('a[data-story]').forEach((a) => {
    const id = Number(a.dataset.story)
    if (!id || seen.has(id)) return
    // свёрнутые блоки («Другие турниры») пропускаем
    if (a.offsetParent === null && id !== d.id) return
    seen.add(id)
    list.push({ id, href: a.getAttribute('href') || '' })
  })
  if (!seen.has(d.id)) list.unshift({ id: d.id, href: d.href })
  return list
}

function Icon({ d, className = '' }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-5 w-5 fill-none stroke-current ${className}`} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  )
}

const ICONS = {
  close: 'M6 6l12 12M18 6 6 18',
  pause: 'M8 5v14M16 5v14',
  play: 'M7 4.5v15l12.5-7.5z',
  share: 'M12 15V3m0 0L7.5 7.5M12 3l4.5 4.5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7',
  prev: 'm15 5-7 7 7 7',
  next: 'm9 5 7 7-7 7',
}

/** Почему матч в кружке: причину берём из разбора матча (она свежее), иначе — из списка. */
function focusFor(item: Item | null, story: StoryData | null) {
  const f = item?.focus
  if (!f || !story) return null
  const cover = story.slides[0]
  const fresh = cover?.kind === 'cover' ? cover.tags.find((t) => t.slug === f.slug)?.reason : undefined
  return { ...f, reason: fresh ?? f.reason }
}

/** «#прогруз», «Топ дня», «В игре» — подпись кружка в шапке сторис. */
/** Название истории в шапке просмотрщика — как подпись кружка («Кэф упал»); красным — только «В игре». */
function GroupLabel({ label, kind }: { label: string; kind: NonNullable<Item['group']>['kind'] }) {
  return <span className={`font-bold ${kind === 'live' ? 'text-live' : 'text-fg'}`}>{label}</span>
}

const btn = 'flex h-9 w-9 items-center justify-center rounded-full text-fg/90 transition hover:bg-white/10 active:scale-95'

/**
 * Сторис матча на весь экран. Открывается кликом по матчу (StoryLink),
 * кнопкой на странице матча или ссылкой ?story=<id>.
 * Тап справа — дальше, слева — назад, удержание — пауза, свайп вбок — другой матч,
 * свайп вниз, Esc или «Назад» в браузере — закрыть.
 */
export function StoryViewer() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Item[]>([])
  const [pos, setPos] = useState(0)
  const [story, setStory] = useState<StoryData | null>(null)
  const [slide, setSlide] = useState(0)
  const [nonce, setNonce] = useState(0)
  const [loading, setLoading] = useState(false)
  const [paused, setPaused] = useState(false)
  const [holding, setHolding] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [ended, setEnded] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const cache = useRef(new Map<number, Promise<StoryData | null>>())
  const req = useRef(0)
  const opener = useRef<HTMLElement | null>(null)
  const pushed = useRef(false)
  const deep = useRef(false)
  const dialog = useRef<HTMLDivElement>(null)
  const gesture = useRef<{ x: number; y: number; held: boolean; timer: number } | null>(null)

  const load = useCallback((id: number) => {
    let p = cache.current.get(id)
    if (!p) {
      p = fetch(`/api/story/${id}`)
        .then((r) => (r.status === 200 ? (r.json() as Promise<StoryData>) : null))
        .catch(() => {
          cache.current.delete(id)
          return null
        })
      cache.current.set(id, p)
    }
    return p
  }, [])

  /** Закрыть без работы с историей (её уже поменял браузер или переход). */
  const reset = useCallback(() => {
    req.current++
    setOpen(false)
    setStory(null)
    setItems([])
    setLoading(false)
    setEnded(false)
    setHolding(false)
    const el = opener.current
    opener.current = null
    if (el?.isConnected) el.focus({ preventScroll: true })
  }, [])

  const close = useCallback(() => {
    reset()
    if (pushed.current) {
      pushed.current = false
      if (history.state?.tagStory) history.back()
    } else if (deep.current) {
      deep.current = false
      const u = new URL(location.href)
      u.searchParams.delete('story')
      history.replaceState(history.state, '', u.pathname + u.search + u.hash)
    }
  }, [reset])

  /** Закрыть и перейти на страницу: запись сторис в истории заменяем ею, чтобы «Назад» вёл к списку. */
  const leaveTo = useCallback(
    (href: string) => {
      const wasPushed = pushed.current
      pushed.current = false
      deep.current = false
      reset()
      if (wasPushed) router.replace(href)
      else if (href !== location.pathname) router.push(href)
    },
    [reset, router],
  )

  /** Показать матч list[index]; если у него нет сторис — идём дальше в ту же сторону. */
  const show = useCallback(
    async (list: Item[], index: number, dir: 1 | -1, opts: ShowOpts = {}) => {
      const token = ++req.current
      setLoading(true)
      // кольца гаснут только от просмотра в кружке: открытия из списка матчей их не трогают.
      // Матч без сторис, через который прошли вперёд, тоже считаем просмотренным — иначе кольцо не погаснет никогда
      const marks: SeenMark[] = []
      for (let i = index; i >= 0 && i < list.length; i += dir) {
        const it = list[i]
        const data = await load(it.id)
        if (token !== req.current) return
        if (dir === 1 || data) {
          if (it.group) marks.push({ key: it.group.key, id: it.id })
          if (it.also) marks.push(...it.also)
        }
        if (data) {
          setPos(i)
          setStory(data)
          setSlide(0)
          setNonce((n) => n + 1)
          setEnded(false)
          setLoading(false)
          markSeen(marks)
          const nx = list[i + dir]
          if (nx) void load(nx.id)
          return
        }
        if (opts.strict) {
          // у выбранного матча сторис нет (мало данных) — открываем обычную страницу
          leaveTo(it.href)
          return
        }
      }
      markSeen(marks)
      setLoading(false)
      // во всём кружке не нашлось ни одной сторис — открываем страницу тега
      if (opts.fallbackHref) leaveTo(opts.fallbackHref)
      else setEnded(true)
    },
    [load, leaveTo],
  )

  // открытие: событие от StoryLink / StoryButton
  useEffect(() => {
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent<OpenStoryDetail>).detail
      const list = d.queue?.length ? d.queue : collect(d)
      opener.current = d.opener ?? null
      deep.current = Boolean(d.deep)
      setItems(list)
      setStory(null)
      setPaused(false)
      setOpen(true)
      if (!d.deep && !history.state?.tagStory) {
        // своя запись в истории: «Назад» на телефоне закрывает сторис, а не уводит со страницы
        history.pushState({ ...history.state, tagStory: true }, '')
        pushed.current = true
      }
      void show(
        list,
        Math.max(0, list.findIndex((i) => i.id === d.id)),
        1,
        d.queue?.length ? { fallbackHref: d.href } : { strict: true },
      )
    }
    window.addEventListener(OPEN_STORY, onOpen)
    return () => window.removeEventListener(OPEN_STORY, onOpen)
  }, [show])

  // ссылка вида /match/…?story=<id> открывает сторис сразу
  useEffect(() => {
    const id = Number(new URLSearchParams(location.search).get('story'))
    if (id > 0) openStory({ id, href: location.pathname, deep: true })
  }, [])

  // «Назад» в браузере
  useEffect(() => {
    const onPop = () => {
      if (pushed.current && !history.state?.tagStory) {
        pushed.current = false
        reset()
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [reset])

  const next = useCallback(() => {
    if (!story) return
    if (slide < story.slides.length - 1) {
      setSlide(slide + 1)
      return
    }
    if (pos < items.length - 1) void show(items, pos + 1, 1)
    else if (ended) close()
    else setEnded(true)
  }, [story, slide, pos, items, ended, show, close])

  const prev = useCallback(() => {
    if (!story) return
    setEnded(false)
    if (slide > 0) setSlide(slide - 1)
    else if (pos > 0) void show(items, pos - 1, -1)
    else setNonce((n) => n + 1)
  }, [story, slide, pos, items, show])

  const nextMatch = useCallback(() => {
    if (pos < items.length - 1) void show(items, pos + 1, 1)
  }, [pos, items, show])
  const prevMatch = useCallback(() => {
    if (pos > 0) void show(items, pos - 1, -1)
  }, [pos, items, show])

  // клавиатура, блокировка прокрутки страницы, фокус
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowDown') nextMatch()
      else if (e.key === 'ArrowUp') prevMatch()
      else if (e.key === ' ') {
        e.preventDefault()
        setPaused((p) => !p)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close, next, prev, nextMatch, prevMatch])

  useEffect(() => {
    if (!open) return
    const root = document.documentElement
    const prevOverflow = root.style.overflow
    root.style.overflow = 'hidden'
    dialog.current?.focus({ preventScroll: true })
    const onVis = () => setHidden(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', onVis)
    return () => {
      root.style.overflow = prevOverflow
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [open])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 1800)
    return () => window.clearTimeout(t)
  }, [toast])

  if (!open) return null

  const running = !paused && !holding && !hidden && !loading && !ended
  const last = story ? slide === story.slides.length - 1 : false
  const current = story?.slides[slide]
  const item = story && items[pos]?.id === story.id ? items[pos] : null
  // открыли из кружка: «#прогруз · 2/5» в шапке и «почему» на обложке
  const group = item?.group
  const focus = focusFor(item, story)
  // фон — цвета кружка, из которого открыли (или тега матча); своя картинка кружка — сверху
  const artKey = group?.key ?? focus?.slug ?? null
  const panelBg = artKey ? artGlow(artFor(artKey)) : undefined
  const duration = (k: NonNullable<typeof current>['kind']) => (k === 'cover' && focus ? 6500 : SLIDE_MS[k])

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as Element).closest('a,button')) return
    const g = { x: e.clientX, y: e.clientY, held: false, timer: 0 }
    g.timer = window.setTimeout(() => {
      g.held = true
      setHolding(true)
    }, 220)
    gesture.current = g
  }
  const endGesture = (e: React.PointerEvent, cancelled = false) => {
    const g = gesture.current
    gesture.current = null
    if (!g) return
    window.clearTimeout(g.timer)
    setHolding(false)
    if (cancelled) return
    const dx = e.clientX - g.x
    const dy = e.clientY - g.y
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) nextMatch()
      else prevMatch()
      return
    }
    if (dy > 90 && dy > Math.abs(dx)) {
      close()
      return
    }
    if (g.held || Math.abs(dx) > 10 || Math.abs(dy) > 10) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    if (e.clientX - rect.left < rect.width * 0.3) prev()
    else next()
  }

  const share = async () => {
    if (!story) return
    const url = `${location.origin}${story.href}?story=${story.id}`
    const title = `${story.home.name} — ${story.away.name}: матч в слайдах`
    try {
      if (navigator.share) {
        await navigator.share({ title, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setToast('Ссылка скопирована')
    } catch {
      // пользователь отменил «Поделиться» — ничего не делаем
    }
  }

  const goFull = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!story || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    leaveTo(story.href)
  }

  return (
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-label={story ? `Разбор матча: ${story.home.name} — ${story.away.name}` : 'Разбор матча'}
      tabIndex={-1}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 outline-none backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <button type="button" onClick={prev} className={`${btn} mr-5 hidden h-11 w-11 bg-white/5 sm:flex`} aria-label="Назад">
        <Icon d={ICONS.prev} />
      </button>

      <div
        className="st-glow relative isolate flex h-dvh w-full select-none flex-col overflow-hidden transition-[background] duration-500 sm:h-[min(92dvh,860px)] sm:w-auto sm:aspect-[9/16] sm:rounded-[22px] sm:shadow-2xl sm:ring-1 sm:ring-edge-2"
        style={panelBg ? { background: panelBg } : undefined}
      >
        {group?.cover ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[62%] opacity-50"
            style={{
              // сверху и снизу — затемнение: подписи читаются даже на светлом фото
              background: `linear-gradient(to bottom, rgb(11 11 9 / 0.6) 0%, rgb(11 11 9 / 0.2) 35%, var(--color-ink) 100%), center / cover no-repeat url("${group.cover}")`,
            }}
          />
        ) : null}
        {/* прогресс по слайдам */}
        <div className="flex gap-1 px-3 pt-[max(10px,env(safe-area-inset-top))]">
          {(story?.slides ?? [null]).map((s, i) => (
            <div key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/20">
              {story && (i < slide || (i === slide && ended)) ? (
                <div className="h-full w-full bg-fg" />
              ) : story && s && i === slide ? (
                <div
                  key={`${story.id}-${slide}-${nonce}`}
                  className="st-progress h-full w-full bg-fg"
                  style={{ animationDuration: `${duration(s.kind)}ms`, animationPlayState: running ? 'running' : 'paused' }}
                  onAnimationEnd={(e) => {
                    if (e.target === e.currentTarget) next()
                  }}
                />
              ) : null}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2.5 px-3 pt-2.5">
          {story ? (
            <>
              <span className="flex shrink-0 -space-x-1.5">
                <TeamLogo name={story.home.name} src={story.home.logo} size={24} />
                <TeamLogo name={story.away.name} src={story.away.logo} size={24} />
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[13px] font-bold">
                  {story.home.name} — {story.away.name}
                </span>
                <span className="block truncate text-[11px] text-dim">
                  {group ? (
                    <>
                      <GroupLabel label={group.label} kind={group.kind} />
                      {group.total > 1 ? ` ${group.pos}/${group.total}` : ''} ·{' '}
                    </>
                  ) : null}
                  {story.league}
                </span>
              </span>
            </>
          ) : (
            <span className="flex-1" />
          )}
          <button type="button" className={btn} onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Продолжить' : 'Пауза'}>
            <Icon d={paused ? ICONS.play : ICONS.pause} className={paused ? 'fill-current' : ''} />
          </button>
          <button type="button" className={btn} onClick={share} aria-label="Поделиться">
            <Icon d={ICONS.share} />
          </button>
          <button type="button" className={btn} onClick={close} aria-label="Закрыть">
            <Icon d={ICONS.close} />
          </button>
        </div>

        {/* слайд: тап справа — дальше, слева — назад, удержание — пауза */}
        <div
          className="relative min-h-0 flex-1 touch-none"
          onPointerDown={onPointerDown}
          onPointerUp={(e) => endGesture(e)}
          onPointerCancel={(e) => endGesture(e, true)}
          onContextMenu={(e) => e.preventDefault()}
        >
          {story && current ? (
            <div key={`${story.id}-${slide}-${nonce}`} className="h-full" aria-live="polite">
              <Slide slide={current} story={story} focus={focus} />
            </div>
          ) : null}
          {loading && !story ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-acid" aria-label="Загрузка" />
            </div>
          ) : null}
        </div>

        {story ? (
          <div className="space-y-2 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-2">
            {last && story.cta ? (
              <div className="st-rise">
                <a
                  href={story.cta.href}
                  target="_blank"
                  rel={SPONSORED_REL}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-fg px-3 py-3.5 text-[15px] font-bold text-ink shadow-[0_8px_28px_-8px_rgb(244_241_230/0.35)] transition hover:bg-white active:scale-[0.98]"
                >
                  {story.cta.text}
                  <span className="font-semibold opacity-65">· {story.cta.partner}</span>
                </a>
                <p className="mt-1.5 text-center text-[11px] text-dim">{story.cta.ad}</p>
              </div>
            ) : null}
            <a
              href={story.href}
              onClick={goFull}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-panel/60 py-2.5 text-[13px] font-semibold text-fg/85 ring-1 ring-inset ring-edge-2 transition hover:bg-panel-2"
            >
              Полный разбор матча
              <Icon d={ICONS.next} className="h-4 w-4" />
            </a>
          </div>
        ) : null}

        {toast ? (
          <div className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 rounded-full bg-fg px-3 py-1.5 text-[13px] font-semibold text-ink shadow-lg">
            {toast}
          </div>
        ) : null}
      </div>

      <button type="button" onClick={next} className={`${btn} ml-5 hidden h-11 w-11 bg-white/5 sm:flex`} aria-label="Дальше">
        <Icon d={ICONS.next} />
      </button>

      <p className="pointer-events-none absolute bottom-3 left-1/2 hidden -translate-x-1/2 text-[12px] text-white/45 sm:block">
        ← → слайды · ↑ ↓ матчи · пробел — пауза · Esc — закрыть
      </p>
    </div>
  )
}
