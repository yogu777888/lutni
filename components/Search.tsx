'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { StoryLink } from './story/StoryLink'
import { TeamLogo } from './TeamLogo'

type Res = {
  matches: { id: number; href: string; home: { name: string; logo: string | null }; away: { name: string; logo: string | null }; league: string; when: string; live: boolean; score: string | null }[]
  leagues: { href: string; name: string }[]
}

/**
 * Поиск в шапке: лупа (и ⌘K / Ctrl+K, «/») открывает окно — матчи команды на сегодня и два дня вперёд и турниры
 * (/api/search, lib/search.ts). Клик по матчу — сторис, как в списках; Esc или клик мимо — закрыть.
 */
export function Search() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [res, setRes] = useState<Res | null>(null)
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /input|textarea|select/i.test((e.target as HTMLElement)?.tagName ?? '')
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault()
        setOpen(true)
      } else if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) input.current?.focus()
    document.documentElement.style.overflow = open ? 'hidden' : ''
  }, [open])

  useEffect(() => {
    const s = q.trim()
    if (s.length < 2) {
      setRes(null)
      return
    }
    setBusy(true)
    const ctl = new AbortController()
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(s)}`, { signal: ctl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: Res | null) => {
          setRes(d)
          setBusy(false)
        })
        .catch(() => {})
    }, 180)
    return () => {
      clearTimeout(t)
      ctl.abort()
    }
  }, [q])

  const empty = res && !res.matches.length && !res.leagues.length

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Поиск команды или турнира"
        title="Поиск (⌘K)"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-ctl text-dim transition-colors hover:bg-white/[0.08] hover:text-fg"
      >
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden>
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16l4.5 4.5" />
        </svg>
      </button>
      {open ? (
        <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/60 px-3 pt-[12vh] backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div role="dialog" aria-label="Поиск" className="card w-full max-w-[560px] overflow-hidden shadow-[0_24px_80px_rgb(0_0_0/0.55)]">
            <div className="flex items-center gap-3 border-b border-edge px-4">
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0 text-mute" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden>
                <circle cx="11" cy="11" r="6.5" />
                <path d="M16 16l4.5 4.5" />
              </svg>
              <input
                ref={input}
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Команда или турнир: «Спартак», «Ла Лига»"
                className="h-14 w-full bg-transparent text-[16px] text-fg outline-none placeholder:text-mute"
              />
              <button type="button" onClick={() => setOpen(false)} className="rounded-ctl px-2 py-1 text-[12px] text-mute hover:text-fg">
                Esc
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {!res ? (
                <p className="px-4 py-5 text-[13.5px] text-mute">{busy && q.trim().length >= 2 ? 'Ищем…' : 'Матчи команды на сегодня и два дня вперёд, турниры и их таблицы.'}</p>
              ) : empty ? (
                <p className="px-4 py-5 text-[13.5px] text-mute">Ничего не нашли. Попробуйте начало названия: «Ман», «Зенит».</p>
              ) : (
                <>
                  {res.matches.length ? <p className="px-4 pb-1.5 pt-4 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-mute">Матчи</p> : null}
                  <ul>
                    {res.matches.map((m) => (
                      <li key={m.id} onClick={() => setOpen(false)}>
                        <StoryLink id={m.id} href={m.href} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/[0.05]">
                          <span className="flex shrink-0 -space-x-1.5">
                            <TeamLogo name={m.home.name} src={m.home.logo} size={22} />
                            <TeamLogo name={m.away.name} src={m.away.logo} size={22} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14.5px] font-semibold">
                              {m.home.name} — {m.away.name}
                            </span>
                            <span className="block truncate text-[12.5px] text-mute">{m.league}</span>
                          </span>
                          <span className={`num shrink-0 text-[13px] ${m.live ? 'text-live' : 'text-dim'}`}>{m.score ? `${m.score} · ${m.when}` : m.when}</span>
                        </StoryLink>
                      </li>
                    ))}
                  </ul>
                  {res.leagues.length ? <p className="px-4 pb-1.5 pt-4 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-mute">Турниры</p> : null}
                  <ul className="pb-2">
                    {res.leagues.map((l) => (
                      <li key={l.href}>
                        <Link href={l.href} onClick={() => setOpen(false)} className="block px-4 py-2.5 text-[14.5px] transition-colors hover:bg-white/[0.05]">
                          {l.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
