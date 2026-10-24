import { describe, expect, it } from 'vitest'
import { lsPeriods, matchRows, periodRows, shownAll } from '../lib/sstats/stat-rows'
import real from './fixtures/ls-statistics.json'
import type { RawLsPeriod } from '../lib/sstats/ls'

// настоящий ответ `/Ls/GameInfo` (октябрь 2026): 34 метрики в каждом периоде и `otherStats`
const info = { statistics: real as unknown as Record<string, RawLsPeriod> }

describe('«Статистика»: все показатели SStats', () => {
  it('настоящий матч: все метрики, проценты с «из», отрицательные, группы', () => {
    const rows = periodRows(info.statistics.fullTime)
    expect(rows).toHaveLength(34) // «Goal kicks» из otherStats уже есть в metrics — не дублируем
    const by = (k: string) => rows.find((r) => r.key === k)!
    expect(by('passAccuracy')).toMatchObject({ home: 82, away: 77, kind: 'pct', suffix: '%', detail: { home: '372/452', away: '261/341' }, group: 'ball' })
    expect(by('ballPossession')).toMatchObject({ home: 56, away: 44, kind: 'share' })
    expect(by('goalsPrevented')).toMatchObject({ home: 0.54, away: -0.53, group: 'gk' })
    expect(by('fouls')).toMatchObject({ neutral: true, group: 'discipline' })
    expect(by('errorsToGoal')).toMatchObject({ neutral: true, group: 'defense' })
    expect(rows.every((r) => !r.key.startsWith('ls-'))).toBe(true)
    expect(lsPeriods(info).map((p) => p.key)).toEqual(['all', 'first', 'second'])
  })

  it('незнакомая метрика и otherStats не пропадают; null — не ноль; доп. время «extraTIme»', () => {
    const p = {
      metrics: [
        { id: '999', name: 'Dribbles', groups: ['Attack'], home: { value: 5 }, away: { value: null } },
        { id: '34', name: 'Total shots', home: { value: null }, away: { value: null } },
      ],
      otherStats: { 'Long balls': { home: '12', away: '9' } },
    }
    const rows = periodRows(p)
    expect(rows.map((r) => [r.key, r.label, r.group, r.home, r.away])).toEqual([
      ['ls-999', 'Dribbles', 'attack', 5, null],
      ['other-long-balls', 'Long balls', 'other', 12, 9],
    ])
    const full = { metrics: [{ id: '34', home: { value: 1 }, away: { value: 2 } }] }
    const three = { metrics: [{ id: '34', home: { value: 1 }, away: { value: 2 } }, { id: '13', home: { value: 1 }, away: { value: 0 } }, { id: '16', home: { value: 0 }, away: { value: 1 } }] }
    expect(lsPeriods({ statistics: { fullTime: full, firstHalf: three, secondHalf: three, extraTIme: three } }).map((x) => x.key)).toEqual(['all', 'first', 'second', 'extra'])
  })

  it('матч целиком: строки /Games важнее, остальное — из /Ls; 0 : 0 в «Все» прячем, кроме жёлтых', () => {
    const ls = periodRows(info.statistics.fullTime)
    const rows = matchRows([{ key: 'totalShots', label: 'Удары', home: 12, away: 3 }, { key: 'dangerousAttacks', label: 'Опасные атаки', home: 40, away: 20 }], ls)
    expect(rows.find((r) => r.key === 'totalShots')).toMatchObject({ home: 12, away: 3 })
    expect(rows.find((r) => r.key === 'dangerousAttacks')).toMatchObject({ group: 'attack', kind: 'count' })
    expect(rows.find((r) => r.key === 'passAccuracy')?.detail).toBeTruthy()
    expect(shownAll({ key: 'redCards', label: '', group: 'discipline', home: 0, away: 0, kind: 'count' })).toBe(false)
    expect(shownAll({ key: 'yellowCards', label: '', group: 'discipline', home: 0, away: 0, kind: 'count' })).toBe(true)
  })
})
