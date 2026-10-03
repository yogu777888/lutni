import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { singleton } from './runtime'

/**
 * Журнал «Выгодно»: выгодные ставки, которые сайт показывал до начала матча. По нему виджет
 * «Выгодные ставки» на главной честно считает, сколько они дали бы рублями.
 *
 * Пишем при разборе матча, пока он не начался, — остаётся последняя подсказка перед стартом.
 * Если позже перевес пропал, запись не удаляем: подсказку уже видели. Файл — рядом с журналом
 * кликов (DATA_DIR), записи старше 30 дней выбрасываем. CACHE_DISK=0 (тесты) — только в памяти.
 */
export type LoggedPick = {
  /** id матча */
  id: number
  /** начало матча */
  ts: number
  /** исход: 'home', 'over2.5', 'bttsYes'… */
  key: string
  /** «П1», «ТБ 2.5» */
  label: string
  /** лучший кэф на момент подсказки (партнёрский, если был) */
  odd: number
  /** когда подсказку с этим исходом и кэфом показали впервые */
  at: number
}

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), '.data')
const FILE = path.join(DATA_DIR, 'value-picks.json')
const DISK = process.env.CACHE_DISK !== '0'
const KEEP_MS = 30 * 24 * 3600 * 1000
const SAVE_DELAY_MS = 2000

type Store = { picks: Map<number, LoggedPick>; loaded: Promise<void> | null; timer: ReturnType<typeof setTimeout> | null }

const store = singleton<Store>('value-log', () => ({ picks: new Map(), loaded: null, timer: null }))

const valid = (p: unknown): p is LoggedPick => {
  const x = p as LoggedPick
  return !!x && typeof x.id === 'number' && typeof x.ts === 'number' && typeof x.key === 'string' && typeof x.odd === 'number' && x.odd > 1
}

function load(): Promise<void> {
  store.loaded ??= (async () => {
    if (!DISK) return
    try {
      const raw: unknown = JSON.parse(await readFile(FILE, 'utf8'))
      // записи, сделанные до чтения файла, новее — их не перетираем
      if (Array.isArray(raw)) for (const p of raw) if (valid(p) && !store.picks.has(p.id)) store.picks.set(p.id, p)
    } catch {
      // файла ещё нет или он битый — начинаем с пустого журнала
    }
  })()
  return store.loaded
}

/** Сохраняем не чаще раза в пару секунд: прогрев разбирает десятки матчей подряд. */
function save() {
  if (!DISK || store.timer) return
  store.timer = setTimeout(async () => {
    store.timer = null
    const now = Date.now()
    for (const [id, p] of store.picks) if (now - p.ts > KEEP_MS) store.picks.delete(id)
    const tmp = `${FILE}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`
    try {
      await mkdir(DATA_DIR, { recursive: true })
      await writeFile(tmp, JSON.stringify([...store.picks.values()].sort((a, b) => a.ts - b.ts || a.id - b.id)))
      await rename(tmp, FILE)
    } catch {
      // диск недоступен — журнал останется в памяти до перезапуска
    }
  }, SAVE_DELAY_MS)
  store.timer.unref?.()
}

/** Подсказку «Выгодно» показали до начала матча — запомнить (новая заменяет прежнюю). */
export function logValuePick(p: Omit<LoggedPick, 'at'>) {
  void load().then(() => {
    const old = store.picks.get(p.id)
    if (old && old.key === p.key && old.odd === p.odd && old.ts === p.ts) return
    store.picks.set(p.id, { ...p, at: Date.now() })
    save()
  })
}

/** Демо (SSTATS_MOCK): дописать подсказку задним числом, если её нет, — чтобы виджету было что показать сразу. */
export async function backfillValuePick(p: LoggedPick) {
  await load()
  if (store.picks.has(p.id)) return
  store.picks.set(p.id, p)
  save()
}

/** Подсказки по этим матчам. */
export async function valuePicksFor(ids: Iterable<number>): Promise<LoggedPick[]> {
  await load()
  const out: LoggedPick[] = []
  for (const id of ids) {
    const p = store.picks.get(id)
    if (p) out.push(p)
  }
  return out.sort((a, b) => a.ts - b.ts || a.id - b.id)
}
