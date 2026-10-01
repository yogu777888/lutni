import Link from 'next/link'
import { primaryPartner } from '@/config/bookmakers'
import { goHref } from '@/lib/affiliate'
import { CtaLink } from './CtaLink'
import { Logo } from './Logo'

const NAV = [
  { href: '/', label: 'Матчи' },
  { href: '/tags', label: 'Теги' },
  { href: '/tag/value', label: 'Value' },
  { href: '/leagues', label: 'Лиги' },
  { href: '/bookmakers', label: 'Букмекеры' },
]

export function Header() {
  const partner = primaryPartner()
  return (
    <header className="sticky top-0 z-40 border-b border-edge/80 bg-ink/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="shrink-0 text-fg" aria-label="tag.bet — на главную">
          <Logo size={26} />
        </Link>
        <nav aria-label="Основное меню" className="hidden items-center gap-5 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-[14px] text-dim transition-colors hover:text-fg">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[12px] font-medium text-mute" title="Только для совершеннолетних">
            18+
          </span>
          {partner ? (
            <CtaLink href={goHref(partner, 'header')} className="px-3.5 py-1.5 text-[13px]">
              Бонус
            </CtaLink>
          ) : null}
        </div>
      </div>
      <nav aria-label="Основное меню" className="scrollbar-none flex gap-5 overflow-x-auto px-4 pb-2.5 pt-0.5 md:hidden">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="shrink-0 text-[14px] text-dim transition-colors hover:text-fg">
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
