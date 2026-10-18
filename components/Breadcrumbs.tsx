import Link from 'next/link'
import { SITE } from '@/config/site'
import { BackButton, BackLabel } from './BackButton'
import { JsonLd } from './JsonLd'

export type Crumb = { href: string; label: string }

/**
 * Крошки — от раздела, без общего «Матчи» в начале (владелец: «такое чувство что хлебные крошки на странице бк немного
 * неправильно написаны» — было «Матчи / Букмекеры / Winline», а «Букмекеры» не внутри «Матчей»). `back` — «←» в начале
 * строки, как на странице матча (пришли с сайта — назад, иначе — в раздел выше); `parentOnly` — на экране только раздел
 * на шаг выше, как в приложениях на iPhone: «← Букмекеры», «← Ла Лига» (владелец: «на странице матча хлебные крошки
 * через / а на других просто слово» — одно правило везде; полная цепочка — в разметке для поисковиков).
 */
export function Breadcrumbs({
  items,
  className = 'mb-4',
  back = false,
  parentOnly = false,
  chip = false,
}: {
  items: Crumb[]
  className?: string
  back?: boolean
  parentOnly?: boolean
  /** одна кнопка «‹ Раздел» чипом (`BackLabel chip`) — в углу первого блока страницы; полная цепочка — для поисковиков */
  chip?: boolean
}) {
  // ссылка на тот же адрес второй раз не нужна (у подборки за сегодня «Футбол сегодня» и «Матчи» могут совпасть) —
  // иначе два одинаковых ключа и два одинаковых пункта в BreadcrumbList
  const all = items.filter((c, i, list) => list.findIndex((x) => x.href === c.href) === i)
  const shown = parentOnly && all.length > 1 ? [all[all.length - 2]] : all
  const parent = all.length > 1 ? all[all.length - 2].href : all[0]?.href ?? '/'
  const ld = (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: all.map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: c.label,
          item: `${SITE.url}${c.href}`,
        })),
      }}
    />
  )
  if (chip) {
    const up = all.length > 1 ? all[all.length - 2] : all[0]
    return (
      <>
        <nav aria-label="Навигация" className={`flex min-w-0 ${className}`}>
          <BackLabel fallback={up} chip />
        </nav>
        {ld}
      </>
    )
  }
  return (
    <>
      <nav aria-label="Навигация" className={`scrollbar-none flex items-center gap-1.5 overflow-x-auto whitespace-nowrap text-[13px] text-mute ${className}`}>
        {back ? <BackButton fallback={parent} className="mr-1.5" /> : null}
        {shown.map((c, i) => (
          <span key={`${i}:${c.href}`} className="flex items-center gap-1.5">
            {i > 0 ? <span className="text-mute">/</span> : null}
            {parentOnly ? (
              <BackLabel fallback={c} />
            ) : i < all.length - 1 ? (
              <Link href={c.href} className="transition-colors hover:text-fg">
                {c.label}
              </Link>
            ) : (
              <span className="text-dim">{c.label}</span>
            )}
          </span>
        ))}
      </nav>
      {ld}
    </>
  )
}
