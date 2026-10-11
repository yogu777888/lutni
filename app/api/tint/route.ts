import { getMatchesByDate } from '@/lib/data'
import { isYmd } from '@/lib/format'
import { matchColors } from '@/lib/team-colors'

export const dynamic = 'force-dynamic'

/**
 * Цвета клубов матча для градиента центральной панели (components/shell/tint.tsx): ?id=<матч>&d=<YYYY-MM-DD>.
 * Страница ждёт цвета не дольше 1,5 с; не успели (эмблемы с чужого сервера, холодный кэш) — догружает отсюда.
 * Цвета эмблемы считаются один раз и хранятся месяц (lib/team-colors.ts).
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const id = Number(url.searchParams.get('id'))
  const d = url.searchParams.get('d') ?? ''
  if (!Number.isSafeInteger(id) || id <= 0 || !isYmd(d)) return Response.json({ tint: null }, { status: 400 })
  let tint: { home: string; away: string } | null = null
  try {
    const m = (await getMatchesByDate(d)).find((x) => x.id === id)
    const c = m ? await matchColors(m) : null
    if (c) tint = { home: c.home, away: c.away }
  } catch {}
  return Response.json({ tint }, { headers: { 'Cache-Control': tint ? 'public, max-age=86400' : 'no-store', 'X-Robots-Tag': 'noindex' } })
}
