import Link from 'next/link'
import { primaryPartner } from '@/config/bookmakers'
import { goHref } from '@/lib/affiliate'
import { CtaLink } from './CtaLink'
import { HeaderShell } from './HeaderShell'
import { Wordmark } from './Logo'
import { NavLinks } from './NavLinks'
import { Search } from './Search'

/**
 * Шапка одной спокойной строкой: надпись tag.bet и меню текстом слева, справа поиск, 18+ и «Бонус».
 * Бегущую строку матчей убрали — шапка была перегружена, а идущие матчи и так видны в «В игре» и «Главных матчах».
 * Ниже lg меню — тем же текстом во втором ряду.
 */
export function Header() {
  const partner = primaryPartner()
  return (
    <HeaderShell>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-5 lg:gap-5 xl:max-w-none xl:px-6">
        <Link href="/" aria-label="tag.bet — на главную" className="shrink-0 text-fg transition-opacity hover:opacity-80">
          {/* на 1,5px ниже середины: в рамку входит хвост «g», без сдвига тело букв стоит выше меню и кнопок */}
          <Wordmark size={26} className="translate-y-[1.5px]" />
        </Link>
        <NavLinks className="hidden shrink-0 lg:flex" />
        <span className="flex-1" />
        <div className="flex shrink-0 items-center gap-3">
          <Search />
          <span className="rounded-[4px] border-[1.5px] border-dim/70 px-1 text-[11px] font-bold leading-[16px] text-dim" title="Только для совершеннолетних">
            18+
          </span>
          {partner ? (
            <CtaLink href={goHref(partner, 'header')} size="sm" className="h-9 rounded-ctl px-4 text-[14px]">
              {/* с именем букмекера: «Бонус» без имени — реклама «неизвестно чего», а рекламодатель рядом с рекламой
                  нужен и по закону (владелец согласился); ниже xl (меню и поиск) места нет — только «Бонус» */}
              <span>
                Бонус<span className="hidden xl:inline"> в {partner.name}</span>
              </span>
            </CtaLink>
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
