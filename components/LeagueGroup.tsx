import Link from 'next/link'
import { Icon } from '@/components/Icon'
import { LeagueMark } from '@/components/LeagueMark'
import { leagueLogo } from '@/lib/league-logos'
import { pluralN } from '@/lib/format'
import type { IndexGroup } from '@/lib/league-index'

/** Сколько стран на «Лигах и турнирах» видно сразу; остальные — под «Ещё N стран» (на телефоне 170 раскрывашек давали ~12 000px). */
export const SHOWN = 20

/**
 * Знак в сером круге, как в Apple Sports (владелец: «добавь круглые подложки как в эппл спортс»): логотип турнира — во весь
 * круг (`LeagueMark`, 64% круга), нет логотипа — флаг кругом поменьше внутри, у международных — глобус.
 */
export function Disc({ id = 0, flag, size }: { id?: number; flag: string | null; size: number }) {
  if (id && leagueLogo(id)) return <LeagueMark id={id} flag={flag} size={size} />
  return (
    <span aria-hidden className="grid shrink-0 place-items-center rounded-full bg-white/[0.1]" style={{ width: size, height: size }}>
      <LeagueMark id={0} flag={flag} size={Math.round(size * 0.55)} fallback={<Globe size={Math.round(size * 0.5)} />} />
    </span>
  )
}

function Globe({ size }: { size: number }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="text-dim" style={{ width: size, height: size }} fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.8 2.5 15.2 0 18M12 3c-2.5 2.8-2.5 15.2 0 18" />
    </svg>
  )
}

/** Шеврон у края строки — строка ведёт на страницу турнира, как в списках iOS. */
export const Chevron = ({ className = 'transition-colors group-hover/r:text-fg' }: { className?: string }) => (
  <Icon k="chevron-right" className={`h-4 w-4 shrink-0 text-mute ${className}`} />
)

export function Group({ g }: { g: IndexGroup }) {
  return (
    <li data-group data-q={g.q} className="border-t border-edge">
      <details className="group/c">
        <summary className="flex min-h-[72px] items-center gap-3.5 px-4 py-3 transition-colors hover:bg-white/[0.02] sm:px-5">
          <Disc flag={g.flag} size={44} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[16px] font-semibold">{g.name}</span>
            <span className="block text-[13px] leading-snug text-mute">{pluralN(g.leagues.length, ['турнир', 'турнира', 'турниров'])}</span>
          </span>
          {/* раскрывается — шеврон вниз, тем же значком, что у строк-ссылок */}
          <Chevron className="rotate-90 transition-transform group-open/c:-rotate-90" />
        </summary>
        {/* оформление ссылок — у списка, а не у каждой из 1249: страница и так ~1 МБ; знак — в круге 36px, под знаком страны */}
        <ul className="pb-2 text-[15px] [&_a]:flex [&_a]:min-h-[56px] [&_a]:items-center [&_a]:gap-3.5 [&_a]:py-2 [&_a]:pl-[calc(1rem+4px)] [&_a]:pr-4 [&_a]:text-dim [&_a]:transition-colors [&_a:hover]:bg-white/[0.02] [&_a:hover]:text-fg [&_a:hover_svg]:text-fg sm:[&_a]:pl-[calc(1.25rem+4px)] sm:[&_a]:pr-5">
          {g.leagues.map((l) => (
            <li key={l.id} data-league data-q={l.q || undefined}>
              <Link href={l.href} prefetch={false}>
                <Disc id={l.id} flag={g.flag} size={36} />
                <span className="min-w-0 flex-1">{l.name}</span>
                <Chevron />
              </Link>
            </li>
          ))}
        </ul>
      </details>
    </li>
  )
}
