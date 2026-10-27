'use server'

import { Group, SHOWN } from '@/components/LeagueGroup'
import { getLeagues } from '@/lib/data'
import { leagueIndex } from '@/lib/league-index'

/** Страны «Лиг и турниров» после первых `SHOWN` — догружает `MoreCountries` (список лиг — из кэша, запроса к API нет). */
export async function moreCountries() {
  const { groups } = await leagueIndex(await getLeagues().catch(() => []))
  return groups.slice(SHOWN).map((g) => <Group key={g.key} g={g} />)
}
