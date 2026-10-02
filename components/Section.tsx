export function Section({
  title,
  id,
  aside,
  children,
  className = '',
}: {
  title?: React.ReactNode
  id?: string
  aside?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section id={id} className={`card p-5 sm:p-7 ${className}`}>
      {title ? (
        <div className="mb-5 flex items-baseline justify-between gap-3">
          <h2 className="text-[20px] font-bold tracking-[-0.02em] sm:text-[22px]">{title}</h2>
          {aside ? <div className="text-[12px] text-mute">{aside}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}
