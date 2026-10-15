import Link from 'next/link'
import { primaryPartner } from '@/config/bookmakers'
import { goHref } from '@/lib/affiliate'
import { adInfo } from './AdMark'
import { CtaLink } from './CtaLink'
import { HeaderShell } from './HeaderShell'
import { Wordmark } from './Logo'
import { NavLinks } from './NavLinks'
import { Search } from './Search'

/**
 * Шапка одной спокойной строкой: надпись tag.bet и меню текстом слева, справа поиск, «Реклама · 18+» и «Бонус».
 * Бегущую строку матчей убрали — шапка была перегружена, а идущие матчи и так видны в «В игре» и «Главных матчах».
 * Ниже lg меню — тем же текстом во втором ряду.
 */
export function Header() {
  const partner = primaryPartner()
  return (
    <HeaderShell>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-5 lg:gap-5 xl:max-w-none xl:px-6">
        <Link href="/" aria-label="tag.bet — на главную" className="shrink-0 text-fg transition-opacity hover:opacity-80">
          {/* на 3px ниже середины рамки: в рамку входит хвост «g» — без сдвига надпись стояла выше меню и кнопок. Глаз
              ровняет по высоким буквам «t», «b» и строке, а не по «a», «e»: середина «верх t — строка» = середина
              заглавных в меню (сдвиг 1,5px по середине «a», «e» владелец ещё видел выше) */}
          <Wordmark size={26} className="translate-y-[3px]" />
        </Link>
        <NavLinks className="hidden shrink-0 lg:flex" />
        <span className="flex-1" />
        <div className="flex shrink-0 items-center gap-3">
          <Search />
          {partner ? (
            // маркировка рекламы — видимой пометкой «Реклама» рядом с кнопкой (закон о рекламе, ст. 18.1: в самой рекламе —
            // пометка «Реклама» и рекламодатель или ссылка на сведения о нём; владелец согласился: раньше пометка была только
            // в подсказке при наведении — до наведения и на телефоне её не было видно). Сведения о рекламодателе и erid —
            // при наведении или нажатии на пометку (кнопка: на телефоне по тапу). Формат сверить с ОРД партнёрки.
            // до кнопки 8px, до поиска — 20px (12 общего зазора + ml-2): пометка «прилипает» к «Бонусу», а не висит посередине
            // между поиском и кнопкой (владелец согласился)
            <span className="group/ad relative ml-2 flex items-center gap-2">
              <button
                type="button"
                aria-describedby="hdr-ad"
                className="flex items-center gap-1.5 text-[11.5px] font-medium text-dim transition-colors hover:text-fg"
              >
                Реклама
                <span className="rounded-[4px] border-[1.5px] border-current/70 px-1 text-[11px] font-bold leading-[16px]" title="Только для совершеннолетних">
                  18+
                </span>
              </button>
              <CtaLink href={goHref(partner, 'header')} size="sm" className="cta-shine !h-9 rounded-ctl px-4 text-[14px]" describedBy="hdr-ad">
                {/* с именем букмекера: «Бонус» без имени — реклама «неизвестно чего» (владелец согласился); ниже xl (меню
                    и поиск) места нет — только «Бонус» */}
                <span>
                  Бонус<span className="hidden xl:inline"> в {partner.name}</span>
                </span>
              </CtaLink>
              <span
                id="hdr-ad"
                role="tooltip"
                className="pointer-events-none absolute right-0 top-full z-50 mt-2 whitespace-nowrap rounded-tile bg-panel-3 px-3 py-2 text-[12.5px] leading-tight text-dim opacity-0 shadow-lg shadow-black/40 transition-opacity duration-150 group-focus-within/ad:opacity-100 group-hover/ad:opacity-100"
              >
                {adInfo(partner)}
              </span>
            </span>
          ) : null}
        </div>
      </div>
      {/* ниже lg — то же меню текстом вторым рядом, прокручивается вбок, если не влезает */}
      <div className="scrollbar-none -mt-2 overflow-x-auto px-2 pb-1.5 sm:px-3 lg:hidden">
        <NavLinks className="w-max" />
      </div>
    </HeaderShell>
  )
}
