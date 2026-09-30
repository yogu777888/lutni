import type { MatchEvent, StatPair } from '@/lib/types'

const ICON: Record<MatchEvent['kind'], string> = {
  goal: '⚽',
  'own-goal': '⚽',
  penalty: '⚽',
  'missed-penalty': '✕',
  yellow: '🟨',
  red: '🟥',
  sub: '⇄',
  var: 'VAR',
  other: '•',
}

const NOTE: Partial<Record<MatchEvent['kind'], string>> = {
  'own-goal': 'автогол',
  penalty: 'пенальти',
  'missed-penalty': 'незабитый пенальти',
}

export function EventsBlock({ events }: { events: MatchEvent[] }) {
  const shown = events.filter((e) => e.kind !== 'sub' && e.kind !== 'other')
  if (!shown.length) return <p className="text-sm text-dim">Событий пока нет.</p>
  return (
    <ul className="space-y-1.5">
      {shown.map((e, i) => (
        <li key={i} className={`flex items-center gap-2 text-[13px] ${e.side === 'away' ? 'flex-row-reverse text-right' : ''}`}>
          <span className="num w-10 shrink-0 text-center text-xs font-bold text-dim">
            {e.minute}
            {e.extra ? `+${e.extra}` : ''}′
          </span>
          <span className="w-6 shrink-0 text-center" aria-hidden>
            {ICON[e.kind]}
          </span>
          <span className="min-w-0">
            <span className="font-semibold">{e.player || '—'}</span>
            {e.assist && (e.kind === 'goal' || e.kind === 'penalty') ? <span className="text-dim"> ({e.assist})</span> : null}
            {NOTE[e.kind] ? <span className="text-dim"> · {NOTE[e.kind]}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function StatsBars({ stats }: { stats: StatPair[] }) {
  if (!stats.length) return <p className="text-sm text-dim">Статистика появится по ходу матча.</p>
  return (
    <ul className="space-y-3">
      {stats.map((s) => {
        const total = s.home + s.away || 1
        const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2))
        return (
          <li key={s.key}>
            <div className="mb-1 flex justify-between text-[13px]">
              <span className={`num font-bold ${s.home > s.away ? 'text-acid' : ''}`}>
                {fmt(s.home)}
                {s.suffix ?? ''}
              </span>
              <span className="text-xs text-dim">{s.label}</span>
              <span className={`num font-bold ${s.away > s.home ? 'text-sky-300' : ''}`}>
                {fmt(s.away)}
                {s.suffix ?? ''}
              </span>
            </div>
            <div className="flex h-1.5 gap-1">
              <div className="flex flex-1 justify-end overflow-hidden rounded-full bg-panel-3">
                <div className="h-full rounded-full bg-acid" style={{ width: `${(s.home / total) * 100}%` }} />
              </div>
              <div className="flex-1 overflow-hidden rounded-full bg-panel-3">
                <div className="h-full rounded-full bg-sky-400" style={{ width: `${(s.away / total) * 100}%` }} />
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
