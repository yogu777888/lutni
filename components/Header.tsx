import Link from 'next/link'
import { primaryPartner } from '@/config/bookmakers'
import { goHref } from '@/lib/affiliate'
import { CtaLink } from './CtaLink'
import { HeaderShell } from './HeaderShell'
import { Logo } from './Logo'
import { NavCapsule } from './NavCapsule'

/** Три островка: логотип без подложки, меню-капсула по центру, справа 18+ и «Бонус». */
export function Header() {
  const partner = primaryPartner()
  return (
    <HeaderShell>
      <div className="relative mx-auto flex h-16 max-w-6xl items-center gap-4 px-5">
        <Link href="/" className="shrink-0 text-fg" aria-label="tag.bet — на главную">
          <Logo size={26} />
        </Link>
        <NavCapsule className="absolute left-1/2 hidden -translate-x-1/2 md:flex" />
        <div className="ml-auto flex items-center gap-3">
          <span className="rounded-[4px] border-[1.5px] border-dim/70 px-1 text-[11px] font-bold leading-[16px] text-dim" title="Только для совершеннолетних">
            18+
          </span>
          {partner ? (
            <CtaLink href={goHref(partner, 'header')} size="sm" className="px-4">
              Бонус
            </CtaLink>
          ) : null}
        </div>
      </div>
      <div className="scrollbar-none -mt-1 overflow-x-auto px-4 pb-2.5 md:hidden">
        <NavCapsule wide className="w-full min-w-max" />
      </div>
    </HeaderShell>
  )
}
