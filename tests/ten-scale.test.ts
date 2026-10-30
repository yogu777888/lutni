import { describe, expect, it } from 'vitest'
import { tenText } from '@/components/TenScale'

describe('шкала из 10', () => {
  it('«≈ 6 из 10», у краёв — без обещаний', () => {
    expect(tenText(0.58)).toBe('≈ 6 из 10')
    expect(tenText(0.96)).toBe('больше 9 из 10')
    expect(tenText(0.03)).toBe('меньше 1 из 10')
  })
})
