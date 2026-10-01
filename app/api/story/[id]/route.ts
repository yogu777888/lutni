import { getMatchInsights } from '@/lib/data'
import { buildStory } from '@/lib/story'

export const dynamic = 'force-dynamic'

/**
 * Данные для «сторис» матча (components/story/StoryViewer).
 * 204 — сторис нет (мало данных): клиент просто откроет страницу матча.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: raw } = await ctx.params
  const id = Number(raw)
  if (!Number.isSafeInteger(id) || id <= 0) return new Response(null, { status: 404 })
  let story
  try {
    const ins = await getMatchInsights(id)
    if (!ins) return new Response(null, { status: 404 })
    story = buildStory(ins)
  } catch {
    return new Response(null, { status: 503 })
  }
  if (!story) return new Response(null, { status: 204 })
  // вероятности до 4 знаков: ответ компактнее, точности для графиков хватает
  const body = JSON.stringify(story, (_k, v) => (typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 1e4) / 1e4 : v))
  return new Response(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // браузер может держать ответ минуту: линия и счёт меняются не так быстро
      'Cache-Control': story.status === 'live' ? 'private, max-age=15' : 'private, max-age=60',
      'X-Robots-Tag': 'noindex',
    },
  })
}
