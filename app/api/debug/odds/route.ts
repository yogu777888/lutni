import type { NextRequest } from 'next/server'
import { isAdmin } from '@/lib/admin'
import { classifyMarket } from '@/lib/odds'
import { apiGet } from '@/lib/sstats/client'
import type { RawBookmakerOdds } from '@/lib/sstats/types'

export const dynamic = 'force-dynamic'

/**
 * Калибровка разбора рынков на реальном API:
 * /api/debug/odds?id=<ID матча>&token=<ADMIN_TOKEN>
 * Показывает сырые названия рынков/исходов и то, как их распознал парсер.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  if (!isAdmin(sp.get('token'))) return new Response('Not found', { status: 404 })
  const id = Number(sp.get('id'))
  if (!Number.isInteger(id) || id <= 0) return Response.json({ error: 'укажите ?id=<ID матча>' }, { status: 400 })
  try {
    const raw = (await apiGet<RawBookmakerOdds[]>(`/Odds/${id}`)) ?? []
    const markets = new Map<string, { marketId: string; marketName: string; recognizedAs: string | null; books: number; outcomes: Set<string> }>()
    for (const b of raw) {
      for (const bet of b.odds ?? []) {
        const key = `${bet.marketId}|${bet.marketName}`
        const m = markets.get(key) ?? {
          marketId: String(bet.marketId),
          marketName: bet.marketName,
          recognizedAs: classifyMarket(bet.marketName),
          books: 0,
          outcomes: new Set<string>(),
        }
        m.books++
        for (const p of bet.odds ?? []) m.outcomes.add(p.name)
        markets.set(key, m)
      }
    }
    return Response.json({
      id,
      bookmakers: raw.map((b) => ({ id: b.bookmakerId, name: b.bookmakerName, markets: b.odds?.length ?? 0 })),
      markets: [...markets.values()].map((m) => ({ ...m, outcomes: [...m.outcomes].slice(0, 40) })),
    })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 })
  }
}
