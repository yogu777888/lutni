import { flagCode } from '@/lib/flags'
import type { League } from '@/lib/types'

/** Флаг страны турнира перед названием лиги (flag-icons, MIT) — кругом 22px, как в левой панели; нет флага — ничего. */
export function Flag({ league, className = '' }: { league: Pick<League, 'country' | 'countryCode'>; className?: string }) {
  const code = flagCode(league)
  if (!code) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element -- маленький SVG, оптимизация next/image не нужна
    <img
      src={`/flags/${code}.svg`}
      alt=""
      width={22}
      height={22}
      loading="lazy"
      className={`h-[22px] w-[22px] shrink-0 rounded-full object-cover ring-1 ring-white/15 ${className}`}
    />
  )
}
