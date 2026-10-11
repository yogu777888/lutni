/** Метка-факт над эмблемой команды (lib/hand-notes.ts): «Лидер», «3 поражения подряд». На главной и на странице матча. */

/** Хороший факт для команды или плохой — по словам приписки (lib/hand-notes.ts): цвет точки в метке. */
const noteTone = (t: string) => (/поражен|без побед|вылет/.test(t) ? 'bg-live' : 'bg-acid')

/**
 * Метка-факт над эмблемой: небольшой чип обычным шрифтом, тихий текст и цветная точка (лайм — хороший факт,
 * красная — плохой). Рукописные красные приписки на графите владелец счёл некрасивыми — читались как ошибка.
 * Поверх, по центру над кругом — высоту табло не меняет.
 */
export function HandNote({ text, short }: { text: string; short: boolean }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-white/[0.06] px-2.5 py-1 text-[12.5px] font-medium leading-none text-dim shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)] backdrop-blur-sm lg:text-[13px] ${short ? 'flex' : 'hidden sm:flex'}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${noteTone(text)}`} />
      {text.charAt(0).toUpperCase() + text.slice(1)}
    </span>
  )
}
