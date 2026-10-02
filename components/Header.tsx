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

const link =
  "relative px-3 py-1.5 text-[14px] text-dim transition-colors after:absolute after:inset-x-3 after:bottom-0.5 after:h-[1.5px] after:origin-left after:scale-x-0 after:bg-fg after:transition-transform after:duration-300 after:content-[''] hover:text-fg hover:after:scale-x-100"

export function Header() {
  const partner = primaryPartner()
  return (
    <header className="sticky top-0 z-40 border-b border-edge bg-ink/75 backdrop-blur-[14px]">
      <div className="mx-auto flex h-[60px] max-w-6xl items-center gap-6 px-5">
        <Link href="/" className="shrink-0 text-fg" aria-label="tag.bet — на главную">
          <Logo size={26} />
        </Link>
        <nav aria-label="Основное меню" className="hidden items-center md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={link}>
              {n.label}
            </Link>
          ))}
        </nav>
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
      <nav aria-label="Основное меню" className="scrollbar-none -mt-1 flex overflow-x-auto px-2 pb-2 md:hidden">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={`${link} shrink-0`}>
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
