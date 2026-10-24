'use client'

import { useEffect, useRef, useState } from 'react'
import type { Res } from '@/lib/stats'

/**
 * Результат — цветом, как на табло у Flashscore и Sofascore (владелец: «наверное победы и поражения надо цветом
 * выделять?»): победа — зелёная, ничья — серая, поражение — красная, буква остаётся (цвет не единственный признак).
 * Вид один везде — кружок (владелец: «последние матчи в разном стиле»: в табло были квадратики, в «Форме» — кружки).
 * Ниже «яркостью, а не светофором» — история.
 */
const RES: Record<Res, { label: string; cls: string }> = {
  W: { label: 'В', cls: 'bg-win text-ink' },
  D: { label: 'Н', cls: 'bg-white/[0.22] text-fg' },
  L: { label: 'П', cls: 'bg-loss text-ink' },
}

export function ResBadge({ r, size = 'md' }: { r: Res; size?: 'md' | 'xs' }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold ${RES[r].cls} ${
        size === 'md' ? 'h-6 w-6 text-[12px]' : 'h-5 w-5 text-[11px]'
      }`}
      title={r === 'W' ? 'Победа' : r === 'D' ? 'Ничья' : 'Поражение'}
    >
      {RES[r].label}
    </span>
  )
}

export type StripGame = { id: number; date: string; opponent: string; score: string; home: boolean; result: Res }

/**
 * Подпись «Последние 5 матчей» по центру, под ней значки кружками 24px — хозяева от левого края, гости от правого
 * (владелец: «снизу какой то большой отступ и некрасиво выглядит статистика прошлых матчей»: квадратики 20px трёх
 * разных видов терялись, а под ними держали пустую строку под подсказку). Подсказка — всплывает над значками, места
 * не занимает. Ниже — история.
 * Строка «Последние 5» в «Форме команд»: значки В/Н/П обеих команд, свежий справа (владелец: «блок форма команд
 * длинный» — список из пяти матчей с переключателем команд был ~400px). Кто соперник и счёт — по наведению, нажатию
 * или фокусу: строкой под значками («01.10 · Вильярреал · 0:0 · дома»), `title` на телефоне не открывается.
 */
export function FormStrip({ home, away }: { home: StripGame[] | null; away: StripGame[] | null }) {
  const [act, setAct] = useState<StripGame | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!act) return
    const off = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setAct(null)
    }
    addEventListener('pointerdown', off)
    return () => removeEventListener('pointerdown', off)
  }, [act])
  const tip = (g: StripGame) => `${g.date} · ${g.opponent} · ${g.score} · ${g.home ? 'дома' : 'в гостях'}`
  const cell = (games: StripGame[] | null, right = false) => (
    <span className={`flex gap-1 ${right ? 'justify-end' : ''}`}>
      {games
        ? games.map((g) => (
            <button
              key={g.id}
              type="button"
              aria-label={tip(g)}
              onPointerEnter={(e) => e.pointerType === 'mouse' && setAct(g)}
              onPointerLeave={(e) => e.pointerType === 'mouse' && setAct(null)}
              onFocus={() => setAct(g)}
              onBlur={() => setAct(null)}
              onClick={() => setAct(g)}
              className={`rounded-full transition-opacity ${act && act.id !== g.id ? 'opacity-40' : ''}`}
            >
              <ResBadge r={g.result} size="md" />
            </button>
          ))
        : <span className="text-mute">—</span>}
    </span>
  )
  return (
    // одной строкой, как остальные строки блока: значки хозяев · подпись по центру · значки гостей (владелец: «в форме
    // команд они ниже текста посередине»); на телефоне три части не влезают — подпись строкой выше
    <div ref={ref} className="relative mt-1 grid grid-cols-2 items-center gap-x-3 gap-y-2.5 border-t border-edge pt-3 sm:grid-cols-[1fr_auto_1fr]">
      <p className="col-span-2 text-center text-[14px] text-dim sm:col-span-1 sm:col-start-2 sm:row-start-1">Последние 5 матчей</p>
      <span className="sm:col-start-1 sm:row-start-1">{cell(home)}</span>
      <span className="sm:col-start-3 sm:row-start-1">{cell(away, true)}</span>
      {act ? (
        <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 w-max max-w-full -translate-x-1/2 rounded-tile bg-panel-3 px-3 py-1.5 text-center text-[13px] text-fg shadow-lg">
          {tip(act)}
        </div>
      ) : null}
      <p aria-live="polite" className="sr-only">
        {act ? tip(act) : ''}
      </p>
    </div>
  )
}
