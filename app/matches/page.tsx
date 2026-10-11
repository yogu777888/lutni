import type { Metadata } from 'next'
import { DayView } from '@/components/DayView'
import { todayYmd } from '@/lib/format'
import { parseListFilter } from '@/lib/list-filter'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Все матчи сегодня: расписание, счёт и коэффициенты',
  description: 'Все футбольные матчи сегодня по турнирам и по времени: счёт в игре, коэффициенты букмекеров, шансы и теги ставок.',
  alternates: { canonical: '/matches' },
}

/** Страница «Матчи» — полный список матчей сегодня (главная — витрина дня: табло, подборки, полки). */
export default async function MatchesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams
  const sort = q.sort
  const today = todayYmd()
  return <DayView ymd={today} today={today} view="list" sort={sort === 'time' ? 'time' : 'league'} filter={parseListFilter(q)} />
}
