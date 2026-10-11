/**
 * Рамка центральной панели каркаса (от xl), как у Spotify: панель выглядит окном со скруглёнными углами сверху и
 * снизу при любой прокрутке. Страница по-прежнему прокручивается целиком (окно), а поверх неподвижно стоят полоски
 * цвета фона под шапкой и у нижнего края и четыре «уголка» — четверть круга цвета фона, вырезанная по радиусу
 * карточки. Колонки — как в app/layout.tsx: 8 + --shell-l + 8 слева, 8 + --shell-r + 8 справа.
 */
const BG = '#090c10'
const R = 20

function Corner({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const at = { tl: '100% 100%', tr: '0 100%', bl: '100% 0', br: '0 0' }[pos]
  return (
    <span
      className={`absolute h-5 w-5 ${pos[0] === 't' ? 'top-full' : 'bottom-full'} ${pos[1] === 'l' ? 'left-0' : 'right-0'}`}
      style={{ background: `radial-gradient(circle at ${at}, transparent ${R - 0.5}px, ${BG} ${R}px)` }}
    />
  )
}

export function ShellFrame() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-30 hidden xl:block">
      {/* сверху — под шапкой (64px), снизу — у края окна; по 8px цвета фона */}
      <div className="fixed left-[calc(var(--shell-l)+16px)] right-[calc(var(--shell-r)+16px)] top-16 h-2" style={{ background: BG }}>
        <Corner pos="tl" />
        <Corner pos="tr" />
      </div>
      <div className="fixed bottom-0 left-[calc(var(--shell-l)+16px)] right-[calc(var(--shell-r)+16px)] h-2" style={{ background: BG }}>
        <Corner pos="bl" />
        <Corner pos="br" />
      </div>
    </div>
  )
}
