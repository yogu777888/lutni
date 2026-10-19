import { HeaderRow } from './HeaderRow'

/**
 * Шапка вложенной страницы на телефоне и планшете (лига, букмекер, подборка): «‹» без подписи и по центру название
 * страницы — всегда, как навигация в iOS (`HeaderRow`; владелец: «давай по такому принципу сделаем хедер на других
 * страницах? без подписей у стрелочек» — раньше название появлялось только после прокрутки, а наверху стояло «‹ Лиги»).
 * От lg — капсула «‹ ›» в `PageHead`.
 */
export function TopBar({ fallback, title }: { fallback: { href: string; label: string }; title: string }) {
  return <HeaderRow fallback={fallback} idle={<p className="truncate text-[16px] font-semibold">{title}</p>} />
}
