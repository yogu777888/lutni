import { getMatchesByDate } from '@/lib/data'
import { isYmd } from '@/lib/format'
import { matchColors } from '@/lib/team-colors'

export const dynamic = 'force-dynamic'

/**
 * Цвета клубов матча для градиента центральной панели (components/shell/tint.tsx): ?id=<матч>&d=<YYYY-MM-DD>;
 * пачкой для карточек на полках — ?ids=1,2,3&d=….
 * Страница ждёт цвета не дольше 1,5 с; не успели (эмблемы с чужого сервера, холодный кэш) — догружает отсюда.
 * Цвета эмблемы считаются один раз и хранятся месяц (lib/team-colors.ts).
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const d = url.searchParams.get('d') ?? ''
  const ids = (url.searchParams.get('ids') ?? url.searchParams.get('id') ?? '')
    .split(',')
    .map(Number)
    .filter((n) => Number.isSafeInteger(n) && n > 0)
    .slice(0, 60)
  if (!ids.length || !isYmd(d)) return Response.json({ tint: null, tints: {} }, { status: 400 })
  const tints: Record<number, { home: string; away: string }> = {}
  try {
    const day = await getMatchesByDate(d)
    await Promise.all(
      ids.map(async (id) => {
        const m = day.find((x) => x.id === id)
        const c = m ? await matchColors(m).catch(() => null) : null
        if (c) tints[id] = { home: c.home, away: c.away }
      }),
    )
  } catch {}
  // ?id= — один матч (градиент панели), ?ids= — пачка (карточки на полках)
  const tint = tints[ids[0]] ?? null
  const done = Object.keys(tints).length === ids.length
  return Response.json({ tint, tints }, { headers: { 'Cache-Control': done ? 'public, max-age=86400' : 'no-store', 'X-Robots-Tag': 'noindex' } })
}
