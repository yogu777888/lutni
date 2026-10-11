'use client'

/**
 * Ширина и свёрнутость боковых панелей каркаса (как у Spotify): CSS-переменные --shell-l/--shell-r (ширина колонок)
 * и атрибуты html[data-shell-lc]/[data-shell-rc] (свёрнута). Хранится в localStorage `tb-shell`; скрипт в <head>
 * (app/layout.tsx, SHELL_SCRIPT) ставит их до отрисовки — без мигания. Свёрнутая панель — полоска RAIL px.
 */
export type Side = 'l' | 'r'
export const DEF = { l: 248, r: 288 }
export const RAIL = 64
export const MIN = { l: 200, r: 240 }
export const MAX = { l: 380, r: 400 }
const KEY = 'tb-shell'

type State = { l: number; r: number; lc: boolean; rc: boolean }

function read(): State {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}')
    return { l: Number(v.l) || DEF.l, r: Number(v.r) || DEF.r, lc: !!v.lc, rc: !!v.rc }
  } catch {
    return { ...DEF, lc: false, rc: false }
  }
}

function apply(s: State) {
  const h = document.documentElement
  h.style.setProperty('--shell-l', `${s.lc ? RAIL : s.l}px`)
  h.style.setProperty('--shell-r', `${s.rc ? RAIL : s.r}px`)
  h.toggleAttribute('data-shell-lc', s.lc)
  h.toggleAttribute('data-shell-rc', s.rc)
}

function save(s: State) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {}
  apply(s)
}

export function toggleShell(side: Side) {
  const s = read()
  if (side === 'l') s.lc = !s.lc
  else s.rc = !s.rc
  save(s)
}

/** Во время перетаскивания — только переменная, в конце — сохранить (узко — свернуть, как у Spotify). */
export function dragShell(side: Side, px: number, done = false) {
  const s = read()
  const collapse = px < MIN[side] - 60
  const w = Math.round(Math.max(MIN[side], Math.min(MAX[side], px)))
  if (!done) {
    document.documentElement.style.setProperty(side === 'l' ? '--shell-l' : '--shell-r', `${collapse ? RAIL : w}px`)
    return
  }
  if (collapse) {
    if (side === 'l') s.lc = true
    else s.rc = true
  } else {
    if (side === 'l') (s.l = w), (s.lc = false)
    else (s.r = w), (s.rc = false)
  }
  save(s)
}

export function resetShell(side: Side) {
  const s = read()
  if (side === 'l') (s.l = DEF.l), (s.lc = false)
  else (s.r = DEF.r), (s.rc = false)
  save(s)
}

/** Скрипт для <head>: те же переменные и атрибуты до отрисовки. */
export const SHELL_SCRIPT = `try{var s=JSON.parse(localStorage.getItem('${KEY}')||'{}'),h=document.documentElement;h.style.setProperty('--shell-l',(s.lc?${RAIL}:(+s.l||${DEF.l}))+'px');h.style.setProperty('--shell-r',(s.rc?${RAIL}:(+s.r||${DEF.r}))+'px');if(s.lc)h.setAttribute('data-shell-lc','');if(s.rc)h.setAttribute('data-shell-rc','')}catch(e){}`
