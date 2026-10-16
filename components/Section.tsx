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
        // не влезают в строку (телефон) — подпись справа уходит под заголовок, а не сжимает его в две строки
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 className="h2 text-[20px] font-bold tracking-[-0.02em] sm:text-[22px]">{title}</h2>
          {aside ? <div className="text-[12px] text-mute">{aside}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}
