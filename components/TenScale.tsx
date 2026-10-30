/**
 * Шкала «58% ≈ 6 из 10» — 10 делений, последнее заполнено частично (владелец, из переписки с ChatGPT: «вероятность
 * показывать типа заполненные карточки… 58 процентов это 5.8 из 10» — словами округляем: «примерно 6 из 10»).
 * Не «карточки» — у нас так называются жёлтые и красные. Цвет — белый, как полосы на странице матча.
 */
export function TenScale({ p, className = '' }: { p: number; className?: string }) {
  const v = Math.min(1, Math.max(0, p)) * 10
  return (
    <div className={`flex h-1.5 gap-0.5 ${className}`} aria-hidden>
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className="h-full flex-1 overflow-hidden rounded-full bg-white/[0.09]">
          <div className="h-full bg-white/85" style={{ width: `${Math.round(Math.min(1, Math.max(0, v - i)) * 100)}%` }} />
        </div>
      ))}
    </div>
  )
}

/** «≈ 6 из 10»; у краёв — «меньше 1 из 10» / «больше 9 из 10»: «≈ 10 из 10» при 96% звучало бы обещанием. */
export function tenText(p: number): string {
  if (p < 0.05) return 'меньше 1 из 10'
  if (p >= 0.95) return 'больше 9 из 10'
  return `≈ ${Math.round(p * 10)} из 10`
}
