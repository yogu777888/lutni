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
 * Шапка одной спокойной строкой: надпись tag.bet и меню текстом слева, справа поиск и «Бонус» с пометкой «Реклама · 18+»
 * внутри (ниже lg — «Бонус», потом лупа у края).
 * Бегущую строку матчей убрали — шапка была перегружена, а идущие матчи и так видны в «В игре» и «Главных матчах».
 * Ниже lg меню — внизу экрана (`TabBar`), шапка — в один ряд (был второй ряд с меню текстом, ~44px первого экрана).
 */
export function Header() {
  const partner = primaryPartner()
  return (
    <HeaderShell>
      {/* от xl под шапкой — полоска фона 8px до панелей: по центру ряда сверху было 12px, а до панелей — 20 (владелец: «у
          хедера сверху сейчас отступ меньше чем снизу?»); ряд опущен на 8px — по 16 сверху и снизу */}
      <div className="mx-auto flex h-[52px] max-w-6xl lg:h-14 xl:h-12 items-center gap-3 px-4 sm:px-5 lg:gap-5 xl:max-w-none xl:px-6 xl:pt-2">
        <Link href="/" aria-label="tag.bet — на главную" className="hdr-logo shrink-0 text-fg transition-[opacity,margin] hover:opacity-80">
          {/* на 3px ниже середины рамки: в рамку входит хвост «g» — без сдвига надпись стояла выше меню и кнопок. Глаз
              ровняет по высоким буквам «t», «b» и строке, а не по «a», «e»: середина «верх t — строка» = середина
              заглавных в меню (сдвиг 1,5px по середине «a», «e» владелец ещё видел выше) */}
          {/* ниже lg — шапка 52px и надпись 22px (владелец: «хедер с нижним его отростком … неказистый и не большеватый ли он?») */}
          <Wordmark size={22} className="translate-y-[2px] lg:hidden" />
          <Wordmark size={26} className="hidden translate-y-[3px] lg:block" />
        </Link>
        <NavLinks className="hidden shrink-0 lg:flex" />
        <span className="flex-1" />
        <div className="flex shrink-0 items-center gap-2.5 lg:gap-4">
          <Search />
          {partner ? (
            // пометка «Реклама · 18+» — внутри кнопки второй строкой (владелец: «не нравится, как выглядит кнопка бонуса
            // с подписью» — снаружи серый текст, рамка 18+ и кнопка были тремя разными элементами): видимая пометка в самой
            // рекламе (ст. 18.1), erid — в ссылке; рекламодатель и erid — подсказкой при наведении (на компьютере) и строкой
            // «Реклама: …» в подвале (на телефоне). Формат сверить с ОРД партнёрки.
            // ниже lg «Бонуса» нет (владелец: «а может вообще ее убрать так как у меня на странице матча появляется снизу
            // попап?» — «да»): шапка — надпись и лупа; к букмекеру на телефоне ведут кэфы в строках, «Выгодно сегодня»,
            // «Где ставить», на матче — нижняя плашка и кнопка в «Прогнозе»; на компьютере попапа нет — кнопка осталась
            <span className="group/ad relative hidden lg:flex">
              <CtaLink
                href={goHref(partner, 'header')}
                size="sm"
                className="cta-shine !h-10 !gap-0 flex-col rounded-ctl px-4 leading-none"
                describedBy="hdr-ad"
              >
                {/* с именем букмекера от xl: «Бонус» без имени — реклама «неизвестно чего»; ниже xl места нет */}
                <span className="text-[14px]">
                  Бонус<span className="hidden xl:inline"> в {partner.name}</span>
                </span>
                <span className="mt-[3px] text-[10px] font-semibold opacity-70">Реклама · 18+</span>
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
    </HeaderShell>
  )
}
