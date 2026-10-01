import { SPONSORED_REL } from '@/lib/affiliate'

/**
 * primary — лайм, главное действие экрана (одно на экран); light — белая кнопка для
 * остальных переходов к партнёрам; secondary — тихая серая; ghost — ссылка.
 */
type Variant = 'primary' | 'light' | 'secondary' | 'ghost'

const STYLES: Record<Variant, string> = {
  primary: 'bg-acid text-acid-ink hover:bg-[#d6ff5c]',
  light: 'bg-fg text-ink hover:bg-white',
  secondary: 'bg-white/[0.08] text-fg hover:bg-white/[0.13]',
  ghost: 'text-acid hover:underline underline-offset-4',
}

/** Партнёрская ссылка: всегда через /go, в новой вкладке, с rel=sponsored. */
export function CtaLink({
  href,
  children,
  variant = 'primary',
  className = '',
}: {
  href: string
  children: React.ReactNode
  variant?: Variant
  className?: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel={SPONSORED_REL}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] ${STYLES[variant]} ${className}`}
    >
      {children}
    </a>
  )
}
