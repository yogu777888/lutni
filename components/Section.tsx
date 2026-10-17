export function Section({
  title,
  id,
  aside,
  children,
  className = '',
  plain = false,
}: {
  title?: React.ReactNode
  id?: string
  aside?: React.ReactNode
  children: React.ReactNode
  className?: string
  /** заголовок Onest без заглавных, как шапки блоков (`BlockHead`), — на текстовых страницах с `PageHead` */
  plain?: boolean
}) {
  return (
    // plain — отступы как у `PageHead`: текст разделов начинается с той же вертикали, что заголовок страницы
    <section id={id} className={`card ${plain ? 'px-4 py-5 sm:px-5' : 'p-5 sm:p-7'} ${className}`}>
      {title ? (
        // не влезают в строку (телефон) — подпись справа уходит под заголовок, а не сжимает его в две строки
        <div className={`${plain ? 'mb-3' : 'mb-5'} flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1`}>
          <h2 className={plain ? 'text-[20px] font-bold tracking-tight' : 'h2 text-[20px] font-bold tracking-[-0.02em] sm:text-[22px]'}>{title}</h2>
          {aside ? <div className="text-[12px] text-mute">{aside}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}
