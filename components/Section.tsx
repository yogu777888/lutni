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
    <section id={id} className={`card p-4 sm:p-5 ${className}`}>
      {title ? (
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-[16px] font-bold">{title}</h2>
          {aside ? <div className="text-xs text-dim">{aside}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}
