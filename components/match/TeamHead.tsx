import { FavStar } from '../FavStar'
import { TeamLogo } from '../TeamLogo'

/**
 * Шапка команды над сравнением — одна у «Статистики» и «Формы команд»: эмблема 28px, название 16px и звёздочка
 * «в избранное» (владелец: «добавь звездочки к командам в статистике»); гости — зеркально.
 */
export function TeamHead({ t, right = false }: { t: { id: number; name: string; logo?: string | null }; right?: boolean }) {
  const star = <FavStar id={t.id} name={t.name} logo={t.logo ?? null} compact className={right ? '-mr-1.5' : '-ml-1.5'} />
  // на телефоне эмблема и звёздочка — строкой сверху, название под ними во всю ширину половины (владелец, план «мелочи» —
  // «да»): в одну строку с ними на название оставалось ~70px — «Райо Вальека…», «Реал Сосьед…»; от sm — в одну строку
  return (
    <span className={`flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2.5 ${right ? 'items-end text-right sm:flex-row-reverse' : 'items-start'}`}>
      <span className={`flex shrink-0 items-center gap-2.5 ${right ? 'flex-row-reverse' : ''}`}>
        <TeamLogo name={t.name} src={t.logo ?? null} size={28} />
        <span className="sm:hidden">{star}</span>
      </span>
      <span className="line-clamp-2 min-w-0 break-words text-[16px] font-semibold leading-tight">{t.name}</span>
      <span className="hidden sm:contents">{star}</span>
    </span>
  )
}
