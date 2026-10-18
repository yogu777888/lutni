export function Section({
  title,
  id,
  aside,
  children,
  className = '',
  plain = false,
  outside = false,
  note,
}: {
  title?: React.ReactNode
  id?: string
  aside?: React.ReactNode
  children: React.ReactNode
  className?: string
  /** заголовок Onest без заглавных, как шапки блоков (`BlockHead`), — на текстовых страницах с `PageHead` */
  plain?: boolean
  /** заголовок над блоком, на фоне страницы, как разделы в Настройках iPhone (владелец: «как тебе идея заголовки вынести
   * из блоков как на айфоне?» — «давай», сначала страница матча): в блоке — только данные */
  outside?: boolean
  /** пояснение под блоком (с `outside`): мелко серым на фоне страницы, как подписи под группами в Настройках iPhone */
  note?: React.ReactNode
}) {
  if (outside)
    return (
      <section id={id} className="min-w-0 scroll-mt-28">
        {title ? <BlockTitle title={title} aside={aside} /> : null}
        <div className={`card p-5 sm:p-7 ${className}`}>{children}</div>
        {note ? <BlockNote>{note}</BlockNote> : null}
      </section>
    )
  return (
    // plain — отступы как у `PageHead`: текст разделов начинается с той же вертикали, что заголовок страницы
    <section id={id} className={`card ${plain ? 'px-4 py-5 sm:px-5' : 'p-5 sm:p-7'} ${className}`}>
      {title ? (
        // не влезают в строку (телефон) — подпись справа уходит под заголовок, а не сжимает его в две строки
        <div className={`${plain ? 'mb-3' : 'mb-5'} flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1`}>
          <h2 className={plain ? 'text-[20px] font-bold tracking-tight' : 'h2 text-[20px] font-bold tracking-[-0.02em] sm:text-[22px]'}>{title}</h2>
          {aside ? <div className="text-[13px] text-mute">{aside}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}

/** Заголовок раздела над блоком: Onest 20px жирным, подпись справа серым; отступ слева — как у содержимого блока. */
export function BlockTitle({ title, aside, className = '' }: { title: React.ReactNode; aside?: React.ReactNode; className?: string }) {
  return (
    <div className={`mb-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1 sm:px-2 ${className}`}>
      <h2 className="text-[20px] font-bold leading-tight tracking-[-0.01em]">{title}</h2>
      {aside ? <div className="text-[13px] text-mute">{aside}</div> : null}
    </div>
  )
}

/** Пояснение под блоком: 12px серым, с отступом слева, как у заголовка над блоком (`BlockTitle`). */
export function BlockNote({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`mt-2 px-1 text-[13px] leading-relaxed text-mute sm:px-2 ${className}`}>{children}</div>
}
