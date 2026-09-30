import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, '.') } },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    env: { SSTATS_MOCK: '1', CACHE_DISK: '0', SITE_TIMEZONE: 'Europe/Moscow' },
  },
})
