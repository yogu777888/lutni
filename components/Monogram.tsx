const NOISE = /^(fc|cf|sc|ac|as|afc|fk|sv|vfl|vfb|tsg|ssc|ss|cd|ud|rc|ogc|1\.)$/i

export function initials(name: string): string {
  const words = name.replace(/[«»"'.]/g, ' ').split(/[\s-]+/).filter((w) => w && !NOISE.test(w))
  if (!words.length) return name.slice(0, 2).toUpperCase()
  return (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase()
}

/** Монограмма вместо логотипа: одна спокойная графитовая плашка для всех команд — без пестроты. */
export function Monogram({ name, size }: { name: string; size: number | string }) {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 select-none items-center justify-center rounded-full bg-panel-3 font-semibold text-chalk ring-1 ring-inset ring-white/[0.06]"
      style={{
        width: size,
        height: size,
        // размер может быть и CSS-длиной (`var(--logo)`) — тогда буквы считает сам браузер
        fontSize: typeof size === 'number' ? Math.max(8, Math.round(size * 0.36)) : `calc(${size} * 0.36)`,
        letterSpacing: '-0.01em',
      }}
    >
      {initials(name)}
    </span>
  )
}
