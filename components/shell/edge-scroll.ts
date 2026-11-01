/**
 * Прокрутку боковой панели отмечаем атрибутом `data-scrolled` у самой прокрутки — по нему под закреплённым заголовком
 * (`.edge-top`) проявляется затухание (app/globals.css). Раньше — по шкале прокрутки (`animation-timeline: scroll()`), но в
 * Safari в левой панели (её прокрутка — flex-колонка) затухания не было, а в правой оно выглядело иначе (владелец: «в
 * левом блоке когда под заголовок заходят элементы там нет размытия а в правом есть»). Атрибут меняется только на
 * пороге — прямо в DOM, без состояния React: на ходу прокрутки панель не перерисовывается.
 * Колбэк-реф (React 19 — с функцией очистки): `<div ref={edgeScroll}>`.
 */
export function edgeScroll(el: HTMLElement | null): void | (() => void) {
  if (!el) return
  let on = false
  const check = () => {
    const next = el.scrollTop > 0
    if (next === on) return
    on = next
    if (on) el.setAttribute('data-scrolled', '')
    else el.removeAttribute('data-scrolled')
  }
  check()
  el.addEventListener('scroll', check, { passive: true })
  return () => el.removeEventListener('scroll', check)
}
