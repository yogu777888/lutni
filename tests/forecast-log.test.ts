import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Match } from '@/lib/types'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('архив оценок на диске', () => {
  it('пишет оценку до начала, после начала не меняет, сверяет итог', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'fc-'))
    vi.stubEnv('SSTATS_MOCK', '')
    vi.stubEnv('DATA_DIR', dir)
    vi.resetModules()
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout'] })
    const kick = Date.parse('2026-10-30T19:00:00+03:00')
    vi.setSystemTime(kick - 3600_000)
    const log = await import('@/lib/forecast-log')
    const team = (id: number, name: string) => ({ id, name, original: name, logo: null, country: 'Spain' })
    const m = {
      id: 7,
      ts: kick,
      status: 'scheduled',
      home: team(1, 'Барселона'),
      away: team(2, 'Хетафе'),
      score: null,
      scoreFT: null,
      league: { id: 140, name: 'Испания. Ла Лига', original: 'La Liga', country: 'Spain', countryCode: 'ES' },
    } as unknown as Match
    const model = { x12: { home: 0.6, draw: 0.25, away: 0.15 }, over: { '2.5': 0.55 }, btts: 0.5 } as never
    const cons = { x12: { home: 0.61, draw: 0.24, away: 0.15 }, over: { '2.5': 0.56 }, btts: 0.52 } as never
    await log.recordForecast(m, model, cons)
    // после начала — уже не пишем
    vi.setSystemTime(kick + 60_000)
    await log.recordForecast(m, { ...(model as object), x12: { home: 0.9, draw: 0.05, away: 0.05 } } as never, cons)
    await vi.advanceTimersByTimeAsync(6_000)
    vi.useRealTimers()
    await new Promise((r) => setTimeout(r, 50))
    const saved = JSON.parse(await readFile(path.join(dir, 'forecasts', '2026-10-30.json'), 'utf8'))
    expect(saved[0].p.home).toBe(0.6)
    expect(saved[0].line.over25).toBe(0.56)

    vi.useFakeTimers({ toFake: ['Date', 'setTimeout'] })
    vi.setSystemTime(kick + 3 * 3600_000)
    await log.settleForecasts(async () => [{ ...m, status: 'finished', scoreFT: { home: 1, away: 2 } } as Match])
    const [f] = await log.readForecasts(0)
    expect(f.res).toEqual({ home: 1, away: 2 })
  })
})
