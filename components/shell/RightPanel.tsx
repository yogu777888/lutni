'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PanelToggle } from './PanelToggle'

export type PanelOption = { key: string; label: string }
type Day = { ymd: string; label: string }

const STATUS: PanelOption[] = [
  { key: '', label: 'Все' },
  { key: 'live', label: 'В игре' },
  { key: 'ahead', label: 'Впереди' },
  { key: 'done', label: 'Сыграны' },
]

/** Чип выбора: выбранный — светлый, остальные — тихие. */
function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`h-8 rounded-ctl px-3 text-[13px] font-medium transition-colors ${on ? 'bg-white text-ink' : 'bg-white/[0.06] text-dim hover:bg-white/[0.1] hover:text-fg'}`}
    >
      {children}
    </button>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="mt-5 first:mt-3">
      <legend className="mb-2 text-[12px] font-medium text-mute">{title}</legend>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  )
}

/**
 * Правая панель каркаса (от xl) — служебная: «Своя подборка». День, что показывать (в игре / впереди / сыграны),
 * турниры, теги и порядок — кнопка «Показать матчи» открывает страницу «Матчи» с этим фильтром в адресе
 * (lib/list-filter.ts). На странице «Матчи» панель подхватывает текущий фильтр из адреса.
 */
export function RightPanel({ days, leagues, tags }: { days: Day[]; leagues: PanelOption[]; tags: PanelOption[] }) {
  const router = useRouter()
  const path = usePathname()
  const today = days.find((d) => d.label === 'Сегодня')?.ymd ?? days[0].ymd
  const [day, setDay] = useState(today)
  const [st, setSt] = useState('')
  const [lg, setLg] = useState<string[]>([])
  const [tg, setTg] = useState<string[]>([])
  const [sort, setSort] = useState<'league' | 'time'>('league')

  // на странице «Матчи» — подхватить фильтр из адреса
  useEffect(() => {
    if (!path.startsWith('/matches')) return
    const q = new URLSearchParams(window.location.search)
    const m = /^\/matches\/(\d{4}-\d{2}-\d{2})\/all/.exec(path)
    setDay(m ? m[1] : today)
    setSt(q.get('st') ?? '')
    setLg((q.get('lg') ?? '').split(',').filter(Boolean))
    setTg((q.get('tag') ?? '').split(',').filter(Boolean))
    setSort(q.get('sort') === 'time' ? 'time' : 'league')
  }, [path, today])

  const flip = (list: string[], set: (v: string[]) => void, k: string) => set(list.includes(k) ? list.filter((x) => x !== k) : [...list, k])
  const touched = Boolean(st || lg.length || tg.length || sort !== 'league' || day !== today)

  const show = () => {
    const q = new URLSearchParams()
    if (sort === 'time') q.set('sort', 'time')
    if (st) q.set('st', st)
    if (lg.length) q.set('lg', lg.join(','))
    if (tg.length) q.set('tag', tg.join(','))
    const qs = q.toString().replace(/%2C/g, ',')
    router.push(`${day === today ? '/matches' : `/matches/${day}/all`}${qs ? `?${qs}` : ''}`)
  }
  const reset = () => {
    setDay(today)
    setSt('')
    setLg([])
    setTg([])
    setSort('league')
  }

  return (
    <div className="h-full rounded-card bg-panel">
      {/* свёрнута — полоска: кнопка «развернуть» и значок фильтра (лаймовая точка — подборка настроена) */}
      <div className="shell-r-rail h-full flex-col items-center gap-2 py-3">
        <PanelToggle side="r" open={false} />
        <span className="relative grid h-10 w-10 place-items-center rounded-full bg-white/[0.06] text-dim" title="Своя подборка">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          {touched ? <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-acid ring-2 ring-panel" /> : null}
        </span>
      </div>
      <div className="shell-r-full flex h-full flex-col overflow-hidden">
        <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto p-4">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold">
            <PanelToggle side="r" open />
            Своя подборка
            {touched ? (
              <button type="button" onClick={reset} className="ml-auto text-[12.5px] font-medium text-dim hover:text-fg">
                Сбросить
              </button>
            ) : null}
          </h2>
          <p className="mt-1 text-[12.5px] leading-snug text-mute">Соберите список матчей под себя</p>

          <Group title="День">
            {days.map((d) => (
              <Chip key={d.ymd} on={day === d.ymd} onClick={() => setDay(d.ymd)}>
                {d.label}
              </Chip>
            ))}
          </Group>
          <Group title="Матчи">
            {STATUS.map((s) => (
              <Chip key={s.key || 'all'} on={st === s.key} onClick={() => setSt(s.key)}>
                {s.label}
              </Chip>
            ))}
          </Group>
          <Group title="Турниры">
            {leagues.map((l) => (
              <Chip key={l.key} on={lg.includes(l.key)} onClick={() => flip(lg, setLg, l.key)}>
                {l.label}
              </Chip>
            ))}
          </Group>
          <Group title="Теги">
            {tags.map((t) => (
              <Chip key={t.key} on={tg.includes(t.key)} onClick={() => flip(tg, setTg, t.key)}>
                {t.label}
              </Chip>
            ))}
          </Group>
          <Group title="Порядок">
            <Chip on={sort === 'league'} onClick={() => setSort('league')}>
              По турнирам
            </Chip>
            <Chip on={sort === 'time'} onClick={() => setSort('time')}>
              По времени
            </Chip>
          </Group>
        </div>
        {/* кнопка — внизу панели, вне прокрутки: всегда под рукой и ничего не закрывает */}
        <div className="border-t border-edge p-4">
          <button
            type="button"
            onClick={show}
            className="h-11 w-full rounded-ctl bg-white text-[15px] font-semibold text-ink transition-colors hover:bg-white/85"
          >
            Показать матчи
          </button>
        </div>
      </div>
    </div>
  )
}
