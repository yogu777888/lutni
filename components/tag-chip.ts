/** Классы «пилюль» тегов. Отдельный модуль без зависимостей — подключается и в клиентских компонентах. */
export type TagKind = 'accent' | 'hot' | 'neutral'

// без обводок: цвет только у «денежного» value и у прогрузов, остальные — нейтральные
const KIND: Record<TagKind, { chip: string; hash: string }> = {
  accent: { chip: 'bg-acid/[0.12] text-acid', hash: 'text-acid/55' },
  hot: { chip: 'bg-hot/[0.12] text-hot', hash: 'text-hot/55' },
  neutral: { chip: 'bg-white/[0.06] text-fg/85', hash: 'text-mute' },
}

const SIZE = {
  xs: 'h-5 px-1.5 text-[11px]',
  sm: 'h-6 px-2 text-[12px]',
  md: 'h-8 px-3 text-[13px]',
}

export type TagSize = keyof typeof SIZE

export function tagChipClass(kind: TagKind, size: TagSize = 'sm') {
  return `inline-flex items-center whitespace-nowrap rounded-full font-medium ${KIND[kind].chip} ${SIZE[size]}`
}

export const tagHashClass = (kind: TagKind) => KIND[kind].hash
