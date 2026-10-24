import { describe, expect, it } from 'vitest'
import { mirrorWidths } from '@/components/match/SplitBar'

describe('mirrorWidths', () => {
  it('количества — от большего в строке', () => {
    expect(mirrorWidths(12, 3, false)).toEqual([100, 25])
    expect(mirrorWidths(1.9, 0.38, false)).toEqual([100, 20])
  })
  it('проценты — по шкале 0–100', () => {
    expect(mirrorWidths(85, 72, true)).toEqual([85, 72])
    expect(mirrorWidths(64, 36, true)).toEqual([64, 36])
  })
  it('0 : 0 — обе пустые, null и отрицательные — без полосы', () => {
    expect(mirrorWidths(0, 0, false)).toEqual([0, 0])
    expect(mirrorWidths(null, 3, false)).toBeNull()
    expect(mirrorWidths(2, null, true)).toBeNull()
    expect(mirrorWidths(-0.53, 0.2, false)).toBeNull()
  })
})
