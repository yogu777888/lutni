import Link from 'next/link'
import { primaryPartner } from '@/config/bookmakers'
import { goHref } from '@/lib/affiliate'
import { CtaLink } from './CtaLink'
import { HeaderShell } from './HeaderShell'
import { LogoMark } from './Logo'
import { LiveTicker } from './LiveTicker'
import { NavCapsule, NavLinks } from './NavCapsule'

/**
 * Шапка: логотип, бегущая строка матчей (идущие — со счётом и минутой; нет идущих — ближайшие), меню текстом,
 * 18+ и «Бонус». Владелец счёл прежнюю шапку (меню-капсула по центру) «слишком дефолтной» — строка матчей сразу
 * говорит, что сайт про футбол прямо сейчас. Ниже lg меню — капсулой во втором ряду, строка — между логотипом и «Бонусом».
 */
export function Header() {
  const partner = primaryPartner()
  return (
    <HeaderShell>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-5 lg:gap-5">
        <Link href="/" aria-label="tag.bet — на главную" className="shrink-0 text-fg transition-opacity hover:opacity-85">
          <LogoMark size={26} />
        </Link>
        <LiveTicker className="min-w-0 flex-1" />
        <NavLinks className="hidden shrink-0 lg:flex" />
        <div className="flex shrink-0 items-center gap-3">
          <span className="rounded-[4px] border-[1.5px] border-dim/70 px-1 text-[11px] font-bold leading-[16px] text-dim" title="Только для совершеннолетних">
            18+
          </span>
          {partner ? (
            <CtaLink href={goHref(partner, 'header')} size="nav" className="px-5">
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
