const PALETTE = ['#2d6cdf', '#e0463e', '#16a34a', '#9333ea', '#ea8a0c', '#0891b2', '#db2777', '#65a30d', '#4f46e5', '#b45309']
const NOISE = /^(fc|cf|sc|ac|as|afc|fk|sv|vfl|vfb|tsg|ssc|ss|cd|ud|rc|ogc|1\.)$/i

export function initials(name: string): string {
  const words = name.replace(/[«»"'.]/g, ' ').split(/[\s-]+/).filter((w) => w && !NOISE.test(w))
  if (!words.length) return name.slice(0, 2).toUpperCase()
  return (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase()
}

export function colorFor(name: string): string {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return PALETTE[h % PALETTE.length]
}

/** Цветная монограмма вместо логотипа. */
export function Monogram({ name, size }: { name: string; size: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold text-white/95 ring-1 ring-white/10"
      style={{ width: size, height: size, background: colorFor(name), fontSize: Math.round(size * 0.38) }}
    >
      {initials(name)}
    </span>
  )
}
