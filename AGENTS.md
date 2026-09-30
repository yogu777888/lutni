<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# tag.bet — заметки для агентов

- Сайт на Next.js 16 (App Router, previous caching model — без `cacheComponents`), Tailwind v4, TypeScript 7.
- Все данные — через `lib/data.ts` (кэш `lib/cache.ts` + лимитер `lib/rate-limit.ts`). Не вызывайте `apiGet` из страниц напрямую: у SStats лимит 30 запросов/мин без ключа.
- Страницы с данными — `dynamic = 'force-dynamic'`; кэширует наш слой данных, а не Next.
- У динамических страниц нет `loading.tsx` намеренно: иначе `notFound()`/`permanentRedirect()` отдают 200 вместо 404/308.
- Цветовой токен фона называется `ink` (не `base`: в Tailwind v4 `text-base` — размер шрифта).
- Партнёрские ссылки — только через `goHref()` → `/go/[slug]` (учёт кликов + subid) и `CtaLink` (rel=sponsored).
- Тексты — по-русски; названия команд в текстах только в именительном падеже («команда «X»»).
- Демо без сети: `SSTATS_MOCK=1`. Проверки: `npm run typecheck`, `npm test`, `npm run build`.
