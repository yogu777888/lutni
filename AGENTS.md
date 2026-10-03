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
- «Матч в слайдах» (сторис): данные — `lib/story.ts` → `/api/story/[id]`, просмотр и графики — `components/story/`. Ссылки на матч в списках — через `StoryLink` (обычная ссылка для SEO, клик открывает сторис).
- Кружки историй на главной: группы — `lib/story-groups.ts` (порядок по `lib/rank.ts`), ряд — `components/story/StoryCircles.tsx`, очередь передаётся в просмотрщик через `openStory({ queue })`. Просмотренные матчи — в `localStorage` (`components/story/seen.ts`), только для колец.
- «Сводка дня» (виджеты первого экрана главной): данные — `lib/day-summary.ts` (`buildDaySummary`, `summaryCards` — какие 4 маленьких виджета показать), вид — `components/DaySummary.tsx` (одна схема плитки: подпись → крупная цифра → матч → одна строка пояснения, без осей, легенд и текста мельче 13px; «Матч дня» — команды, вывод словами, полоса шансов «из 10», «Матч в слайдах» и «Выгодно»; `look`: `blocks` — лаймовая value и янтарный прогруз, `calm` — только лаймовая; белых плиток нет). Первый экран главной (шапка, кружки, сводка) должен влезать в ноутбук 1440×760 без прокрутки — проверяйте замером. На прошедших днях сводки нет.
- Шапка (логотип — лаймовая решётка + «tag.bet» шрифтом сайта, `Brand` в `components/Logo.tsx`; без подложки): `components/Header.tsx` + `HeaderShell.tsx` (стекло после прокрутки) + `NavCapsule.tsx` (меню-капсула; раздел по адресу — `activeNav`).
- Цвета по смыслу: лайм — «цена выше честной» (сила перевеса — яркостью лайма, `edgeTone` в `components/Flaps.tsx`), янтарь — прогруз, красный — live. Светофор не используем.
- Для тех, кто не разбирается в цифрах: вывод словами — `lib/verdict.ts` (`buildVerdict`: «Скорее выиграет «X»», голы, деньги, выгодная ставка; `outOf10` — шансы «5 из 10», `outcomeText` — исход словами вместо «П1»/«ТБ 2.5»). Пороги слов — как у тега #фаворит (60%) и слайда «Кто фаворит» (47%). Без обещаний: только «скорее», «вероятно». В строках и «Матче дня» — только выгодная ставка (обычный прогноз модели бывает «против» вывода). Теги подписаны простыми словами (`label`: `#выгодно`, `#идут деньги`…), slug и адреса прежние; цифра тега — в `TagHit.p`, а не в тексте.
- Обложки кружков историй: арт (свечение + иконка) — `lib/story-art.ts` + `components/story/ArtIcon.tsx`; своя картинка — файл `public/stories/<ключ>.*` (`lib/story-covers.ts`, только сервер). Цифр в кружках нет.
