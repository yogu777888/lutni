/**
 * Просмотренные сторис — только в браузере зрителя (кольца кружков гаснут).
 * Отметка — «кружок + матч»: один матч бывает в нескольких кружках («Топ дня», «#кэф упал»),
 * и просмотр в одном кружке не должен гасить другие. Открытия из списка матчей и виджетов
 * кольца не трогают. localStorage может быть недоступен (приватный режим, запрет cookies) —
 * тогда просто считаем, что ничего не просмотрено.
 */
const KEY = 'tagbet:seen:v2'
/** До v2 отметки были по матчу, без кружка — их не читаем и удаляем при первой записи. */
const OLD_KEY = 'tagbet:seen'
const TTL = 3 * 24 * 3600 * 1000
const MAX = 600

export const SEEN_EVENT = 'tagbet:seen'

/** Матч id, просмотренный в кружке key. */
export type SeenMark = { key: string; id: number }

export const seenKey = (group: string, id: number) => `${group}:${id}`

function read(): Record<string, number> {
  try {
    const raw = localStorage.getItem(KEY)
    const obj: unknown = raw ? JSON.parse(raw) : {}
    return obj && typeof obj === 'object' ? (obj as Record<string, number>) : {}
  } catch {
    return {}
  }
}

/** Ключи seenKey(кружок, матч) свежих отметок. */
export function readSeen(): Set<string> {
  const now = Date.now()
  return new Set(
    Object.entries(read())
      .filter(([, t]) => typeof t === 'number' && now - t < TTL)
      .map(([k]) => k),
  )
}

export function markSeen(marks: SeenMark[]) {
  if (!marks.length) return
  try {
    const now = Date.now()
    const all: Record<string, number> = { ...read() }
    for (const m of marks) all[seenKey(m.key, m.id)] = now
    const fresh = Object.entries(all)
      .filter(([, t]) => typeof t === 'number' && now - t < TTL)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(fresh)))
    localStorage.removeItem(OLD_KEY)
  } catch {
    // хранилище недоступно — кольца просто не погаснут
  }
  window.dispatchEvent(new Event(SEEN_EVENT))
}
