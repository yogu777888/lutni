import { FavStar } from '../FavStar'
import { TeamLogo } from '../TeamLogo'

/**
 * Шапка команды над сравнением — одна у «Статистики» и «Формы команд»: эмблема 28px, название 16px и звёздочка
 * «в избранное» (владелец: «добавь звездочки к командам в статистике»); гости — зеркально.
 */
export function TeamHead({ t, right = false }: { t: { id: number; name: string; logo?: string | null }; right?: boolean }) {
  return (
    <span className={`flex min-w-0 items-center gap-2.5 ${right ? 'flex-row-reverse text-right' : ''}`}>
      <span className="shrink-0"><TeamLogo name={t.name} src={t.logo ?? null} size={28} /></span>
      <span className="truncate text-[16px] font-semibold">{t.name}</span>
      <FavStar id={t.id} name={t.name} logo={t.logo ?? null} compact className={right ? '-mr-1.5' : '-ml-1.5'} />
    </span>
  )
}
