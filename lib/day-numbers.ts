/**
 * «Сегодня в цифрах» (владелец, из переписки с ChatGPT: «как в новостях пишут курс валют так же писать средние показатели
 * по матчам», план — пункт 2): средние шансы tag.bet по матчам дня — с чем сравнить «3 гола и больше — 64%» у матча.
 * Набор — матчи топ-турниров дня, которые уже разобраны (`summary.probs` в `lib/data.ts`): тот же набор, что разбирает
 * прогрев, поэтому среднее не скачет от того, какие матчи открывали посетители. Оценка — до матча: у начавшихся она
 * остаётся в сводке, матч из набора не выпадает. Только для сервера.
 */
import { cache } from 'react'
import { isFeatured } from '@/config/leagues'
import { getMatchesByDate, tagsFor } from './data'

export type DayNumbers = {
  /** сколько матчей в среднем */
  n: number
  home: number
  draw: number
  away: number
  over25: number | null
  btts: number | null
}

/** Меньше матчей — среднего не показываем: по трём-четырём матчам «среднее за день» — случайность расписания. */
export const DAY_MIN = 6

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

export const dayNumbers = cache(async (ymd: string): Promise<DayNumbers | null> => {
  const list = await getMatchesByDate(ymd).catch(() => [])
  const probs = list
    .filter((m) => isFeatured(m.league) && m.status !== 'cancelled' && m.status !== 'postponed')
    .flatMap((m) => {
      const p = tagsFor(m).summary?.probs
      return p ? [p] : []
    })
  if (probs.length < DAY_MIN) return null
  const of = (k: 'over25' | 'btts') => avg(probs.flatMap((p) => (p[k] == null ? [] : [p[k]!])))
  return {
    n: probs.length,
    home: avg(probs.map((p) => p.home))!,
    draw: avg(probs.map((p) => p.draw))!,
    away: avg(probs.map((p) => p.away))!,
    over25: of('over25'),
    btts: of('btts'),
  }
})
