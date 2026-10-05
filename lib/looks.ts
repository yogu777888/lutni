/**
 * Вид виджетов сводки — пока владелец выбирает подачу: данные и тексты те же, меняются только графики и
 * поверхности карточек. Выбор хранится в cookie (`LOOK_COOKIE`), страница читает его на сервере — без мигания.
 * Переключатель (`components/LookSwitcher.tsx`) виден только в демо и при разработке.
 */
export const LOOKS = [
  { key: 'bars', label: 'Полосы' },
  { key: 'dots', label: 'Точки' },
  { key: 'digits', label: 'Цифры' },
  // «Афиша» — меняет только «Главные матчи»: градиент из цветов клубов, без статистики; подборки — как в «Полосах»
  { key: 'poster', label: 'Афиша' },
  // «Эмблемы» — та же «Афиша», но монохром: графит без цветов клубов, а за командами — их эмблемы крупным тиснением
  { key: 'crest', label: 'Эмблемы' },
] as const

export type Look = (typeof LOOKS)[number]['key']

export const LOOK_COOKIE = 'tb-look'

export const parseLook = (v: string | undefined): Look => (LOOKS.some((l) => l.key === v) ? (v as Look) : 'bars')

/** «Афиша» и «Эмблемы»: цвета клубов, табло по центру, кружки историй с эмблемами — всё общее. */
export const posterLike = (l: Look): boolean => l === 'poster' || l === 'crest'
