import { describe, expect, it } from 'vitest'
import { getLiveOdds, getMatchesByDate, getPariHistory, pariFor } from '@/lib/data'
import { todayYmd } from '@/lib/format'
import { linkPari, nameScore } from '@/lib/pari-link'
import { isLive } from '@/lib/rank'
import { pariHistory, type PariMatch } from '@/lib/sstats/pari'
import type { Match } from '@/lib/types'

const team = (original: string) => ({ id: 1, name: original, original, logo: null, country: '' })
const match = (home: string, away: string, ts = 1_000_000_000_000) => ({ id: 1, ts, home: team(home), away: team(away) }) as unknown as Match
const pari = (home: string, away: string, ts = 1_000_000_000_000): PariMatch => ({ eventId: 9, ts, status: 'scheduled', league: '', home, away, url: null, odds: {} })

describe('связь с PARI', () => {
  it('разные написания одного клуба', () => {
    expect(nameScore('Vasco DA Gama', 'Vasco da Gama RJ')).toBe(1)
    expect(nameScore('FC Utrecht', 'Utrecht')).toBe(1)
    expect(nameScore('Krylya Sovetov II', 'Krylia Sovetov 2')).toBeGreaterThan(0)
  })

  it('основной состав не путаем с молодёжным и женским', () => {
    expect(nameScore('Konyaspor', 'Konyaspor U19')).toBe(0)
    expect(nameScore('Tokyo Verdy', 'Tokyo Verdy (w)')).toBe(0)
  })

  it('время дальше 20 минут или только общий город — без связи', () => {
    expect(linkPari(match('Juarez', 'Tijuana'), [pari('Juarez', 'Tijuana', 1_000_000_000_000 + 30 * 60_000)])).toBeNull()
    expect(linkPari(match('Yangon United', 'Yangon Royals'), [pari('Yangon United', 'Yangon City')])).toBeNull()
    expect(linkPari(match('Juarez', 'Tijuana'), [pari('Juarez', 'Tijuana')])?.eventId).toBe(9)
  })
})

describe('история линии', () => {
  it('точка — только при смене значения, 0 — снят с линии', () => {
    const h = pariHistory([
      { isLive: false, isSuspended: false, createdAt: '2026-10-01T10:00:00+03:00', odds: [{ id: 8250, value: 2.4 }] },
      { isLive: false, isSuspended: false, createdAt: '2026-10-01T11:00:00+03:00', odds: [{ id: 8250, value: 2.4 }] },
      { isLive: false, isSuspended: false, createdAt: '2026-10-01T12:00:00+03:00', odds: [{ id: 8250, value: 0 }] },
      { isLive: false, isSuspended: false, createdAt: '2026-10-01T13:00:00+03:00', odds: [{ id: 8250, value: 2.2 }] },
    ])
    expect(h.home?.map((p) => p.v)).toEqual([2.4, null, 2.2])
  })

  it('демо: у идущих матчей есть live-кэфы, у предстоящих — история', async () => {
    const ms = await getMatchesByDate(todayYmd())
    const live = ms.filter(isLive)
    const odds = await Promise.all(live.map((m) => getLiveOdds(m)))
    expect(odds.some((o) => o && Object.keys(o).length)).toBe(true)
    const up = ms.find((m) => m.status === 'scheduled')!
    expect(await pariFor(up)).not.toBeNull()
    const h = await getPariHistory(up)
    expect((h?.history.home ?? []).length).toBeGreaterThan(1)
  })
})
