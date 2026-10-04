import { SlidingWindowLimiter, type Priority } from '../rate-limit'
import { singleton } from '../runtime'
import type { ApiEnvelope } from './types'

/**
 * Низкоуровневый клиент SStats.net API.
 *
 * Env:
 *  SSTATS_API_URL — базовый адрес (по умолчанию https://api.sstats.net)
 *  SSTATS_API_KEY — ключ (передаётся как ?apikey=…); без ключа лимит 30 запросов/мин на IP
 *  SSTATS_RPM     — наш собственный потолок запросов в минуту (по умолчанию 25 без ключа, 60 с ключом;
 *                   если квота вашего ключа выше — поднимите, при ответе 429 клиент сам притормозит)
 *  SSTATS_MOCK=1  — демо-режим без сети (синтетические данные)
 *  SSTATS_MOCK=design — то же, но часы стоят: всегда 4 октября, 19:30 (для работы над виджетами, см. lib/format.ts)
 */
const BASE = (process.env.SSTATS_API_URL || 'https://api.sstats.net').replace(/\/+$/, '')
const API_KEY = process.env.SSTATS_API_KEY || ''
export const IS_MOCK = process.env.SSTATS_MOCK === '1' || process.env.SSTATS_MOCK === 'design'
/** Демо для дизайна: часы стоят, прогрев разбирает все матчи дня (и идущие) — у всех есть форма. */
export const IS_DESIGN = process.env.SSTATS_MOCK === 'design'
const RPM = Number(process.env.SSTATS_RPM || (API_KEY ? 60 : 25))

export const limiter = singleton(
  'limiter',
  () => new SlidingWindowLimiter({ limit: RPM, lowShare: 0.6, maxConcurrent: 4 }),
)

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export type Query = Record<string, string | number | boolean | undefined | null>
export type RequestOptions = { priority?: Priority }

const WAIT_MS: Record<Priority, number> = { high: 8_000, low: 15 * 60_000 }
const TIMEOUT_MS: Record<Priority, number> = { high: 12_000, low: 30_000 }

export function unwrap<T>(json: unknown): T {
  if (Array.isArray(json)) return json as T
  if (json && typeof json === 'object' && ('data' in json || 'status' in json)) {
    const env = json as ApiEnvelope<T>
    if (env.status && /error|fail/i.test(env.status)) throw new ApiError(env.message || env.status)
    return env.data as T
  }
  return json as T
}

let lastErrorLog = 0

export async function apiGet<T>(pathname: string, query: Query = {}, opts: RequestOptions = {}): Promise<T> {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v))
  }
  if (IS_MOCK) {
    const { mockFetch } = await import('./mock')
    return unwrap<T>(await mockFetch(pathname, params))
  }
  if (API_KEY) params.set('apikey', API_KEY)
  const prio = opts.priority ?? 'high'
  const release = await limiter.acquire(prio, WAIT_MS[prio])
  const url = `${BASE}${pathname}?${params}`
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS[prio]),
    })
    if (res.status === 429) {
      const retry = Number(res.headers.get('retry-after'))
      limiter.pause(Number.isFinite(retry) && retry > 0 ? retry * 1000 : 30_000)
      throw new ApiError('SStats: 429 Too Many Requests', 429)
    }
    if (!res.ok) throw new ApiError(`SStats: HTTP ${res.status} ${pathname}`, res.status)
    return unwrap<T>(await res.json())
  } catch (err) {
    // не заваливаем лог при недоступном API
    if (Date.now() - lastErrorLog > 10_000) {
      lastErrorLog = Date.now()
      console.warn(`[sstats] ${pathname}: ${(err as Error).message}`)
    }
    throw err
  } finally {
    release()
  }
}
