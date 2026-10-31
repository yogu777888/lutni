'use client'

import { useState } from 'react'
import { Icon } from '@/components/Icon'
import { FormStrip, type StripGame } from './FormStrip'
import { MirrorBars, mirrorWidths } from './SplitBar'
import { Seg } from './StatsPanel'
import { StatIcon } from './StatIcon'
import { TeamHead } from './TeamHead'

type Side = { id: number; name: string; logo?: string | null }

/** Группы «Всех показателей» статистики команд — по порядку. */
export type TeamStatGroup = 'results' | 'goals' | 'chances' | 'corners' | 'discipline'
const GROUP_TITLE: Record<TeamStatGroup, string> = {
  results: 'Результаты',
  goals: 'Голы',
  chances: 'Моменты',
  corners: 'Угловые',
  discipline: 'Дисциплина',
}
const GROUPS: TeamStatGroup[] = ['results', 'goals', 'chances', 'corners', 'discipline']

/**
 * Строка — готовые числа с сервера (`teamStatRows` в lib/team-stats.ts): `fmt` — как показать, `scale` — шкала полосы
 * («из 15», проценты — из 100; нет — от большего в строке), `better` — у кого лучше: больше, меньше или ни у кого.
 */
export type TeamStatRow = {
  key: string
  label: string
  group: TeamStatGroup
  main?: boolean
  h: number | null
  a: number | null
  fmt: 'dec' | 'pct' | 'int'
  scale?: number
  better: 'more' | 'less' | 'none'
}

const show = (v: number, f: TeamStatRow['fmt']) => (f === 'pct' ? `${Math.round(v * 100)}%` : f === 'int' ? String(Math.round(v)) : v.toFixed(1).replace('.', ','))

/**
 * Строка сравнения — тем же видом, что в «Статистике» матча: цифры 16px, у лучшего белым жирным, подпись 14px по
 * центру со значком темы, полоса `MirrorBars` — у кого лучше, цветом клуба.
 */
function Row({ r, first }: { r: TeamStatRow; first: boolean }) {
  const both = r.h != null && r.a != null
  const lead = (me: number | null, them: number | null) => r.better !== 'none' && both && me !== them && (r.better === 'less' ? me! < them! : me! > them!)
  const num = (v: number | null, o: number | null, right: boolean) => (
    <span className={`num min-w-0 text-[16px] leading-snug ${right ? 'text-right' : ''} ${v == null ? 'text-mute' : lead(v, o) ? 'font-bold text-fg' : lead(o, v) ? 'font-semibold text-dim' : 'font-semibold text-fg'}`}>
      {v == null ? '—' : show(v, r.fmt)}
    </span>
  )
  const tone = !both || r.h === r.a || r.better === 'none' ? null : lead(r.h, r.a) ? 'home' : 'away'
  const k = r.scale ? 100 / r.scale : 1
  return (
    <li className={`relative py-2 ${first ? '' : 'border-t border-edge'}`}>
      <div className="grid grid-cols-[minmax(3.5rem,1fr)_minmax(0,auto)_minmax(3.5rem,1fr)] items-baseline gap-x-2 sm:gap-x-3">
        {num(r.h, r.a, false)}
        <span className="text-balance text-center text-[14px] leading-snug text-dim">
          <StatIcon k={r.key} />
          {r.label}
        </span>
        {num(r.a, r.h, true)}
      </div>
      <div className="mt-2">
        <MirrorBars widths={both ? mirrorWidths(r.h! * k, r.a! * k, !!r.scale) : null} lead={tone} />
      </div>
    </li>
  )
}

/**
 * «Статистика команд» до матча — одним блоком, как «Статистика» идущего (владелец: «в предматчевой статистике сделаем
 * как в лайв матче основную стату и все показатели, а не будем на несколько блоков разбивать»): была «Форма команд» и
 * отдельно «Угловые и карточки». Сверху «Основные / Все показатели» (`Seg` из `StatsPanel`), шапка команд, строки
 * сравнения; во «Всех» — по группам со свёрткой; внизу — «Последние 5 матчей» значками В/Н/П.
 */
export function TeamStatsPanel({ home, away, rows, strip }: { home: Side; away: Side; rows: TeamStatRow[]; strip: { home: StripGame[] | null; away: StripGame[] | null } }) {
  const [mode, setMode] = useState<'main' | 'all'>('main')
  const [shut, setShut] = useState<Set<string>>(() => new Set())
  const flip = (g: string) => setShut((s) => { const n = new Set(s); if (n.has(g)) n.delete(g); else n.add(g); return n })
  const main = rows.filter((r) => r.main)
  const canToggle = main.length > 0 && rows.length > main.length
  const cur = main.length ? (canToggle ? mode : 'main') : 'all'
  const list = (items: TeamStatRow[]) => <ul>{items.map((r, i) => <Row key={r.key} r={r} first={i === 0} />)}</ul>
  return (
    <div>
      {canToggle ? (
        <div className="mb-5 flex justify-end">
          <Seg
            label="Показатели"
            items={[
              { key: 'main', label: 'Основные' },
              { key: 'all', label: 'Все показатели' },
            ]}
            cur={cur}
            pick={setMode}
          />
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-4 border-b border-edge pb-3">
        <TeamHead t={home} />
        <TeamHead t={away} right />
      </div>
      {cur === 'main' ? (
        <div className="mt-1.5">{list(main)}</div>
      ) : (
        GROUPS.map((g) => {
          const items = rows.filter((r) => r.group === g)
          return items.length ? (
            <section key={g} className="mt-4">
              <h3>
                <button type="button" aria-expanded={!shut.has(g)} onClick={() => flip(g)} className="flex w-full items-center justify-between py-1 text-[13px] font-semibold uppercase tracking-wide text-mute hover:text-fg">
                  {GROUP_TITLE[g]}
                  <Icon k="chevron-down" className={`size-4 transition-transform ${shut.has(g) ? '-rotate-90' : ''}`} />
                </button>
              </h3>
              {shut.has(g) ? null : <div className="mt-0.5">{list(items)}</div>}
            </section>
          ) : null
        })
      )}
      <FormStrip home={strip.home} away={strip.away} />
    </div>
  )
}
