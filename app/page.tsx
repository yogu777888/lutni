import type { Metadata } from 'next'
import { DayView, dayTitle } from '@/components/DayView'
import { todayYmd } from '@/lib/format'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const today = todayYmd()
  return {
    title: { absolute: `${dayTitle(today, today)}: коэффициенты, теги и прогнозы | tag.bet` },
    description:
      'Матчи сегодня с коэффициентами букмекеров и тегами ставок: value, прогрузы, тоталы, «обе забьют». Вероятности без маржи, форма команд и прогнозы tag.bet.',
    alternates: { canonical: '/' },
  }
}

export default async function Home({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const today = todayYmd()
  const { sort } = await searchParams
  return <DayView ymd={today} today={today} sort={sort === 'time' ? 'time' : 'league'} />
}
