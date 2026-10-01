/**
 * Просмотренные сторис — только в браузере зрителя (кольца кружков становятся серыми).
 * localStorage может быть недоступен (приватный режим, запрет cookies) — тогда просто
 * считаем, что ничего не просмотрено.
 */
const KEY = 'tagbet:seen'
const TTL = 3 * 24 * 3600 * 1000
const MAX = 400

export const SEEN_EVENT = 'tagbet:seen'

function read(): Record<string, number> {
  try {
    const raw = localStorage.getItem(KEY)
    const obj: unknown = raw ? JSON.parse(raw) : {}
    return obj && typeof obj === 'object' ? (obj as Record<string, number>) : {}
  } catch {
    return {}
  }
}

export function readSeen(): Set<number> {
  const now = Date.now()
  return new Set(
    Object.entries(read())
      .filter(([, t]) => typeof t === 'number' && now - t < TTL)
      .map(([id]) => Number(id)),
  )
}

export function markSeen(id: number) {
  try {
    const now = Date.now()
    const all: Record<string, number> = { ...read(), [String(id)]: now }
    const fresh = Object.entries(all)
      .filter(([, t]) => typeof t === 'number' && now - t < TTL)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(fresh)))
  } catch {
    // хранилище недоступно — кольца просто не посереют
  }
  window.dispatchEvent(new Event(SEEN_EVENT))
}
