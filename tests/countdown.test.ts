import { describe, expect, it } from 'vitest'
import { countdownText } from '@/components/match/Countdown'

describe('countdownText', () => {
  it('меньше часа — минуты и секунды', () => {
    expect(countdownText(29 * 60_000 + 45_000)).toBe('через 29:45')
    expect(countdownText(5_000)).toBe('через 0:05')
  })
  it('меньше суток — часы, минуты, секунды', () => {
    expect(countdownText((1 * 3600 + 29 * 60 + 5) * 1000)).toBe('через 1:29:05')
    expect(countdownText((23 * 3600 + 59 * 60 + 59) * 1000)).toBe('через 23:59:59')
  })
  it('от суток — дни и часы', () => {
    expect(countdownText((26 * 3600 + 10 * 60) * 1000)).toBe('через 1 день 2 ч')
    expect(countdownText(2 * 86_400_000)).toBe('через 2 дня')
    expect(countdownText(5 * 86_400_000 + 3600_000)).toBe('через 5 дней 1 ч')
  })
  it('время вышло', () => {
    expect(countdownText(0)).toBe('вот-вот начнётся')
    expect(countdownText(-60_000)).toBe('вот-вот начнётся')
  })
})
