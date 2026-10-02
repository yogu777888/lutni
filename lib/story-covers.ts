/**
 * Свои картинки для кружков историй: файлы public/stories/<ключ>.(webp|jpg|png|avif).
 * Ключ — slug тега (value, progruz, tb-2-5…), «live», «top» или «all». Если файла нет —
 * в кружке рисуется арт из lib/story-art.ts. Только для сервера: читает папку.
 */
import fs from 'node:fs'
import path from 'node:path'

const IMAGE = /\.(webp|jpe?g|png|avif)$/i

let cached: Record<string, string> | null = null

export function storyCovers(): Record<string, string> {
  // в разработке читаем папку каждый раз — новые картинки видны без перезапуска
  if (cached && process.env.NODE_ENV === 'production') return cached
  const dir = path.join(process.cwd(), 'public', 'stories')
  let found: Record<string, string> = {}
  try {
    found = Object.fromEntries(
      fs
        .readdirSync(dir)
        .filter((f) => IMAGE.test(f))
        .map((f) => [f.replace(IMAGE, ''), `/stories/${encodeURIComponent(f)}`]),
    )
  } catch {
    // папки нет — значит, своих картинок нет
  }
  cached = found
  return found
}
