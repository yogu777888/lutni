'use client'

import { useSyncExternalStore } from 'react'

/**
 * Избранное — в памяти браузера, без регистрации: команды (звёздочка `FavStar` у названия команды на странице матча) и
 * матчи (звёздочка `MatchFavStar` справа в шапке матча). Читают блок «Избранное» в центре (`FavMatches`) и левая панель.
 */
export type FavTeam = { id: number; name: string; logo?: string | null }
/** `ts` — начало матча: блок дня берёт только свои матчи, не спрашивая сервер про чужие дни */
export type FavMatch = { id: number; ts: number }

const EVENT = 'tb-fav'

function store<T extends { id: number }>(key: string, valid: (v: T) => boolean, cap: number) {
  const EMPTY: T[] = []
  let cache: { raw: string | null; list: T[] } = { raw: null, list: EMPTY }
  const read = (): T[] => {
    let raw: string | null = null
    try {
      raw = localStorage.getItem(key)
    } catch {}
    if (raw === cache.raw) return cache.list
    let list: T[] = EMPTY
    try {
      const v = raw ? JSON.parse(raw) : []
      if (Array.isArray(v)) list = v.filter((x) => x && typeof x.id === 'number' && valid(x))
    } catch {}
    cache = { raw, list }
    return list
  }
  const useList = () => useSyncExternalStore(subscribe, read, () => EMPTY)
  const toggle = (item: T) => {
    const list = read()
    const next = list.some((x) => x.id === item.id) ? list.filter((x) => x.id !== item.id) : [...list, item].slice(-cap)
    try {
      localStorage.setItem(key, JSON.stringify(next))
    } catch {}
    window.dispatchEvent(new Event(EVENT))
  }
  return { useList, toggle }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener(EVENT, cb)
    window.removeEventListener('storage', cb)
  }
}

const teams = store<FavTeam>('tb-fav-teams', (t) => typeof t.name === 'string', 30)
// матчи копятся по дням — держим последние 50 добавленных (по времени не чистим: в демо часы стоят на 4 октября 2026-го)
const matches = store<FavMatch>('tb-fav-matches', (m) => typeof m.ts === 'number', 50)

export const useFavorites = teams.useList
export const toggleFavorite = teams.toggle
export const useFavMatches = matches.useList
export const toggleFavMatch = matches.toggle
