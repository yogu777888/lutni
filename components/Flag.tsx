import { flagCode } from '@/lib/flags'
import type { League } from '@/lib/types'
import { LeagueMark } from './LeagueMark'

/** Знак турнира перед названием лиги — логотип лиги или флаг страны (flag-icons, MIT), кругом 22px, как в левой панели; нет ни того, ни другого — ничего. */
export function Flag({ league, size = 22, className = '' }: { league: Pick<League, 'id' | 'country' | 'countryCode'>; size?: number; className?: string }) {
  return <LeagueMark id={league.id} flag={flagCode(league)} size={size} className={className} />
}
