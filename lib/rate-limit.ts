/**
 * Лимитер «скользящее окно» с приоритетами.
 *
 * SStats без ключа пускает 30 запросов в минуту с одного IP. Запросы страниц
 * (high) идут первыми; фоновый прогрев (low) может занять только часть окна,
 * чтобы живые пользователи не ждали.
 */
export type Priority = 'high' | 'low'

type Waiter = {
  prio: Priority
  resolve: (release: () => void) => void
  reject: (err: Error) => void
  timer: ReturnType<typeof setTimeout>
}

export class RateLimitTimeoutError extends Error {
  constructor() {
    super('Превышено время ожидания лимита запросов к API')
    this.name = 'RateLimitTimeoutError'
  }
}

export type LimiterOptions = {
  /** Запросов в окне. */
  limit: number
  windowMs?: number
  /** Доля окна, доступная фоновым (low) запросам. */
  lowShare?: number
  maxConcurrent?: number
}

export class SlidingWindowLimiter {
  private stamps: number[] = []
  private queue: Waiter[] = []
  private active = 0
  private pausedUntil = 0
  private wakeTimer: ReturnType<typeof setTimeout> | null = null
  private readonly limit: number
  private readonly windowMs: number
  private readonly lowLimit: number
  private readonly maxConcurrent: number

  constructor(opts: LimiterOptions) {
    this.limit = Math.max(1, Math.floor(opts.limit))
    this.windowMs = opts.windowMs ?? 60_000
    this.lowLimit = Math.max(1, Math.floor(this.limit * (opts.lowShare ?? 0.6)))
    this.maxConcurrent = Math.max(1, opts.maxConcurrent ?? 4)
  }

  /** Ждёт слот; возвращает функцию release, которую нужно вызвать по завершении запроса. */
  acquire(prio: Priority, timeoutMs: number): Promise<() => void> {
    return new Promise((resolve, reject) => {
      const waiter: Waiter = {
        prio,
        resolve,
        reject,
        timer: setTimeout(() => {
          this.queue = this.queue.filter((w) => w !== waiter)
          reject(new RateLimitTimeoutError())
        }, timeoutMs),
      }
      // high — перед всеми low, внутри приоритета FIFO
      if (prio === 'high') {
        const firstLow = this.queue.findIndex((w) => w.prio === 'low')
        if (firstLow < 0) this.queue.push(waiter)
        else this.queue.splice(firstLow, 0, waiter)
      } else {
        this.queue.push(waiter)
      }
      this.pump()
    })
  }

  /** API ответил 429 — притормозить все запросы. */
  pause(ms: number) {
    this.pausedUntil = Math.max(this.pausedUntil, Date.now() + ms)
    this.schedule(ms)
  }

  stats() {
    this.prune(Date.now())
    return { inWindow: this.stamps.length, queued: this.queue.length, active: this.active, limit: this.limit }
  }

  private prune(now: number) {
    while (this.stamps.length && this.stamps[0] <= now - this.windowMs) this.stamps.shift()
  }

  private schedule(delay: number) {
    if (this.wakeTimer) clearTimeout(this.wakeTimer)
    this.wakeTimer = setTimeout(() => {
      this.wakeTimer = null
      this.pump()
    }, Math.max(5, delay))
  }

  private pump() {
    const now = Date.now()
    if (now < this.pausedUntil) return this.schedule(this.pausedUntil - now)
    this.prune(now)
    while (this.queue.length && this.active < this.maxConcurrent) {
      const next = this.queue[0]
      const cap = next.prio === 'high' ? this.limit : this.lowLimit
      if (this.stamps.length >= cap) {
        // ждём, пока из окна выйдет самый старый запрос
        const idx = this.stamps.length - cap
        return this.schedule(this.stamps[idx] + this.windowMs - now)
      }
      this.queue.shift()
      clearTimeout(next.timer)
      this.stamps.push(now)
      this.active++
      let released = false
      next.resolve(() => {
        if (released) return
        released = true
        this.active--
        this.pump()
      })
    }
  }
}
