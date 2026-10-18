import { NavPair } from './BackButton'
import { Breadcrumbs, upOf, type Crumb } from './Breadcrumbs'
import { NavIcon } from './NavIcon'
import { TopBar } from './TopBar'

/**
 * Шапка страницы — одна на весь сайт (владелец: «на всех страницах разные по размеру заголовки? в букмекерах заголовок
 * в одном блоке с букмекерами, а на остальных — в своём блоке», согласился): своя панель, крошки — где страница вложена,
 * знак слева (флаг лиги, значок подборки, логотип букмекера), заголовок Onest 24px / 28px от sm, подпись 14px серым,
 * справа — кнопка (`aside`, на телефоне — под заголовком), ниже — инструменты страницы (`children`: поиск, дни, «как
 * считаем»). Было пять размеров: 22–24, 24–28, 28–36, 30–34 и плакат Oswald 36–56px.
 */
export function PageHead({
  title,
  crumbs,
  lead,
  section,
  sub,
  aside,
  children,
}: {
  /** раздел меню (`/tags`, `/leagues`…) — его значок из нижнего меню перед заголовком: «вы здесь» */
  section?: string
  title: React.ReactNode
  crumbs?: Crumb[]
  lead?: React.ReactNode
  sub?: React.ReactNode
  aside?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <>
    {/* ниже lg «назад» — полосой под шапкой, как в iOS (`TopBar`); здесь крошки — только для поисковиков */}
    {crumbs ? <TopBar fallback={upOf(crumbs)} title={typeof title === 'string' ? title : crumbs[crumbs.length - 1].label} /> : null}
    <section className="card min-w-0 px-4 py-4 sm:px-5">
      {/* «назад» — чипом «‹ Лиги» в углу блока, как в табло матча (владелец: «а можно как то красиво кнопки назад в блоке
          вставить?» — отдельная полоса с одним «Назад» над карточкой выглядела пусто) */}
      {/* на компьютере — капсулой «‹ ›» слева от заголовка, как в Finder */}
      {crumbs ? <Breadcrumbs items={crumbs} chip className="hidden" /> : null}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {crumbs ? <NavPair fallback={upOf(crumbs)} className="mr-1 max-lg:hidden" /> : null}
          {lead ? <div className="shrink-0">{lead}</div> : null}
          <div className="min-w-0">
            {/* у разделов меню — тот же значок, что в нижнем меню, в строке заголовка (владелец: «может на других страницах кроме
                главной надо рядом с заголовком сделать иконку?» — «да»): белый в круге 36px; подпись — под ними во всю ширину
                (значок по центру всего блока висел посреди абзаца) */}
            <div className="flex items-center gap-3">
              {section && !lead ? (
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.08] text-fg">
                  <NavIcon href={section} on size={20} />
                </span>
              ) : null}
              <h1 data-bar-title className="h1-block min-w-0 text-[24px] leading-tight sm:text-[28px]">
                {title}
              </h1>
            </div>
            {sub ? <div className="mt-1.5 max-w-[68ch] text-[14px] leading-snug text-dim">{sub}</div> : null}
          </div>
        </div>
        {aside ? <div className="w-full sm:w-auto">{aside}</div> : null}
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </section>
    </>
  )
}
