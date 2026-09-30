const NOISE = /^(fc|cf|sc|ac|as|afc|fk|sv|vfl|vfb|tsg|ssc|ss|cd|ud|rc|ogc|1\.)$/i

export function initials(name: string): string {
  const words = name.replace(/[«»"'.]/g, ' ').split(/[\s-]+/).filter((w) => w && !NOISE.test(w))
  if (!words.length) return name.slice(0, 2).toUpperCase()
  return (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase()
}

function hue(name: string): number {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h % 360
}

/** Приглушённая монограмма вместо логотипа: разные команды различимы, но не пестрят. */
export function Monogram({ name, size }: { name: string; size: number }) {
  const h = hue(name)
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold ring-1 ring-inset ring-white/10"
      style={{
        width: size,
        height: size,
        background: `hsl(${h} 22% 20%)`,
        color: `hsl(${h} 45% 80%)`,
        fontSize: Math.max(8, Math.round(size * 0.36)),
        letterSpacing: '-0.02em',
      }}
    >
      {initials(name)}
    </span>
  )
}
