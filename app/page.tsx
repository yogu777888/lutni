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

export default function Home() {
  const today = todayYmd()
  return <DayView ymd={today} today={today} />
}
