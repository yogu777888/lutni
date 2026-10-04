import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { singleton } from './runtime'

/**
 * Кэш stale-while-revalidate с дедупликацией запросов и сохранением на диск.
 *
 * - свежие данные отдаются сразу;
 * - «несвежие» (в пределах stale) тоже отдаются сразу, а обновление идёт в фоне;
 * - если API упал, отдаём последнее удачное значение (до 7 дней);
 * - на диск пишем, чтобы после рестарта не выжигать лимит запросов заново.
 */
export type CacheOptions = {
  /** Сколько секунд данные считаются свежими. */
  ttl: number
  /** Сколько секунд после ttl можно отдавать данные, обновляя их в фоне. */
  stale?: number
}

/** TTL может зависеть от значения (например, live-матч живёт в кэше минуту, завершённый — сутки). */
export type TtlSpec<T> = CacheOptions | ((value: T) => CacheOptions)

type Entry = { v: unknown; t: number; f: number; s: number }

const HARD_EXPIRY_MS = 7 * 24 * 3600 * 1000
const MAX_ENTRIES = Number(process.env.CACHE_MAX_ENTRIES || 4000)
const CACHE_DIR = process.env.CACHE_DIR || path.join(process.cwd(), '.cache', 'data')
// в демо на диск не пишем: данные дешёвые, а старые записи (без эмблем, с прежними часами) жили бы часами
const IN_MOCK = process.env.SSTATS_MOCK === '1' || process.env.SSTATS_MOCK === 'design'
const DISK_ENABLED = process.env.CACHE_DISK ? process.env.CACHE_DISK !== '0' : !IN_MOCK

class SwrCache {
  private mem = new Map<string, Entry>()
  private inflight = new Map<string, Promise<unknown>>()
  private dirReady: Promise<unknown> | null = null

  async get<T>(key: string, loader: () => Promise<T>, spec: TtlSpec<T>, persist = true): Promise<T> {
    const now = Date.now()
    let entry = this.mem.get(key)
    if (!entry && persist) {
      entry = await this.readDisk(key)
      if (entry) this.remember(key, entry)
    }
    if (entry) {
      this.touch(key, entry)
      if (now < entry.f) return entry.v as T
      if (now < entry.s) {
        this.refresh(key, loader, spec, persist).catch(() => {})
        return entry.v as T
      }
    }
    try {
      return await this.refresh(key, loader, spec, persist)
    } catch (err) {
      if (entry && now - entry.t < HARD_EXPIRY_MS) return entry.v as T
      throw err
    }
  }

  /** Только из памяти и только не протухшее (в пределах stale), без обращения к API. */
  peek<T>(key: string): T | undefined {
    const e = this.mem.get(key)
    if (!e || Date.now() >= e.s) return undefined
    return e.v as T
  }

  set<T>(key: string, value: T, opts: CacheOptions & { persist?: boolean }) {
    const now = Date.now()
    const entry: Entry = {
      v: value,
      t: now,
      f: now + opts.ttl * 1000,
      s: now + (opts.ttl + (opts.stale ?? opts.ttl * 4)) * 1000,
    }
    this.remember(key, entry)
    if (opts.persist !== false) this.writeDisk(key, entry).catch(() => {})
  }

  size() {
    return this.mem.size
  }

  private refresh<T>(key: string, loader: () => Promise<T>, spec: TtlSpec<T>, persist: boolean): Promise<T> {
    const running = this.inflight.get(key)
    if (running) return running as Promise<T>
    const p = loader()
      .then((value) => {
        const opts = typeof spec === 'function' ? spec(value) : spec
        this.set(key, value, { ...opts, persist })
        return value
      })
      .finally(() => this.inflight.delete(key))
    this.inflight.set(key, p)
    return p
  }

  private remember(key: string, entry: Entry) {
    this.mem.delete(key)
    this.mem.set(key, entry)
    while (this.mem.size > MAX_ENTRIES) {
      const oldest = this.mem.keys().next().value
      if (oldest === undefined) break
      this.mem.delete(oldest)
    }
  }

  private touch(key: string, entry: Entry) {
    this.mem.delete(key)
    this.mem.set(key, entry)
  }

  private file(key: string) {
    return path.join(CACHE_DIR, `${createHash('sha1').update(key).digest('hex')}.json`)
  }

  private async readDisk(key: string): Promise<Entry | undefined> {
    if (!DISK_ENABLED) return undefined
    try {
      const raw = JSON.parse(await readFile(this.file(key), 'utf8')) as Entry & { k?: string }
      if (raw.k !== key || Date.now() - raw.t > HARD_EXPIRY_MS) return undefined
      return { v: raw.v, t: raw.t, f: raw.f, s: raw.s }
    } catch {
      return undefined
    }
  }

  private async writeDisk(key: string, entry: Entry) {
    if (!DISK_ENABLED) return
    this.dirReady ??= mkdir(CACHE_DIR, { recursive: true })
    await this.dirReady
    const file = this.file(key)
    const tmp = `${file}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`
    await writeFile(tmp, JSON.stringify({ k: key, ...entry }))
    await rename(tmp, file)
  }
}

export const cache = singleton('cache', () => new SwrCache())
