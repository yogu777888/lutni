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
    <header className="sticky top-0 z-40 border-b border-edge bg-ink/85 backdrop-blur-md supports-[backdrop-filter]:bg-ink/70">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="shrink-0 text-xl" aria-label="tag.bet — на главную">
          <Logo />
        </Link>
        <nav aria-label="Основное меню" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-dim transition hover:bg-panel-2 hover:text-fg">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <span className="rounded-md px-1.5 py-0.5 text-[11px] font-bold text-dim ring-1 ring-inset ring-edge-2" title="Только для совершеннолетних">
            18+
          </span>
          {partner ? (
            <CtaLink href={goHref(partner, 'header')} className="px-3 py-1.5 text-[13px]">
              Бонус
            </CtaLink>
          ) : null}
        </div>
      </div>
      <nav aria-label="Основное меню" className="scrollbar-none flex gap-1 overflow-x-auto border-t border-edge/60 px-3 py-1.5 md:hidden">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="shrink-0 rounded-lg px-3 py-1 text-[13px] font-semibold text-dim hover:text-fg">
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
