import { FLAG_CODES } from './flag-codes'
import type { League } from './types'

/** Свой флаг вместо кода из API: части Великобритании (у турниров код «GB» — флаг нужен свой: Англия, Шотландия…), два Конго. */
const UK: Record<string, string> = {
  england: 'gb-eng',
  scotland: 'gb-sct',
  wales: 'gb-wls',
  'northern ireland': 'gb-nir',
  // в API коды двух Конго перепутаны: у «Congo» — CD (ДР Конго), у «Congo-DR» — CG
  congo: 'cg',
  'congo-dr': 'cd',
}

/** Флаг страны турнира — код файла в public/flags; международные турниры («World») — без флага, Европа — флаг ЕС. */
export function flagCode(l: Pick<League, 'country' | 'countryCode'>): string | null {
  const country = l.country.trim().toLowerCase()
  const code = UK[country] ?? (country === 'europe' ? 'eu' : l.countryCode.trim().toLowerCase())
  return code && FLAG_CODES.has(code) ? code : null
}

/** «Испания. Ла Лига» → «Ла Лига»: часть до первой точки — страна (её говорит флаг). */
export const leagueTitle = (name: string) => name.replace(/^[^.]+\.\s+/, '') || name
