'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export type PanelOption = { key: string; label: string }

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
 * «Своя подборка» на странице «Матчи»: что показывать (в игре / впереди / сыграны), турниры и теги —
 * «Показать матчи» перестраивает список с фильтром в адресе (lib/list-filter.ts); день и порядок — вкладками и переключателем над списком (порядок из адреса сохраняется).
 * Свёрнута одной строкой, пока фильтр не настроен. Фильтр подхватывается из адреса.
 */
export function MatchFilter({ day, today, leagues, tags }: { day: string; today: string; leagues: PanelOption[]; tags: PanelOption[] }) {
  const router = useRouter()
  const path = usePathname()
  const [st, setSt] = useState('')
  const [lg, setLg] = useState<string[]>([])
  const [tg, setTg] = useState<string[]>([])
  const [sort, setSort] = useState<'league' | 'time'>('league')
  const [open, setOpen] = useState(false)

  // подхватить фильтр из адреса (после «Показать матчи» и при открытии по ссылке)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const next = { st: q.get('st') ?? '', lg: (q.get('lg') ?? '').split(',').filter(Boolean), tg: (q.get('tag') ?? '').split(',').filter(Boolean) }
    setSt(next.st)
    setLg(next.lg)
    setTg(next.tg)
    setSort(q.get('sort') === 'time' ? 'time' : 'league')
    setOpen(Boolean(next.st || next.lg.length || next.tg.length))
  }, [path])

  const flip = (list: string[], set: (v: string[]) => void, k: string) => set(list.includes(k) ? list.filter((x) => x !== k) : [...list, k])
  const touched = Boolean(st || lg.length || tg.length)
  const base = day === today ? '/matches' : `/matches/${day}/all`

  const show = () => {
    const q = new URLSearchParams()
    if (sort === 'time') q.set('sort', 'time')
    if (st) q.set('st', st)
    if (lg.length) q.set('lg', lg.join(','))
    if (tg.length) q.set('tag', tg.join(','))
    const qs = q.toString().replace(/%2C/g, ',')
    router.push(`${base}${qs ? `?${qs}` : ''}`)
  }
  const reset = () => {
    setSt('')
    setLg([])
    setTg([])
    router.push(sort === 'time' ? `${base}?sort=time` : base)
  }

  return (
    // открыта, когда подборка уже настроена; иначе — одна строка, чтобы не отодвигать список
    <details key={String(open)} open={open} className="card group mt-5 overflow-hidden">
      <summary className="flex cursor-pointer items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.02]">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-dim" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
        <span className="text-[15px] font-semibold">Своя подборка</span>
        <span className="text-[13px] text-mute">статус, турниры, теги</span>
        {touched ? (
          <button type="button" onClick={(e) => (e.preventDefault(), reset())} className="ml-auto text-[13px] font-medium text-dim hover:text-fg">
            Сбросить
          </button>
        ) : null}
        <span className={`text-mute transition group-open:rotate-180 ${touched ? '' : 'ml-auto'}`}>▾</span>
      </summary>
      <div className="border-t border-edge px-5 pb-5">
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
        <button
          type="button"
          onClick={show}
          className="mt-5 h-10 rounded-ctl bg-white px-5 text-[14px] font-semibold text-ink transition-colors hover:bg-white/85"
        >
          Показать матчи
        </button>
      </div>
    </details>
  )
}
