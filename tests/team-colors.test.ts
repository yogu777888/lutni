import { describe, expect, it } from 'vitest'
import { logoColor, matchColors } from '@/lib/team-colors'
import type { Match } from '@/lib/types'

const svg = (fill: string, fill2 = fill) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M0 0H64V64H0Z" fill="${fill}"/><path d="M32 0H64V64H32Z" fill="${fill2}"/></svg>`)}`

describe('цвета клубов из эмблем', () => {
  it('главный цвет — насыщенный оттенок эмблемы; чёрно-белая эмблема — без цвета', async () => {
    const red = await logoColor(svg('#d0021b'))
    expect(red && (red.h < 15 || red.h > 345)).toBe(true)
    const blue = await logoColor(svg('#0057b8'))
    expect(blue && blue.h > 200 && blue.h < 230).toBe(true)
    expect(await logoColor(svg('#000000', '#ffffff'))).toBeNull()
    expect(await logoColor(null)).toBeNull()
  })

  it('цвета матча: хозяева и гости; у похожих оттенков гости темнее; без эмблем — null', async () => {
    const team = (logo: string | null) => ({ id: 1, name: 'X', original: 'X', logo, country: '' })
    const m = (a: string | null, b: string | null) => ({ home: team(a), away: team(b) }) as unknown as Match
    const c = await matchColors(m(svg('#d0021b'), svg('#0057b8')))
    expect(c?.home).toMatch(/^hsl\(/)
    expect(c?.home).not.toBe(c?.away)
    const close = await matchColors(m(svg('#d0021b'), svg('#c8102e')))
    const light = (s: string) => Number(/(\d+)%\)$/.exec(s)![1])
    expect(light(close!.away)).toBeLessThan(light(close!.home))
    expect(await matchColors(m(null, null))).toBeNull()
  })
})
