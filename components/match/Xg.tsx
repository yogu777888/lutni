import { Hint } from './Hint'

/** Что такое xG — одним текстом везде: в «Главном», «Сильном и слабом месте», цифрах под табло и статистике. */
export const XG_HINT = 'Ожидаемые голы — сколько голов команда должна была забить по своим моментам. Например, xG\u00a02,10 — примерно два гола.'

/** Метка «xG» с объяснением по наведению и нажатию (владелец: «не всем понятно что такое xG»). */
export function XgTerm() {
  return <Hint term="xG" title="Что такое xG" text={XG_HINT} />
}

/** Текст, где первое «xG» — метка с объяснением (остальные — простым текстом: одной метки в строке хватает). */
export function XgText({ text }: { text: string }) {
  const i = text.indexOf('xG')
  if (i < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <XgTerm />
      {text.slice(i + 2)}
    </>
  )
}
