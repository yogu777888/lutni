/**
 * Знак tag.bet: бирка-ценник с пробитым отверстием и решёткой.
 * «tag» — это и бирка, и тег; ценник намекает на «правильную цену» (value).
 * Вырезы рисуются цветом фона (ink), поэтому знак выглядит «пробитым».
 */
export function LogoMark({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="4 4 42 42" width={size} height={size} className={`shrink-0 ${className}`} aria-hidden>
      <path
        className="fill-acid"
        d="M6.2 21.4 16 11.6c.9-.9 2.1-1.4 3.3-1.4H40a5 5 0 0 1 5 5v17.6a5 5 0 0 1-5 5H19.3c-1.2 0-2.4-.5-3.3-1.4l-9.8-9.8a3.7 3.7 0 0 1 0-5.2Z"
      />
      <circle cx="14.2" cy="24" r="2.7" className="fill-ink" />
      <path
        className="stroke-ink"
        strokeWidth="3.3"
        strokeLinecap="round"
        fill="none"
        d="M28.6 16.2 26.4 31.8M35.8 16.2 33.6 31.8M23.4 20.6h15.2M22.6 27.4h15.2"
      />
    </svg>
  )
}

export function Logo({ className = '', size = 28 }: { className?: string; size?: number }) {
  return (
    <span className={`inline-flex items-center gap-2 font-extrabold tracking-[-0.035em] ${className}`}>
      <LogoMark size={size} />
      <span>
        tag<span className="font-bold text-dim">.bet</span>
      </span>
    </span>
  )
}
