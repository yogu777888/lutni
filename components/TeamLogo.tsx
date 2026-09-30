import { LogoImage } from './LogoImage'
import { Monogram } from './Monogram'

/** Логотип команды; если его нет или он не загрузился — цветная монограмма. */
export function TeamLogo({ name, src, size = 22 }: { name: string; src: string | null; size?: number }) {
  if (!src) return <Monogram name={name} size={size} />
  return <LogoImage name={name} src={src} size={size} />
}
