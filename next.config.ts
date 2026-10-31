import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // В Docker собираем standalone-сборку (см. Dockerfile), локально — обычную.
  output: process.env.NEXT_OUTPUT_STANDALONE === '1' ? 'standalone' : undefined,
  poweredByHeader: false,
  reactStrictMode: true,
  // демо с телефона по адресу компьютера в домашней сети (http://192.168.1.5:3000, раздача с айфона — 172.20.10.x):
  // без этого dev-сервер не отдаёт скрипты чужому адресу — страница без JS: шапка не темнеет и не уходит, свет у логотипа
  // не гаснет. На собранный сайт не влияет
  allowedDevOrigins: ['127.0.0.1', '192.168.*.*', '172.*.*.*', '10.*.*.*'],
  // готовые страницы (ISR) — только в памяти, старые вытесняются: на диске за месяцы матчей набрались бы гигабайты
  // (тысячи страниц матчей в день). Страница матча с данными — около 0,5 МБ: 256 МБ — около 500 страниц
  // (по умолчанию у Next.js 50 МБ — сотня); `PAGE_CACHE_MB` — своё значение
  experimental: { isrFlushToDisk: false },
  cacheMaxMemorySize: Number(process.env.PAGE_CACHE_MB || 256) * 1024 * 1024,
  // CDN и браузеры могут отдавать устаревшую копию, пока обновляют её, не дольше 2 минут (по умолчанию — год)
  expireTime: 120,
  // главная хранится готовой одной на всех (ISR) и параметров адреса не читает; «По времени» — своя страница
  async rewrites() {
    return {
      beforeFiles: [{ source: '/', has: [{ type: 'query', key: 'sort', value: 'time' }], destination: '/matches/po-vremeni' }],
      afterFiles: [],
      fallback: [],
    }
  },
}

export default nextConfig
