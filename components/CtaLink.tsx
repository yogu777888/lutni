import { SPONSORED_REL } from '@/lib/affiliate'

/**
 * primary — тёплый белый (как текст), главное действие экрана: лайм у нас — «выгодно», логотип и кольца новых историй;
 * ghost — тонкая обводка; light — то же, что primary;
 * link — текстовая ссылка с лаймовым подчёркиванием-маркером.
 */
type Variant = 'primary' | 'ghost' | 'light' | 'link' | 'secondary'

const STYLES: Record<Variant, string> = {
  primary: 'rounded-full bg-fg px-5 text-ink hover:-translate-y-px hover:bg-white active:scale-[0.97]',
  ghost: 'rounded-full border border-edge-2 px-5 text-fg hover:-translate-y-px hover:bg-white/[0.04] active:scale-[0.97]',
  secondary: 'rounded-full border border-edge-2 px-5 text-fg hover:-translate-y-px hover:bg-white/[0.04] active:scale-[0.97]',
  light: 'rounded-full bg-fg px-5 text-ink hover:-translate-y-px hover:bg-white active:scale-[0.97]',
  link: 'border-b-2 border-acid pb-0.5 text-fg hover:text-acid',
}

/** Партнёрская ссылка: всегда через /go, в новой вкладке, с rel=sponsored. */
export function CtaLink({
  href,
  children,
  variant = 'primary',
  size = 'md',
  className = '',
}: {
  href: string
  children: React.ReactNode
  variant?: Variant
  size?: 'sm' | 'nav' | 'md' | 'lg'
  className?: string
}) {
  const sizes = { sm: 'h-[34px] text-[13px]', nav: 'h-[42px] text-[14px]', md: 'h-11 text-[15px]', lg: 'h-12 text-[16px]' }
  const box = variant === 'link' ? '' : sizes[size]
  return (
    <a
      href={href}
      target="_blank"
      rel={SPONSORED_REL}
      className={`inline-flex items-center justify-center gap-1.5 font-semibold transition duration-300 ${box} ${STYLES[variant]} ${className}`}
    >
      {children}
    </a>
  )
}
