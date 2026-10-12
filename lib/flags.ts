import { FLAG_CODES } from './flag-codes'
import type { League } from './types'

/** Части Великобритании: у турниров код страны «GB», флаг нужен свой (Англия, Шотландия…). */
const UK: Record<string, string> = { england: 'gb-eng', scotland: 'gb-sct', wales: 'gb-wls', 'northern ireland': 'gb-nir' }

/** Флаг страны турнира — код файла в public/flags; международные турниры («World») — без флага, Европа — флаг ЕС. */
export function flagCode(l: Pick<League, 'country' | 'countryCode'>): string | null {
  const country = l.country.trim().toLowerCase()
  const code = UK[country] ?? (country === 'europe' ? 'eu' : l.countryCode.trim().toLowerCase())
  return code && FLAG_CODES.has(code) ? code : null
}
