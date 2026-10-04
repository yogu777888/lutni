import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Section } from '@/components/Section'
import { PARTNERS } from '@/config/bookmakers'
import { isAdmin } from '@/lib/admin'
import { resolveAffiliateUrl } from '@/lib/affiliate'
import { cache } from '@/lib/cache'
import { aggregateClicks, readClicks } from '@/lib/clicks'
import { formatDateShort, formatTime } from '@/lib/format'
import { IS_MOCK, limiter } from '@/lib/sstats/client'
import { warmerState } from '@/lib/warmer'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Админка', robots: { index: false, follow: false } }

type Props = { searchParams: Promise<{ token?: string; days?: string }> }

function Table({ rows, head }: { rows: [string, number][]; head: [string, string] }) {
  const total = rows.reduce((s, r) => s + r[1], 0) || 1
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[11px] uppercase tracking-wide text-mute">
          <th className="py-1">{head[0]}</th>
          <th className="py-1 text-right">{head[1]}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k} className="border-t border-edge/70">
            <td className="py-1.5">{k}</td>
            <td className="num py-1.5 text-right font-bold">
              {v} <span className="text-xs font-normal text-dim">({Math.round((v / total) * 100)}%)</span>
            </td>
          </tr>
        ))}
        {!rows.length ? (
          <tr>
            <td className="py-2 text-dim" colSpan={2}>
              Пока пусто
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  )
}

export default async function AdminPage({ searchParams }: Props) {
  const { token, days: daysRaw } = await searchParams
  if (!isAdmin(token)) notFound()
  const days = Math.min(90, Math.max(1, Number(daysRaw) || 7))
  const clicks = await readClicks(Date.now() - days * 86_400_000)
  const agg = aggregateClicks(clicks)
  const lim = limiter.stats()
  const q = (d: number) => `/admin?token=${encodeURIComponent(token!)}&days=${d}`

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold">Админка tag.bet</h1>
      <div className="grid gap-5 md:grid-cols-2">
        <Section title="Источник данных">
          <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
            <dt className="text-dim">Режим</dt>
            <dd className={IS_MOCK ? 'font-bold text-draw' : 'font-bold text-win'}>{IS_MOCK ? `ДЕМО (SSTATS_MOCK=${process.env.SSTATS_MOCK})` : 'SStats API'}</dd>
            <dt className="text-dim">Запросов за минуту</dt>
            <dd className="num">
              {lim.inWindow} / {lim.limit} (в очереди {lim.queued})
            </dd>
            <dt className="text-dim">Записей в кэше</dt>
            <dd className="num">{cache.size()}</dd>
            <dt className="text-dim">Прогрев</dt>
            <dd className="num">
              {warmerState.started ? (warmerState.lastRun ? `${formatTime(warmerState.lastRun)}, ${Math.round(warmerState.lastDuration / 1000)} с` : 'идёт первый') : 'выключен'}
            </dd>
            <dt className="text-dim">Разобрано матчей</dt>
            <dd className="num">
              {warmerState.analyzed} (ошибок {warmerState.errors}, в очереди {warmerState.queue.size})
            </dd>
          </dl>
        </Section>
        <Section title="Партнёры">
          <ul className="space-y-2 text-sm">
            {PARTNERS.map((p) => (
              <li key={p.slug} className="rounded-lg bg-panel-2 px-3 py-2">
                <div className="flex justify-between gap-2">
                  <span className="font-bold">{p.name}</span>
                  <span className="text-xs">
                    <span className={p.configured ? 'text-win' : 'text-loss'}>{p.configured ? 'реф-ссылка ✓' : 'нет реф-ссылки'}</span>
                    {' · '}
                    <span className={p.ad.erid ? 'text-win' : 'text-loss'}>{p.ad.erid ? 'erid ✓' : 'нет erid'}</span>
                  </span>
                </div>
                <div className="mt-0.5 truncate text-[11px] text-mute">{resolveAffiliateUrl(p, 'pick', '123')}</div>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <Section
        title={`Переходы к букмекерам: ${agg.total}`}
        aside={
          <span className="flex gap-2">
            {[1, 7, 30].map((d) => (
              <a key={d} href={q(d)} className={d === days ? 'font-bold text-acid' : 'hover:text-fg'}>
                {d === 1 ? 'сутки' : `${d} дн.`}
              </a>
            ))}
          </span>
        }
      >
        <div className="grid gap-6 md:grid-cols-3">
          <Table rows={agg.byPartner} head={['Букмекер', 'Клики']} />
          <Table rows={agg.byPlacement} head={['Место на сайте', 'Клики']} />
          <Table rows={agg.byDay.map(([d, n]) => [formatDateShort(Date.parse(`${d}T12:00:00Z`)), n])} head={['День', 'Клики']} />
          <Table rows={agg.byMatch} head={['ID матча', 'Клики']} />
          <Table rows={agg.byDevice} head={['Устройство', 'Клики']} />
          <Table rows={agg.byCountry} head={['Страна', 'Клики']} />
        </div>
      </Section>
    </div>
  )
}
