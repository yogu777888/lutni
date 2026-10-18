'use client'

import { useEffect, useRef, useState } from 'react'
import type { Res } from '@/lib/stats'

/**
 * Результат — яркостью, а не светофором (владелец: «а форма команд как?»): зелёная «В» и красная «П» спорили с красным
 * «идёт» и с правилом «светофор не используем»; как в статистике матча — чем лучше, тем ярче.
 */
const RES: Record<Res, { label: string; cls: string }> = {
  W: { label: 'В', cls: 'bg-white/85 text-ink' },
  D: { label: 'Н', cls: 'bg-white/[0.16] text-fg/80' },
  L: { label: 'П', cls: 'text-mute ring-1 ring-inset ring-white/15' },
}

export function ResBadge({ r, size = 'sm' }: { r: Res; size?: 'sm' | 'xs' }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-[6px] font-semibold ${RES[r].cls} ${
        size === 'sm' ? 'h-6 w-6 text-[11px]' : 'h-5 w-5 text-[10px]'
      }`}
      title={r === 'W' ? 'Победа' : r === 'D' ? 'Ничья' : 'Поражение'}
    >
      {RES[r].label}
    </span>
  )
}

export type StripGame = { id: number; date: string; opponent: string; score: string; home: boolean; result: Res }

/**
 * Строка «Последние 5» в «Форме команд»: значки В/Н/П обеих команд, свежий справа (владелец: «блок форма команд
 * длинный» — список из пяти матчей с переключателем команд был ~400px). Кто соперник и счёт — по наведению, нажатию
 * или фокусу: строкой под значками («01.10 · Вильярреал · 0:0 · дома»), `title` на телефоне не открывается.
 */
export function FormStrip({ grid, home, away }: { grid: string; home: StripGame[] | null; away: StripGame[] | null }) {
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
  const cell = (games: StripGame[] | null) => (
    <span className="flex justify-center gap-0.5">
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
              className={`rounded-[6px] transition-opacity ${act && act.id !== g.id ? 'opacity-50' : ''}`}
            >
              <ResBadge r={g.result} size="xs" />
            </button>
          ))
        : <span className="text-mute">—</span>}
    </span>
  )
  return (
    <div ref={ref} className="border-t border-edge">
      <div className={`${grid} min-h-11 py-1`}>
        <span className="text-[14px] text-dim">Последние матчи</span>
        {cell(home)}
        {cell(away)}
      </div>
      <p aria-live="polite" className={`pb-1 text-right text-[13px] text-dim ${act ? '' : 'invisible'}`}>
        {act ? tip(act) : '·'}
      </p>
    </div>
  )
}
