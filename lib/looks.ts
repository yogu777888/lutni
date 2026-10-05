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
] as const

export type Look = (typeof LOOKS)[number]['key']

export const LOOK_COOKIE = 'tb-look'

export const parseLook = (v: string | undefined): Look => (LOOKS.some((l) => l.key === v) ? (v as Look) : 'bars')
