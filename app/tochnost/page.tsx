import type { Metadata } from 'next'
import Link from 'next/link'
import { cache } from 'react'
import { ChanceChart } from '@/components/ChanceChart'
import { Hint } from '@/components/match/Hint'
import { PageHead } from '@/components/PageHead'
import { Section } from '@/components/Section'
import { TRACK_DAYS, getTrackRecord } from '@/lib/data'
import { formatDayMonth, pct, pluralN } from '@/lib/format'
import { NOINDEX } from '@/lib/seo'
import { IS_MOCK } from '@/lib/sstats/client'
import type { MarketScore, Miss } from '@/lib/track-record'

// архив пополняется каждый день — на каждый запрос
export const dynamic = 'force-dynamic'

const load = cache(getTrackRecord)
/** Меньше сверенных матчей — страница не для поисковиков: цифры по горстке матчей ничего не говорят. */
const INDEX_FROM = 100

export async function generateMetadata(): Promise<Metadata> {
  const t = await load()
  return {
    title: 'История точности: как сбываются оценки tag.bet',
    description:
      'Все оценки tag.bet записываем до начала матча и сверяем с итогом: сколько сбылось, оценка Брайера в сравнении с линией букмекеров, «давали — сбылось» и самые неожиданные итоги.',
    alternates: { canonical: '/tochnost' },
    ...(t.settled < INDEX_FROM ? { robots: NOINDEX } : {}),
  }
}

const P = 'text-[15px] leading-relaxed text-fg/85'
const dec = (x: number) => x.toFixed(3).replace('.', ',')
const matches = (n: number) => pluralN(n, ['матч', 'матча', 'матчей'])

const BRIER_HINT =
  'Средний квадрат ошибки: сбывшемуся исходу «должны» были дать 100%, остальным — 0%. Чем меньше, тем точнее. Для сравнения — та же оценка у линии букмекеров без маржи и «наугад», когда всем исходам дают поровну.'

/**
 * «История точности» (владелец, из переписки с ChatGPT: «показывать реальные результаты предыдущих прогнозов, включая
 * ошибки») — архив оценок tag.bet: пишем до начала матча (`recordForecast` в `lib/forecast-log.ts`), сверяем с итогом
 * основного времени, считаем `trackRecord` (`lib/track-record.ts`). Без отбора: все сверенные матчи за `TRACK_DAYS` дней.
 * «Проверка шансов» на `/about` — другое: там шансы по кэфам из списка матчей, здесь — наша записанная оценка.
 */
