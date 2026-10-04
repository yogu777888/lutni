import { describe, expect, it } from 'vitest'
import { lineFact, pickFacts, teamFacts } from '@/lib/facts'
import { biggestMove, goalsLine, lineMoves, periodEnd, x12Line, type OddsSnap } from '@/lib/lines'
import type { BookOdds } from '@/lib/odds'
import type { FormGame, H2H, TeamForm } from '@/lib/stats'

// 4 октября 2026, 19:30 МСК
const AT = Date.parse('2026-10-04T19:30:00+03:00')
const q = (value: number, opening: number | null = null) => ({ value, opening })

function book(id: number, name: string, x12: [number, number, number] | null, ou?: [number, number], open?: [number, number, number]): BookOdds {
  return {
    bookmakerId: id,
    bookmakerName: name,
    x12: x12 ? { home: q(x12[0], open?.[0] ?? null), draw: q(x12[1], open?.[1] ?? null), away: q(x12[2], open?.[2] ?? null) } : null,
    totals: ou ? [{ line: 2.5, over: q(ou[0]), under: q(ou[1]) }] : [],
    btts: null,
    dc: null,
  }
}

const snap = (...books: BookOdds[]): OddsSnap => ({ books, at: AT })

describe('линия одного букмекера', () => {
  it('берёт первого легального партнёра по порядку, зарубежных не называет', () => {
    const s = snap(book(8, 'Bet365', [1.5, 4, 6]), book(2, 'Winline', [1.52, 4.1, 6.2]), book(1, 'Fonbet', [1.55, 4.2, 6.4]))
    expect(x12Line(s)).toMatchObject({ bookmaker: 'Фонбет', home: 1.55, draw: 4.2, away: 6.4, at: AT })
    expect(x12Line(snap(book(8, 'Bet365', [1.5, 4, 6]), book(9, '1xBet', [1.5, 4, 6])))).toBeNull()
  })

  it('шанс 3+ голов — из пары ТБ/ТМ 2,5 одного букмекера без маржи', () => {
    // 1/1.80 = 0.5556, 1/2.10 = 0.4762 → 0.5556 / 1.0317 = 53.8%
    const g = goalsLine(snap(book(3, 'Pari', null, [1.8, 2.1])))
    expect(g?.bookmaker).toBe('PARI')
    expect(g?.p).toBeCloseTo(0.5385, 3)
    // нет пары у первого партнёра — берём следующего, у кого она есть, а не смешиваем
    const g2 = goalsLine(snap(book(1, 'Fonbet', [2, 3.4, 3.6]), book(2, 'Winline', null, [1.6, 2.4])))
    expect(g2?.bookmaker).toBe('Winline')
    // битая пара (сумма обратных 1.5) — оценки нет
    expect(goalsLine(snap(book(1, 'Fonbet', null, [1.2, 1.4])))).toBeNull()
  })

  it('движение: открытие → последнее значение одного букмекера, и самое заметное из 1X2', () => {
    const moves = lineMoves(snap(book(1, 'Fonbet', [1.2, 6.87, 13.47], undefined, [1.36, 6.1, 9.8])))
    expect(moves.map((m) => m.key)).toEqual(['home', 'draw', 'away'])
    const home = moves.find((m) => m.key === 'home')!
    expect(home.change).toBeCloseTo(1.2 / 1.36 - 1, 6)
    const best = biggestMove(moves)
    expect(best?.key).toBe('away')
    expect(best?.change).toBeGreaterThan(0.3)
    // без кэфов открытия движения нет
    expect(lineMoves(snap(book(1, 'Fonbet', [1.2, 6.87, 13.47])))).toEqual([])
  })

  it('период: до момента снимка, а после начала матча — до начала матча', () => {
    const kickoff = Date.parse('2026-10-04T21:00:00+03:00')
    expect(periodEnd(AT, kickoff)).toBe('до 19:30')
    expect(periodEnd(AT, Date.parse('2026-10-04T18:00:00+03:00'))).toBe('до начала матча')
    expect(periodEnd(AT, Date.parse('2026-10-05T20:00:00+03:00'))).toBe('до 4 октября, 19:30')
  })
})

const fg = (gf: number, ga: number, isHome = true): FormGame => ({
  id: 0,
  ts: 0,
  opponent: { id: 1, name: 'X', original: 'X', logo: null, country: '' },
  isHome,
  gf,
  ga,
  result: gf > ga ? 'W' : gf < ga ? 'L' : 'D',
  league: '',
})

const form = (homeGames: FormGame[], awayGames: FormGame[]): TeamForm =>
  ({ homeGames, awayGames }) as unknown as TeamForm

describe('факты о командах', () => {
  it('с выборкой: хозяева — по домашним матчам, гости — по выездным', () => {
    const home = form([fg(2, 1), fg(1, 1), fg(3, 0), fg(1, 2), fg(2, 2), fg(1, 0), fg(4, 1), fg(0, 0), fg(2, 1), fg(1, 3)], [])
    const away = form([], [fg(0, 2, false), fg(1, 2, false), fg(0, 1, false), fg(2, 2, false), fg(0, 3, false), fg(1, 1, false)])
    const facts = teamFacts({ homeForm: home, awayForm: away, h2h: null }).map((f) => f.text)
    expect(facts).toContain('Хозяева забивали в 9 из 10 последних домашних матчей')
    expect(facts).toContain('Гости пропускали в 6 из 6 последних выездных матчей')
    expect(facts).toContain('Гости не выиграли ни одного из 6 последних выездных матчей')
  })

  it('выборка меньше пяти матчей — не факт; личные встречи — от четырёх', () => {
    expect(teamFacts({ homeForm: form([fg(1, 0), fg(2, 0), fg(1, 0), fg(3, 0)], []), awayForm: null, h2h: null })).toEqual([])
    const h2h = { games: [{}, {}, {}, {}], homeWins: 3, draws: 1, awayWins: 0, avgGoals: 2, over25Rate: 0.25, bttsRate: 0.5 } as unknown as H2H
    expect(teamFacts({ homeForm: null, awayForm: null, h2h }).map((f) => f.text)).toEqual(['Хозяева выиграли 3 из 4 последних личных встреч'])
  })

  it('движение линии словами — с букмекером и периодом; два факта — о разных командах или линия', () => {
    const kickoff = Date.parse('2026-10-04T21:00:00+03:00')
    const mv = { key: 'away' as const, from: 2.4, to: 1.97, change: 1.97 / 2.4 - 1, bookmaker: 'Фонбет', slug: 'fonbet', at: AT }
    const line = lineFact(mv, kickoff)
    expect(line?.text).toBe('Фонбет: кэф на победу гостей снизился с 2.40 до 1.97 с открытия линии до 19:30')
    const team = [
      { text: 'A1', w: 1, topic: 'Хозяева:attack' },
      { text: 'A2', w: 0.99, topic: 'Хозяева:defence' },
      { text: 'B1', w: 0.9, topic: 'Гости:attack' },
    ]
    expect(pickFacts(team, null)).toEqual(['A1', 'B1'])
    expect(pickFacts(team, line)).toEqual(['A1', line!.text])
    expect(pickFacts([], null)).toEqual([])
  })
})
