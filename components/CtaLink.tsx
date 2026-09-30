import { SPONSORED_REL } from '@/lib/affiliate'

type Variant = 'primary' | 'secondary' | 'ghost'

const STYLES: Record<Variant, string> = {
  primary: 'bg-acid text-acid-ink hover:brightness-110 shadow-[0_0_0_1px_rgb(200_255_46/0.4),0_8px_24px_-8px_rgb(200_255_46/0.5)]',
  secondary: 'bg-panel-3 text-fg ring-1 ring-inset ring-edge-2 hover:bg-edge-2',
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
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold transition active:scale-[0.98] ${STYLES[variant]} ${className}`}
    >
      {children}
    </a>
  )
}
