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
    <section id={id} className={`card p-5 sm:p-6 ${className}`}>
      {title ? (
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-[17px] font-semibold">{title}</h2>
          {aside ? <div className="text-[12px] text-mute">{aside}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}
