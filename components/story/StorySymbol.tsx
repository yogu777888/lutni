/**
 * Символы историй — своя система вместо предметных значков (мяч, корона, кубок): абстрактные знаки на одной сетке
 * 24×24, линия 2.2px со скруглёнными концами, один акцентный цвет у категории. Цвет — только у знака; подложка
 * кружка светлая и одна для всех. Нет своего знака — решётка tag.bet.
 */
type Sym = { color: string; draw: React.ReactNode }

const LINE = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
const SOLID = { fill: 'currentColor' } as const
/** Числа («3+», «≤2») — тем же шрифтом, что весь сайт, плотно. */
const num = (t: string, size = 12.5) => (
  <text x="12" y="12" dominantBaseline="central" textAnchor="middle" fontSize={size} fontWeight={800} letterSpacing="-0.04em" fill="currentColor">
    {t}
  </text>
)

const SYMBOLS: Record<string, Sym> = {
  // В игре: точка и симметричные дуги сигнала
  live: {
    color: '#ff5c63',
    draw: (
      <>
        <circle cx="12" cy="12" r="2.3" {...SOLID} />
        <path d="M8.3 8.3a5.2 5.2 0 0 0 0 7.4M15.7 8.3a5.2 5.2 0 0 1 0 7.4M5.4 5.4a9.3 9.3 0 0 0 0 13.2M18.6 5.4a9.3 9.3 0 0 1 0 13.2" {...LINE} />
      </>
    ),
  },
  // Топ дня: строгая пятиконечная звезда
  top: {
    color: '#d5a33a',
    draw: <path d="M12 3.6l2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 16.5l-5.1 2.8 1.1-5.7-4.3-4 5.8-.7z" {...SOLID} />,
  },
  // Выгодно: знак процента — цена выше честной
  value: {
    color: '#2f9a5d',
    draw: (
      <>
        <path d="M17.5 6.5l-11 11" {...LINE} />
        <circle cx="8" cy="8" r="2.2" {...LINE} />
        <circle cx="16" cy="16" r="2.2" {...LINE} />
      </>
    ),
  },
  // Кэф упал: график вниз
  progruz: {
    color: '#2e8b7b',
    draw: <path d="M4 6.5l5.2 5.2 3.4-3.2L20 16M20 10.8V16h-5.2" {...LINE} strokeWidth={2.6} />,
  },
  // Много голов: «3+»
  'tb-2-5': { color: '#1e6fb8', draw: num('3+', 13) },
  // Мало голов: «≤2»
  'tm-2-5': { color: '#4f6478', draw: num('≤2', 12) },
  // Фаворит: перевес — высокий столбик против низкого
  favorit: {
    color: '#3558d6',
    draw: (
      <>
        <rect x="5.5" y="4.5" width="5.5" height="15" rx="1.6" {...SOLID} />
        <rect x="13.6" y="12.2" width="4.9" height="7.3" rx="1.4" {...LINE} strokeWidth={2} />
      </>
    ),
  },
  // 50 на 50: диск, разделённый пополам
  ravnye: {
    color: '#4a5a6a',
    draw: (
      <>
        <circle cx="12" cy="12" r="7.6" {...LINE} />
        <path d="M12 4.4a7.6 7.6 0 0 0 0 15.2z" {...SOLID} />
      </>
    ),
  },
  // Обе забьют: две точки, навстречу друг другу
  'obe-zabyut': {
    color: '#1e6fb8',
    draw: (
      <>
        <circle cx="6.5" cy="12" r="2.6" {...SOLID} />
        <circle cx="17.5" cy="12" r="2.6" {...SOLID} />
        <path d="M10.6 12h2.8" {...LINE} />
      </>
    ),
  },
  // Может удивить: излом
  andedog: { color: '#7a5af0', draw: <path d="M13.5 3.8L7 13h5l-1.5 7.2L17 11h-5z" {...LINE} /> },
  // Топ-матч: две концентрические окружности — в центре внимания
  'top-match': {
    color: '#d5a33a',
    draw: (
      <>
        <circle cx="12" cy="12" r="7.6" {...LINE} />
        <circle cx="12" cy="12" r="3" {...SOLID} />
      </>
    ),
  },
  // Серия: три растущих столбика
  seriya: {
    color: '#e07a2e',
    draw: <path d="M6 18v-3.5M12 18v-7M18 18V6.5" {...LINE} strokeWidth={2.8} />,
  },
  // Сильны дома: крыша и основание
  krepost: { color: '#1e6fb8', draw: <path d="M4.5 11.2L12 5l7.5 6.2M7 10v8.5h10V10" {...LINE} /> },
  // Травмы: крест
  kadry: { color: '#d94848', draw: <path d="M12 6v12M6 12h12" {...LINE} strokeWidth={2.8} /> },
  // Подборки: все матчи — расписание строками
  'pick-all': {
    color: '#1e6fb8',
    draw: (
      <>
        <circle cx="6" cy="7" r="1.5" {...SOLID} />
        <circle cx="6" cy="12" r="1.5" {...SOLID} />
        <circle cx="6" cy="17" r="1.5" {...SOLID} />
        <path d="M10 7h8.5M10 12h8.5M10 17h6" {...LINE} />
      </>
    ),
  },
  // Подборки: голевые матчи — ворота и мяч в них (сетка в 22px сливалась в таблицу)
  'pick-goals': {
    color: '#2f9a5d',
    draw: (
      <>
        <path d="M4 19V6.5h16V19" {...LINE} strokeWidth={2.6} />
        <circle cx="12" cy="14.5" r="2.9" {...SOLID} />
      </>
    ),
  },
  // Подборки: движение коэффициентов — стрелки вверх и вниз
  'pick-moves': {
    color: '#d98a1f',
    draw: <path d="M8 19V5M4.5 8.5L8 5l3.5 3.5M16 5v14M12.5 15.5L16 19l3.5-3.5" {...LINE} />,
  },
  // Личные встречи: стрелки навстречу
  h2h: { color: '#4f6478', draw: <path d="M3.5 12h6M7 8.7L10.2 12 7 15.3M20.5 12h-6M17 8.7L13.8 12l3.2 3.3" {...LINE} /> },
}

const FALLBACK: Sym = { color: '#4f6478', draw: <path d="M9.5 4.5l-2 15M16.5 4.5l-2 15M5 9h14.5M4.5 15H19" {...LINE} /> }

/** Заливка диска, как иконки Apple: цвет категории — светлее сверху, глубже снизу. */
export const discBackground = (c: string) =>
  `linear-gradient(165deg, color-mix(in oklab, ${c} 72%, white) 0%, ${c} 55%, color-mix(in oklab, ${c} 82%, black) 100%)`

export const symbolColor = (key: string) => (SYMBOLS[key] ?? FALLBACK).color

/** `tone` — цвет знака вместо акцентного (в кружке историй знак белый на заливке цветом категории). */
export function StorySymbol({ k, className = '', tone }: { k: string; className?: string; tone?: string }) {
  const s = SYMBOLS[k] ?? FALLBACK
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} style={{ color: tone ?? s.color }}>
      {s.draw}
    </svg>
  )
}
