import Link from 'next/link'
import { primaryPartner } from '@/config/bookmakers'
import { goHref } from '@/lib/affiliate'
import { CtaLink } from './CtaLink'
import { HeaderShell } from './HeaderShell'
import { LogoMark } from './Logo'
import { LiveTicker } from './LiveTicker'
import { NavCapsule, NavLinks } from './NavCapsule'

/**
 * Шапка «островами», как у reg.ru (выбрал владелец): слева светлая плашка — логотип и меню, посередине тёмное
 * табло — бегущая строка матчей (идущие со счётом и минутой; нет идущих — ближайшие), справа светлая плашка —
 * 18+ и «Бонус». Плашки лежат на голубом фоне отдельными карточками, а не полосой во всю ширину. Плашки — `bg-panel-3`:
 * внутри них токены светлой поверхности (тёмный текст, голубая кнопка). Ниже lg меню — капсулой во втором ряду.
 */
const ISLAND = 'hdr-island bg-panel-2 flex h-12 shrink-0 items-center rounded-[16px] shadow-[0_8px_24px_rgb(8_40_80/0.16)]'

export function Header() {
  const partner = primaryPartner()
  return (
    <HeaderShell>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2.5 px-4 sm:px-5 lg:gap-3">
        <div className={`${ISLAND} gap-1 px-2.5 lg:pl-4 lg:pr-2`}>
          <Link href="/" aria-label="tag.bet — на главную" className="shrink-0 text-fg transition-opacity hover:opacity-80">
            <LogoMark size={26} />
          </Link>
          <NavLinks className="ml-3 hidden lg:flex" />
        </div>
        <LiveTicker className="h-12 min-w-0 flex-1 rounded-[16px]" />
        <div className={`${ISLAND} gap-2.5 pl-3 pr-1.5`}>
          <span className="rounded-[4px] border-[1.5px] border-dim/70 px-1 text-[11px] font-bold leading-[16px] text-dim" title="Только для совершеннолетних">
            18+
          </span>
          {partner ? (
            <CtaLink href={goHref(partner, 'header')} size="sm" className="h-9 rounded-[11px] px-4 text-[14px]">
              Бонус
            </CtaLink>
          ) : null}
        </div>
      </div>
      <div className="scrollbar-none -mt-1 overflow-x-auto px-4 pb-2.5 lg:hidden">
        <NavCapsule wide className="w-full min-w-max md:mx-auto md:w-auto md:min-w-0" />
      </div>
    </HeaderShell>
  )
}
