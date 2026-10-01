/** Классы «пилюль» тегов. Отдельный модуль без зависимостей — подключается и в клиентских компонентах. */
export type TagKind = 'accent' | 'hot' | 'neutral'

const KIND: Record<TagKind, { chip: string; hash: string }> = {
  accent: { chip: 'bg-acid text-acid-ink ring-acid', hash: 'text-acid-ink/55' },
  hot: { chip: 'bg-hot/12 text-hot ring-hot/35', hash: 'text-hot/70' },
  neutral: { chip: 'bg-panel-2 text-fg ring-edge-2', hash: 'text-acid' },
}

const SIZE = {
  xs: 'h-5 px-1.5 text-[11px]',
  sm: 'h-6 px-2 text-[12px]',
  md: 'h-8 px-3 text-[13px]',
}

export type TagSize = keyof typeof SIZE

export function tagChipClass(kind: TagKind, size: TagSize = 'sm') {
  return `inline-flex items-center whitespace-nowrap rounded-full font-semibold ring-1 ring-inset ${KIND[kind].chip} ${SIZE[size]}`
}

export const tagHashClass = (kind: TagKind) => KIND[kind].hash