export default async function TrackPage() {
  const t = await load()
  return (
    <>
      <span hidden className="bare-sub" />
      <div className="space-y-4 xl:space-y-2 [&_.card_p]:max-w-[72ch]">
        <PageHead
          title="История точности"
          sub={
            <>
              Каждую оценку tag.bet записываем до начала матча и больше не меняем, а после матча сверяем с итогом основного времени.
              Здесь — все сверенные матчи за {TRACK_DAYS} дней, без отбора: и попадания, и промахи.
              {IS_MOCK ? ' Демо: архив собран из сыгранных матчей демо по кэфам, а не из записанных оценок.' : ''}
            </>
          }
        />
        {t.settled === 0 ? (
          <Section plain title="Архив копится">
            <p className={P}>
              Сверенных матчей пока нет.
              {t.pending ? ` Записано оценок, которые ждут итога: ${t.pending}.` : ''} Первые итоги появятся здесь после ближайших сыгранных
              матчей.
            </p>
          </Section>
        ) : (
          <>
            <Section plain title="Сколько сбылось">
              <p className={P}>
                Сверено {matches(t.settled)}
                {t.from && t.to ? ` — с ${formatDayMonth(t.from)} по ${formatDayMonth(t.to)}` : ''}
                {t.pending ? `, ещё ${t.pending} ${t.pending % 10 === 1 && t.pending % 100 !== 11 ? 'ждёт' : 'ждут'} итога` : ''}.
              </p>
              <div className="relative mt-4">
                <div className="mb-1 flex items-center text-[13px] text-mute">
                  Оценка Брайера — меньше значит точнее
                  <Hint title="Оценка Брайера" text={BRIER_HINT} />
                </div>
                <ul className="divide-y divide-white/[0.06]">
                  {t.x12 ? <Market name="Исход матча" what="исход, которому давали больше всего" s={t.x12} /> : null}
                  {t.over25 ? <Market name="3 гола и больше" what="то, чему давали больше 50%" s={t.over25} /> : null}
                  {t.btts ? <Market name="Обе забьют" what="то, чему давали больше 50%" s={t.btts} /> : null}
                </ul>
              </div>
            </Section>
            <Section plain title="Давали — сбылось">
              <p className={P}>
                Исходы матчей разложены по группам «около 10%», «около 20%»… «около 90%»: черта — какой шанс давали, столбик — сколько
                сбылось. Если оценки честные, столбики упираются в черты. Шанс — не обещание: из исходов с шансом 60% примерно четыре из
                десяти не сбываются —{' '}
                <Link href="/veroyatnost" className="underline">
                  почему даже 90% иногда не сбываются
                </Link>
                .
              </p>
              {t.bins.length >= 3 ? (
                <ChanceChart bins={t.bins} className="mt-6 h-[240px]" />
              ) : (
                <p className="mt-3 text-[14px] text-dim">График появится, когда в группах наберётся хотя бы по 15 исходов.</p>
              )}
            </Section>
            <Section plain title="Неожиданные итоги недели">
              <p className={P}>Матчи топ-турниров, где сбылось то, чему мы давали меньше 25%.</p>
              {t.misses.length ? (
                <ul className="-mx-4 mt-3 divide-y divide-white/[0.06] sm:-mx-5">
                  {t.misses.map((m) => (
                    <MissRow key={m.f.id} m={m} />
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-[14px] text-dim">За неделю таких итогов не было.</p>
              )}
            </Section>
          </>
        )}
        <p className="px-4 text-[13px] text-mute sm:px-5">
          Как считаем оценку — <Link href="/about" className="underline">«Как мы считаем»</Link>. Оценки не гарантируют результат и не
          являются призывом делать ставки · 18+
        </p>
      </div>
    </>
  )
}

function Market({ name, what, s }: { name: string; what: string; s: MarketScore }) {
  const cell = (label: string, v: number | null, main = false) => (
    <div className="w-[4.5rem] text-right">
      <div className="text-[12px] text-mute">{label}</div>
      <div className={`text-[16px] tabular-nums ${main ? 'font-semibold text-fg' : 'text-dim'}`}>{v == null ? '—' : dec(v)}</div>
    </div>
  )
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
      <div className="min-w-0 flex-1 basis-56">
        <div className="text-[16px] font-semibold">{name}</div>
        <div className="text-[13px] text-dim">
          {matches(s.n)} · сбылось {what} — в {pct(s.top)}
        </div>
      </div>
      <div className="flex gap-2">
        {cell('tag.bet', s.ours, true)}
        {cell('Линия', s.line)}
        {cell('Наугад', s.even)}
      </div>
    </li>
  )
}

const WON = { home: (m: Miss) => `победа «${m.f.home}»`, draw: () => 'ничья', away: (m: Miss) => `победа «${m.f.away}»` }

function MissRow({ m }: { m: Miss }) {
  const r = m.f.res!
  return (
    <li>
      <Link href={m.f.href} className="block px-4 py-3 transition-colors hover:bg-white/[0.03] sm:px-5">
        <div className="text-[15px] font-medium">
          {m.f.home} <span className="tabular-nums">{r.home}:{r.away}</span> {m.f.away}
        </div>
        <div className="text-[13px] text-dim">
          {m.f.league} · {formatDayMonth(m.f.ts)} · {WON[m.won](m)} — давали {pct(m.p)}
        </div>
      </Link>
    </li>
  )
}
