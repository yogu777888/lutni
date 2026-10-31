/**
 * Чьи кэфы в строках списка (владелец прислал WhoScored: «добавить сортировку чтоб можно было бк выбирать чьи
 * коэффициенты смотришь или вообще вырубить?» — «да»). Главная и лиги — готовые страницы одни на всех: сервер кладёт
 * в строку линии всех партнёров (`data-bk` у каждой), а какую показать, решает CSS по `html[data-odds]`. Атрибут ставит
 * скрипт в <head> до отрисовки (без мигания), выбор — localStorage `tb-odds`: слаг партнёра или `off`.
 * Выбора нет — в строке первая линия по `PARTNERS` (`data-bk-first`), как было.
 */
import { PARTNERS } from '@/config/bookmakers'

export const ODDS_KEY = 'tb-odds'

const slugs = () => [...PARTNERS.map((p) => p.slug), 'off']

export const ODDS_SCRIPT = `try{var v=localStorage.getItem('${ODDS_KEY}');if(${JSON.stringify(slugs())}.indexOf(v)>=0)document.documentElement.setAttribute('data-odds',v)}catch(e){}`

export const ODDS_CSS = [
  'html:not([data-odds]) [data-bk]:not([data-bk-first]){display:none}',
  'html[data-odds=off] [data-bk],html[data-odds=off] [data-bk-plain]{display:none}',
  // «Без кэфов»: колонки под кэфы нет — счёт у правого края строки, как у Flashscore (владелец: «как то странно выглядит
  // когда нет счета» — счёт висел посередине пустой колонки 11,25rem, у не начавшихся справа зияла дыра)
  '@media(min-width:640px){html[data-odds=off] .odds-row{grid-template-columns:3rem minmax(0,1fr) auto}html[data-odds=off] .odds-score{justify-content:flex-end}}',
  ...PARTNERS.map((p) => `html[data-odds="${p.slug}"] [data-bk]:not([data-bk="${p.slug}"]){display:none}`),
].join('')
