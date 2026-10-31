/** Общее для скриптов проверки модели: где лежит скачанная история и как её читать. */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

export const DIR = path.join(import.meta.dirname, '..', '..', '.data', 'backtest')
/** Топ-турниры с сезонами «осень — весна» (ЧМ, Евро и Лигу наций не берём: там сборные и редкие матчи). */
export const LIST_LEAGUES = [39, 140, 135, 78, 61, 235, 2, 3, 848, 88, 94, 203, 40]
export const YEARS = [2021, 2022, 2023, 2024, 2025, 2026]
/** Лиги, где качаем кэфы всех букмекеров и рейтинг по каждому матчу: АПЛ, Ла Лига, Серия A, Бундеслига, Лига 1, РПЛ. */
export const GAME_LEAGUES = [39, 140, 135, 78, 61, 235]
export const GAME_YEARS = [2026, 2025, 2024]

export const listFile = (league: number, year: number) => path.join(DIR, 'list', `${league}-${year}.json`)

export type RawListGame = {
  id: number
  dateUtc: number
  status: number
  homeFTResult: number | null
  awayFTResult: number | null
  homeTeam: { id: number; name: string }
  awayTeam: { id: number; name: string }
}

export function readList(league: number, year: number): RawListGame[] {
  const f = listFile(league, year)
  if (!existsSync(f)) return []
  const j = JSON.parse(readFileSync(f, 'utf8')) as { data?: RawListGame[] }
  return j.data ?? []
}

