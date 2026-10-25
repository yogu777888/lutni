import { rm } from 'node:fs/promises'
import path from 'node:path'

/**
 * Главная хранится готовой 30 с (ISR), и Next.js собирает её ещё при сборке сайта — без данных и без настроек сервера
 * (env). Убираем эту заготовку до первого запроса (вызов — из instrumentation.ts): тогда главную соберёт уже работающий
 * сервер, а дальше отдаёт готовой. Остальные страницы с хранением собираются только при первом открытии
 * (`generateStaticParams` — пусто).
 */
export async function dropBuildHome() {
  if (process.env.NODE_ENV !== 'production') return
  const dir = path.join(process.cwd(), '.next', 'server', 'app')
  await Promise.all(
    ['index.html', 'index.rsc', 'index.meta', 'index.segments'].map((f) => rm(path.join(dir, f), { recursive: true, force: true }).catch(() => {})),
  )
}
