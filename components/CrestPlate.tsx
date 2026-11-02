import { PLATE, ShadowCrest } from './LeagueMark'
import { Monogram } from './Monogram'

/**
 * Эмблема клуба на светлой подложке `PLATE` с длинной тенью вниз вправо — как в кругах историй (владелец: «а почему без
 * тени?»). Для кругов вне историй: «Избранное» в левой панели, матчи раскрытой подборки справа. Нет эмблемы — монограмма
 * во весь круг. `size` — диаметр, эмблема — 62% круга (`crest`; в паре по диагонали — 72%, круги мелкие); `className` — обводка и прочее от места; `shape` — форма (по умолчанию круг, у значков исходов — скруглённый квадрат).
 */
export function CrestPlate({ name, logo, size, crest = 0.62, shape = 'rounded-full', className = '' }: { name: string; logo: string | null | undefined; size: number; crest?: number; shape?: string; className?: string }) {
  if (!logo) return <span className={`inline-flex shrink-0 overflow-hidden ${shape} ${className}`}><Monogram name={name} size={size} /></span>
  const c = Math.round(size * crest)
  return (
    <span aria-hidden className={`grid shrink-0 grid-cols-1 grid-rows-1 place-items-center overflow-hidden ${shape} ${className}`} style={{ width: size, height: size, background: PLATE }}>
      <ShadowCrest src={logo} style={{ width: c, height: c }} />
    </span>
  )
}
