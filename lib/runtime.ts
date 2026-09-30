/**
 * Синглтоны процесса (кэш, лимитер, прогрев). Next.js собирает маршруты в
 * отдельные бандлы, поэтому модульные переменные могут дублироваться —
 * храним состояние на globalThis, чтобы лимит запросов к API был общим.
 */
type Globals = Record<string, unknown>
const g = globalThis as unknown as { __tagbet?: Globals }
const store: Globals = (g.__tagbet ??= {})

export function singleton<T>(name: string, create: () => T): T {
  if (!(name in store)) store[name] = create()
  return store[name] as T
}
