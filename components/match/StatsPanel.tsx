'use client'

import { useState } from 'react'
import { GROUP_ORDER, GROUP_TITLE, MAIN_KEYS, STAT_HINT, shownAll, type StatPeriod, type StatRow } from '@/lib/sstats/stat-rows'
import { Hint } from './Hint'
import { XgTerm } from './Xg'
import { PctBars, SplitBar } from './SplitBar'
import { TeamLogo } from '../TeamLogo'

type Side = { name: string; logo?: string | null }
type Mode = 'main' | 'all'

/** Капсула-переключатель, как вкладки `Tabs small`; кнопки 36px — под палец. */
function Seg<K extends string>({ items, cur, pick, label }: { items: { key: K; label: string }[]; cur: K; pick: (k: K) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex w-full gap-1 rounded-full bg-white/[0.07] p-1 sm:w-auto">
      {items.map((t) => (
        <button
          key={t.key}
          type="button"
          aria-pressed={t.key === cur}
          onClick={() => pick(t.key)}
          className={`h-9 min-w-0 flex-auto truncate rounded-full px-3 text-[13px] font-semibold transition-colors sm:flex-none ${t.key === cur ? 'bg-fg text-ink' : 'text-dim hover:text-fg'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

/** «1,90», «−0,53», «56%»; нет значения — «—» (нулём не подменяем). */
function fmt(v: number | null, suffix?: string): string {
  if (v === null) return '—'
  const a = Math.abs(v)
  const s = Number.isInteger(a) ? String(a) : a.toFixed(2).replace('.', ',')
  return `${v < 0 ? '−' : ''}${s}${suffix ?? ''}`
}

function Label({ r }: { r: StatRow }) {
  // xG — «Ожидаемые голы xG ⓘ»: подпись — здесь (у сыгранных матчей в кэше лежит старая «Качество моментов»)
  if (r.key === 'expectedGoals')
    return (
      <>
        Ожидаемые голы <XgTerm />
      </>
    )
  const hint = STAT_HINT[r.key]
  return (
    <>
      {r.label}
      {hint ? <Hint title={r.label} text={hint} /> : null}
    </>
  )
}

function Row({ r, first }: { r: StatRow; first: boolean }) {
  const both = r.home !== null && r.away !== null
  const lead = (v: number | null, o: number | null) => both && !r.neutral && v! > o!
  const num = (v: number | null, o: number | null, right: boolean, detail: string | null | undefined) => (
    <span className={`num min-w-0 text-[16px] leading-snug ${right ? 'text-right' : ''} ${lead(v, o) ? 'font-bold text-fg' : lead(o, v) ? 'font-semibold text-dim' : 'font-semibold text-fg'}`}>
      {fmt(v, v === null ? undefined : r.suffix)}
      {detail ? <span className="block text-[13px] font-normal text-mute">{detail}</span> : null}
    </span>
  )
  const bar = !both ? (
    <div aria-hidden className="h-[5px] rounded-full bg-white/[0.06]" />
  ) : r.kind === 'pct' ? (
    <PctBars home={r.home} away={r.away} />
  ) : (
    <SplitBar home={r.home!} away={r.away!} />
  )
  return (
    <li className={`relative py-2 ${first ? '' : 'border-t border-edge'}`}>
      {/* боковые колонки одной ширины — подпись ровно по центру при любой длине чисел; длинная переносится */}
      <div className="grid grid-cols-[minmax(3.5rem,1fr)_minmax(0,auto)_minmax(3.5rem,1fr)] items-baseline gap-x-2 sm:gap-x-3">
        {num(r.home, r.away, false, r.detail?.home)}
        <span className="text-balance text-center text-[14px] leading-snug text-dim">
          <Label r={r} />
        </span>
        {num(r.away, r.home, true, r.detail?.away)}
      </div>
      {/* там, где больше — хуже (карточки, фолы, ошибки), — тише: лидера нет */}
      <div className={`mt-1.5 ${r.neutral ? 'opacity-60' : ''}`}>{bar}</div>
    </li>
  )
}

/**
 * Блок «Статистика» — как «Статистика команд» в Apple Sports: сверху эмблема и название хозяев слева, гостей справа;
 * строка — цифра хозяев слева, подпись по центру, гостей справа, под ней полоса цветами клубов (`SplitBar` — доли,
 * `PctBars` — проценты со своей шкалой 0–100 у каждой команды). У кого больше — белым жирным, у другого — серым; где
 * больше — хуже (`neutral`) и при равенстве — обе обычные.
 * Переключатели — период («Матч · 1-й тайм · 2-й тайм · Доп. время», если они есть в `/Ls/GameInfo`) и «Основные»
 * (шесть ключевых строк одним списком, `MAIN_KEYS`) / «Все показатели» (всё, что отдал SStats, по группам `GROUP_ORDER`).
 * Режим не сбрасывается при смене тайма и при обновлении идущего матча (`router.refresh` сохраняет состояние).
 */
export function StatsPanel({ periods, home, away }: { periods: StatPeriod[]; home: Side; away: Side }) {
  const [periodKey, setPeriod] = useState(periods[0]?.key)
  const [mode, setMode] = useState<Mode>('main')
  const period = periods.find((p) => p.key === periodKey) ?? periods[0]
  const rows = period?.rows ?? []
  const main = MAIN_KEYS.map((k) => rows.find((r) => r.key === k)).filter((r): r is StatRow => !!r)
  const all = rows.filter(shownAll)
  // в основных нечего показать или «все» ничего не добавляют — переключателя нет
  const canToggle = main.length > 0 && all.some((r) => !MAIN_KEYS.includes(r.key))
  const cur: Mode = main.length ? (canToggle ? mode : 'main') : 'all'

  const team = (t: Side, right: boolean) => (
    <span className={`flex min-w-0 items-center gap-2.5 ${right ? 'flex-row-reverse text-right' : ''}`}>
      <TeamLogo name={t.name} src={t.logo ?? null} size={28} />
      <span className="truncate text-[16px] font-semibold">{t.name}</span>
    </span>
  )
  const list = (items: StatRow[]) => <ul>{items.map((r, i) => <Row key={r.key} r={r} first={i === 0} />)}</ul>

  return (
    <div>
      {periods.length > 1 || canToggle ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          {periods.length > 1 ? <Seg label="Период" items={periods.map((p) => ({ key: p.key, label: p.label }))} cur={period.key} pick={setPeriod} /> : <span />}
          {canToggle ? (
            <Seg
              label="Показатели"
              items={[
                { key: 'main', label: 'Основные' },
                { key: 'all', label: 'Все показатели' },
              ]}
              cur={cur}
              pick={setMode}
            />
          ) : null}
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-4 border-b border-edge pb-3">
        {team(home, false)}
        {team(away, true)}
      </div>
      {!rows.length || (cur === 'all' ? !all.length : !main.length) ? (
        <p className="mt-4 text-[14px] text-dim">{periods.length > 1 ? 'За этот период статистики пока нет.' : 'Статистика появится по ходу матча.'}</p>
      ) : cur === 'main' ? (
        <div className="mt-1.5">{list(main)}</div>
      ) : (
        GROUP_ORDER.map((g) => {
          const items = all.filter((r) => r.group === g)
          return items.length ? (
            <section key={g} className="mt-4">
              <h3 className="text-[13px] font-semibold uppercase tracking-wide text-mute">{GROUP_TITLE[g]}</h3>
              <div className="mt-0.5">{list(items)}</div>
            </section>
          ) : null
        })
      )}
    </div>
  )
}
