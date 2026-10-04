import { LogoImage } from './LogoImage'
import { Monogram } from './Monogram'

/** Логотип команды; если его нет или он не загрузился — монограмма. `size` — px или CSS-длина (`var(--logo)`). */
export function TeamLogo({ name, src, size = 22 }: { name: string; src: string | null; size?: number | string }) {
  if (!src) return <Monogram name={name} size={size} />
  return <LogoImage name={name} src={src} size={size} />
}
