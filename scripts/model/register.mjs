// Запуск TypeScript-кода сайта из скриптов без сборки: node --import ./scripts/model/register.mjs script.ts
// (Node ≥ 22.18 снимает типы сам; здесь только пути «@/…» и импорты без расширения, как у Next и vitest).
import { register } from 'node:module'

register('./resolve.mjs', import.meta.url)
