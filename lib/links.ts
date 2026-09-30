import { slugify } from './format'
import type { League, Match } from './types'

export const matchHref = (m: Pick<Match, 'id' | 'home' | 'away'>) =>
  `/match/${m.id}-${slugify(`${m.home.original} ${m.away.original}`)}`

export const leagueHref = (l: Pick<League, 'id' | 'original' | 'country'>) =>
  `/league/${l.id}-${slugify(`${l.original} ${l.country && !/^world$/i.test(l.country) ? l.country : ''}`)}`

export const dayHref = (ymd: string, today: string) => (ymd === today ? '/' : `/matches/${ymd}`)
