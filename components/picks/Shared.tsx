import Link from 'next/link'
import { formatTime, pluralN } from '@/lib/format'
import { isLive } from '@/lib/rank'
import type { Match } from '@/lib/types'
import { DateTabs } from '../DateTabs'

/** Ссылка на ту же подборку с другим значением фильтра; значение по умолчанию из адреса убираем. */
export function withParam(base: string, params: Record<string, string | undefined>, key: string, value: string, def: string): string {
  const next = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v && k !== key) next.set(k, v)
  if (value !== def) next.set(key, value)
  const q = next.toString()
  return q ? `${base}?${q}` : base
}

/** Значение фильтра из адреса — только из списка допустимых, иначе по умолчанию. */
export const pickParam = <T extends string>(v: string | undefined, allowed: readonly T[], def: T): T => (allowed.includes(v as T) ? (v as T) : def)

export type FilterGroup = { label: string; options: { label: string; href: string; on: boolean }[] }

/** Фильтры подборки — обычными ссылками: работают без JS, у страницы один canonical. */
export function Filters({ groups }: { groups: FilterGroup[] }) {
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-3">
      {groups.map((g) => (
        <nav key={g.label} aria-label={g.label} className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="mr-1.5 text-[13px] text-mute">{g.label}</span>
          {g.options.map((o) => (
            <Link
              key={o.label}
              href={o.href}
              prefetch={false}
              scroll={false}
              aria-current={o.on ? 'true' : undefined}
              className={`inline-flex h-8 items-center rounded-[10px] px-3 text-[13px] font-medium transition-colors ${o.on ? 'bg-white/[0.1] text-fg' : 'text-dim hover:bg-white/[0.05] hover:text-fg'}`}
            >
              {o.label}
            </Link>
          ))}
        </nav>
      ))}
    </div>
  )
}

/** Шапка подборки: дата, заголовок, как считаем — и выбор дня (вкладки ведут на ту же подборку другого дня). */
export function PickHead({ ymd, today, date, title, children, section }: { ymd: string; today: string; date: string; title: string; children: React.ReactNode; section: string }) {
  return (
    <section className="min-w-0">
      <p className="text-[14px] font-medium text-dim">{date}</p>
      <h1 className="mt-1.5 text-[32px] font-bold leading-[1.08] tracking-[-0.03em] sm:text-[42px]">{title}</h1>
      <div className="mt-3 max-w-3xl space-y-2 text-[15px] leading-relaxed text-dim">{children}</div>
      <div className="mt-6">
        <DateTabs active={ymd} today={today} section={section} />
      </div>
    </section>
  )
}

/**
 * Сколько матчей дня в подборке учтено: у остальных нет линии одного букмекера — их нет, а не нули.
 * `pending` — топ-матчи, по которым линия ещё грузится.
 */
export function Coverage({ covered, total, pending, what }: { covered: number; total: number; pending: number; what: string }) {
  if (!total) return null
  return (
    <p className="text-[13px] leading-relaxed text-mute">
      {covered >= total
        ? `${what} есть у всех ${pluralN(total, ['матча', 'матчей', 'матчей'])} дня.`
        : `${what} есть у ${covered} из ${pluralN(total, ['матча', 'матчей', 'матчей'])} дня: линию легальных букмекеров разбираем сначала у топ-турниров, остальных матчей в подборке нет.`}
      {pending ? ` Ещё загружаем линию по ${pluralN(pending, ['матчу', 'матчам', 'матчам'])} — обновите страницу через минуту.` : ''}
    </p>
  )
}

/** Время или состояние матча для строки подборки: «21:00», «59′» красным, «итог 2:1», «перенесён». */
export function MatchWhen({ m }: { m: Match }) {
  if (isLive(m)) {
    const minute = m.statusCode === 4 ? 'перерыв' : m.elapsed ? `${m.elapsed}′` : 'идёт'
    return (
      <span className="flex flex-col">
        <span className="num text-[14px] font-semibold text-live">{minute}</span>
        {m.score ? <span className="num text-[13px] text-live">{`${m.score.home}:${m.score.away}`}</span> : null}
      </span>
    )
  }
  if (m.status === 'finished') {
    const s = m.scoreFT ?? m.score
    return (
      <span className="flex flex-col">
        <span className="text-[13px] text-mute">итог</span>
        {s ? <span className="num text-[14px] font-semibold text-fg">{`${s.home}:${s.away}`}</span> : null}
      </span>
    )
  }
  if (m.status === 'postponed' || m.status === 'cancelled') return <span className="text-[13px] text-mute">{m.status === 'postponed' ? 'перенесён' : 'отменён'}</span>
  return <span className="num text-[14px] font-semibold text-fg">{formatTime(m.ts)}</span>
}

/** Статус матча для фильтра «Матчи»: впереди, идут, сыграны. */
export type StageKey = 'all' | 'upcoming' | 'live' | 'finished'
export const STAGES: readonly StageKey[] = ['all', 'upcoming', 'live', 'finished']
export const STAGE_LABEL: Record<StageKey, string> = { all: 'Все', upcoming: 'Впереди', live: 'Идут', finished: 'Сыграны' }
export const stageOf = (m: Match): StageKey => (isLive(m) ? 'live' : m.status === 'finished' ? 'finished' : 'upcoming')
