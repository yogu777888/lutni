'use client'

import { useSyncExternalStore } from 'react'

/** Избранные команды — в памяти браузера, без регистрации. Меняются звёздочкой (FavStar), читаются блоком FavMatches. */
export type FavTeam = { id: number; name: string; logo?: string | null }

const KEY = 'tb-fav-teams'
const EVENT = 'tb-fav'
const EMPTY: FavTeam[] = []
let cache: { raw: string | null; list: FavTeam[] } = { raw: null, list: EMPTY }

function read(): FavTeam[] {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(KEY)
  } catch {}
  if (raw === cache.raw) return cache.list
  let list: FavTeam[] = EMPTY
  try {
    const v = raw ? JSON.parse(raw) : []
    if (Array.isArray(v)) list = v.filter((t) => t && typeof t.id === 'number' && typeof t.name === 'string')
  } catch {}
  cache = { raw, list }
  return list
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener(EVENT, cb)
    window.removeEventListener('storage', cb)
  }
}

export function useFavorites(): FavTeam[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY)
}

export function toggleFavorite(t: FavTeam) {
  const list = read()
  const next = list.some((x) => x.id === t.id) ? list.filter((x) => x.id !== t.id) : [...list, t].slice(-30)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {}
  window.dispatchEvent(new Event(EVENT))
}
