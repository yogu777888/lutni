/**
 * Шапка блока-панели — как у блока лиги на главной («Ла Лига», «Сейчас в игре»): Onest 20px жирным (не `.h2` Oswald
 * заглавными), подпись справа; `line` — черта под шапкой, когда ниже идут строки списка. Для простых страниц
 * («Букмекеры», страница лиги), чтобы заголовки блоков были одного вида с главной.
 */
export function BlockHead({ title, aside = null, line = false }: { title: React.ReactNode; aside?: React.ReactNode; line?: boolean }) {
  return (
    <header className={`flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-4 py-4 sm:px-5 ${line ? 'border-b border-edge' : ''}`}>
      <h2 className="text-[20px] font-bold tracking-tight">{title}</h2>
      {aside ? <span className="text-[12px] text-mute">{aside}</span> : null}
    </header>
  )
}
